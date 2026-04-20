"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
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
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loginWithGoogle: async () => {},
  logout: async () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
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
        currentUser.getIdToken().then(token => {
           fetch('/api/auth/session', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ token, uid: currentUser.uid, email: currentUser.email })
           }).catch(console.error);
        });

        setIsLoading(false);
        return () => unsubProfile();
      } else {
        setProfile(null);
        setIsLoading(false);
        fetch('/api/auth/session', { method: 'DELETE' }).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
