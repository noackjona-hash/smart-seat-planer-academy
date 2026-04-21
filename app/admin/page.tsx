"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { collection, addDoc, onSnapshot, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [codes, setCodes] = useState<any[]>([]);
  const [newCodeType, setNewCodeType] = useState('STARTER');
  const [newCodeValue, setNewCodeValue] = useState('');
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    
    // Check if user is owner or admin
    if (user.email === 'jona.noack@outlook.de') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsAdmin(true);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
        return;
    }

    // Try to read admins collection to see if they are admin
    const checkAdmin = async () => {
        try {
            const snap = await getDocs(collection(db, "admins"));
            const adminList = snap.docs.map(doc => doc.id); // Assuming document id is email
            if (user.email && adminList.includes(user.email)) {
                setIsAdmin(true);
            }
        } catch (e) {
            console.error("Not an admin or permission denied", e);
        }
        setLoading(false);
    }
    checkAdmin();

  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    
    const unsubCodes = onSnapshot(collection(db, "licenseKeys"), (snap) => {
        setCodes(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (error) => {
        console.error("Error fetching codes:", error);
    });

    const unsubAdmins = onSnapshot(collection(db, "admins"), (snap) => {
        setAdmins(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (error) => {
        console.error("Error fetching admins:", error);
    });

    return () => {
        unsubCodes();
        unsubAdmins();
    };
  }, [isAdmin]);

  if (loading) return <div className="p-8 text-center text-slate-500">Lade...</div>;

  if (!isAdmin) {
    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Zugriff verweigert</h1>
            <p className="text-slate-600 mb-4">Sie haben keine Berechtigung, diese Seite anzuzeigen.</p>
            <Link href="/dashboard" className="text-blue-600 hover:underline">Zurück zum Dashboard</Link>
        </div>
    );
  }

  const handleCreateCode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCodeValue.trim()) return;
      try {
          await addDoc(collection(db, "licenseKeys"), {
              key: newCodeValue.trim(),
              type: newCodeType, // e.g. STARTER, BASIC, ULTRA
              createdAt: new Date().toISOString(),
              isUsed: false
          });
          setNewCodeValue('');
      } catch (e) {
          alert("Fehler beim Erstellen des Codes.");
      }
  };

  const handleDeleteCode = async (id: string) => {
      try {
          await deleteDoc(doc(db, "licenseKeys", id));
      } catch (e) {
          alert("Fehler beim Löschen des Codes.");
      }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdminEmail.trim() || user?.email !== 'jona.noack@outlook.de') return;
      try {
          // Store email as document ID
          await setDoc(doc(db, "admins", newAdminEmail.trim()), {
              addedBy: user?.email,
              addedAt: new Date().toISOString()
          });
          setNewAdminEmail('');
      } catch (e) {
          alert("Fehler beim Hinzufügen des Admins.");
      }
  };

  const handleRemoveAdmin = async (email: string) => {
      if (user?.email !== 'jona.noack@outlook.de') {
          alert("Nur der Owner kann Admins entfernen.");
          return;
      }
      try {
          await deleteDoc(doc(db, "admins", email));
      } catch (e) {
          alert("Fehler beim Entfernen des Admins.");
      }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LIZENZ CODES */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Lizenz-Codes verwalten</h2>
                <form onSubmit={handleCreateCode} className="flex gap-2 mb-6">
                    <select 
                        value={newCodeType}
                        onChange={(e) => setNewCodeType(e.target.value)}
                        className="border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                    >
                        <option value="STARTER">Starter</option>
                        <option value="BASIC">Basic</option>
                        <option value="ULTRA">Ultra</option>
                    </select>
                    <input 
                        type="text" 
                        placeholder="Code-Wort..." 
                        value={newCodeValue}
                        onChange={e => setNewCodeValue(e.target.value)}
                        className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                        required
                    />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 transition">
                        Erstellen
                    </button>
                </form>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {codes.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 border border-slate-100 rounded bg-slate-50">
                            <div>
                                <span className="font-mono font-bold text-slate-800 mr-2">{c.key}</span>
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">{c.type}</span>
                                {c.isUsed && <span className="text-xs text-red-500 ml-2">Benutzt</span>}
                            </div>
                            <button onClick={() => handleDeleteCode(c.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Löschen</button>
                        </div>
                    ))}
                    {codes.length === 0 && <p className="text-slate-400 text-sm">Keine Codes vorhanden.</p>}
                </div>
            </div>

            {/* ADMINS */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-1">Admins verwalten</h2>
                <p className="text-xs text-slate-500 mb-4">Nur der Owner (jona.noack@outlook.de) kann Rechte vergeben.</p>
                
                {user?.email === 'jona.noack@outlook.de' ? (
                    <form onSubmit={handleAddAdmin} className="flex gap-2 mb-6">
                        <input 
                            type="email" 
                            placeholder="Admin E-Mail..." 
                            value={newAdminEmail}
                            onChange={e => setNewAdminEmail(e.target.value)}
                            className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                            required
                        />
                        <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-900 transition">
                            Hinzufügen
                        </button>
                    </form>
                ) : (
                    <div className="mb-6 text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                        Du bist Admin, aber nicht der Owner.
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded bg-indigo-50">
                        <span className="font-semibold text-indigo-900">jona.noack@outlook.de</span>
                        <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded uppercase font-bold">Owner</span>
                    </div>
                    {admins.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-3 border border-slate-100 rounded bg-slate-50">
                            <span className="text-slate-800">{a.id}</span>
                            {user?.email === 'jona.noack@outlook.de' && (
                                <button onClick={() => handleRemoveAdmin(a.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">X</button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div className="mt-8 text-center">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-800 text-sm underline">Zurück zum Dashboard</Link>
        </div>
    </div>
  );
}
