"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";
import Link from "next/link";
import { Users, Plus, Trash2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { OperationType, handleFirestoreError } from "@/lib/firestoreError";

interface ClassType {
  id: string;
  name: string;
  teacherId: string;
  description: string;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [navigatingClassId, setNavigatingClassId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "classes"), where("teacherId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData: ClassType[] = [];
      snapshot.forEach((doc) => classData.push({ id: doc.id, ...doc.data() } as ClassType));
      setClasses(classData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "classes");
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !user) return;
    
    // FREE Tier Limit
    if (profile?.licenseType === "FREE" && classes.length >= 1) {
      alert("Mit der FREE-Version kannst du maximal 1 Klasse anlegen. Bitte upgrade deine Lizenz.");
      router.push("/dashboard/upgrade");
      return;
    }

    try {
      await addDoc(collection(db, "classes"), {
        name: newClassName.trim(),
        teacherId: user.uid,
        description: "",
      });
      setNewClassName("");
      setIsAdding(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "classes");
    }
  };

  const deleteClass = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(confirm("Bist du sicher, dass du diese Klasse löschen möchtest?")) {
      try {
        await deleteDoc(doc(db, "classes", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `classes/${id}`);
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meine Klassen</h1>
          <p className="text-slate-500 mt-1 text-sm">Verwalte deine Schüler und erstelle Sitzpläne.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-md font-semibold text-sm flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Klasse anlegen
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddClass} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-end gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs uppercase tracking-wider font-semibold text-slate-500">Name der Klasse</label>
            <input 
              autoFocus
              type="text" 
              placeholder="z.B. 10a Biologie"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-4 py-2 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-md">
            Abbrechen
          </button>
          <button type="submit" disabled={!newClassName.trim()} className="bg-blue-500 text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-blue-600 disabled:opacity-50">
            Speichern
          </button>
        </form>
      )}

      {classes.length === 0 && !isAdding ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Noch keine Klassen</h3>
          <p className="text-slate-500 max-w-sm mb-6 text-sm">Lege deine erste Klasse an, um Schüler hinzuzufügen und Sitzpläne generieren zu lassen.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="text-blue-600 font-semibold text-sm hover:bg-blue-50 px-4 py-2 rounded-md transition"
          >
            Erste Klasse anlegen
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(c => (
            <div 
              key={c.id} 
              onClick={() => {
                setNavigatingClassId(c.id);
                router.push(`/dashboard/classes/${c.id}`);
              }}
              className="group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition block relative cursor-pointer"
            >
              <button 
                onClick={(e) => deleteClass(c.id, e)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{c.name}</h3>
              <p className="text-slate-500 text-xs mb-6 font-medium">Sitzpläne & Schüler verwalten</p>
              
              <div className="flex items-center text-blue-600 text-sm font-semibold group-hover:gap-2 transition-all">
                {navigatingClassId === c.id ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    Wird geladen...
                  </div>
                ) : (
                  <>Öffnen <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
