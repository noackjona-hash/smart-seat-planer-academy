"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase";

import { OperationType, handleFirestoreError } from "@/lib/firestoreError";

export type LicenseType = "FREE" | "STARTER" | "BASIC" | "PRO" | "ULTRA";

export interface UserProfile {
  email: string;
  name: string;
  licenseType: LicenseType;
  licenseKey?: string;
  coachingAvailable?: number;
  originalPricePaid?: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  isLoading: true,
  authError: null,
  clearAuthError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Load or create user profile
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            email: currentUser.email || "",
            name: currentUser.displayName || "",
            licenseType: "FREE",
            originalPricePaid: 0,
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(userSnap.data() as UserProfile);
        }
        
        // Listen for real-time license updates
        const unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });
        
        // Synchronize with our custom JWT cookie session for middleware protection
        try {
          const token = await currentUser.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, uid: currentUser.uid, email: currentUser.email })
          });
        } catch (error) {
          console.error("Session sync failed:", error);
        }

        // Only set user after session cookie is confirmed
        setUser(currentUser);
        setIsLoading(false);
        return () => unsubProfile();
      } else {
        setProfile(null);
        setUser(null);
        setIsLoading(false);
        fetch('/api/auth/session', { method: 'DELETE' }).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, []);

  const ObjectMappedErrors: Record<string, string> = {
    'auth/email-already-in-use': 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.',
    'auth/invalid-credential': 'Die E-Mail oder das Passwort ist falsch.',
    'auth/user-not-found': 'Es existiert kein Benutzerkonto mit dieser E-Mail-Adresse.',
    'auth/wrong-password': 'Das eingegebene Passwort ist falsch.',
    'auth/weak-password': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
    'auth/invalid-email': 'Diese E-Mail-Adresse ist ungültig.',
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error?.code === 'auth/popup-blocked') {
        setAuthError('popup-blocked');
      } else {
        setAuthError(error?.message || 'Ein unbekannter Fehler ist aufgetreten.');
      }
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Email login failed:", error);
      setAuthError(ObjectMappedErrors[error?.code] || error?.message || 'Anmeldung fehlgeschlagen.');
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      
      const userRef = doc(db, "users", userCredential.user.uid);
      const newProfile: UserProfile = {
        email: email,
        name: name,
        licenseType: "FREE",
        originalPricePaid: 0,
      };
      await setDoc(userRef, newProfile);
      setProfile(newProfile);
    } catch (error: any) {
      console.error("Email registration failed:", error);
      setAuthError(ObjectMappedErrors[error?.code] || error?.message || 'Registrierung fehlgeschlagen.');
      throw error;
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loginWithGoogle, loginWithEmail, registerWithEmail, logout, isLoading, authError, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};
