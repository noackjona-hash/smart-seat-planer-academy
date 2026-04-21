"use client";

import { useEffect, useState, use, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { collection, query, where, addDoc, onSnapshot, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { Student, generateSeatingPlan, Seat } from "@/lib/seatingAlgorithm";
import { exportToPDF } from "@/lib/pdfExport";
import { Plus, Trash2, Camera, Download, LayoutTemplate, Settings2, ShieldAlert, Users, Edit, Star, Check, X, Smartphone, BrainCircuit, Network } from "lucide-react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, TouchSensor, DragEndEvent, useDroppable, useDraggable, useDndContext } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { generateAISeatingPlan } from "@/lib/aiSeating";

function DroppableSlot({ row, col, children, onClick }: { row: number, col: number, children: React.ReactNode, onClick?: () => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${row}-${col}`,
  });
  const { active } = useDndContext();
  const isDragging = active !== null;
  return (
    <div ref={setNodeRef} onClick={onClick} className={`relative z-10 aspect-video rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center gap-1 text-center transition-all ${isOver ? 'ring-2 ring-blue-500 bg-blue-100 border-solid border-blue-500 scale-105 shadow-md' : isDragging ? 'bg-white border text-transparent border-blue-200 border-dashed shadow-inner' : 'bg-slate-50 border border-slate-200 border-dashed cursor-pointer hover:border-slate-300'}`}>
      {children}
    </div>
  );
}

function DraggableStudent({ student, tagClass, tagLabel }: { student: Student, tagClass: string, tagLabel: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
  });
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 999,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`absolute inset-1 flex flex-col items-center justify-center rounded shadow-sm touch-none cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-90 ring-2 ring-blue-500 scale-105 shadow-xl' : ''} ${student.behavioralIssues ? 'bg-slate-100 border-2 border-red-500' : 'bg-slate-100 border border-slate-200'}`}
    >
      <span className="font-semibold text-[0.6rem] sm:text-xs text-slate-900 leading-tight truncate px-1 w-full">{student.name}</span>
      <span className={`pdf-exclude text-[0.5rem] sm:text-[0.6rem] px-1 py-0.5 rounded-full font-medium truncate max-w-[90%] ${tagClass}`}>{tagLabel}</span>
    </div>
  )
}

import { OperationType, handleFirestoreError } from "@/lib/firestoreError";

export default function ClassDetails({ params }: { params: Promise<{ classId: string }> }) {
  const resolvedParams = use(params);
  const classId = resolvedParams.classId;
  const { user, profile } = useAuth();
  const [serverStudents, setServerStudents] = useState<Student[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const pendingUpdatesRef = useRef<Record<string, { seatRow: number | null, seatCol: number | null }>>({});
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasGrid, setHasGrid] = useState(false);
  const [filterPerf, setFilterPerf] = useState<'all' | 1 | 2 | 3>('all');
  
  // Grid config
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(6);

  // New Student Form
  const [name, setName] = useState("");
  const [perf, setPerf] = useState(2);
  const [bhv, setBhv] = useState(false);
  const router = useRouter();

  // Edit Student
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Feedback
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [mobileTab, setMobileTab] = useState<'LIST' | 'GRID'>('LIST');
  const [tapSelectedStudentId, setTapSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "students"), where("classId", "==", classId), where("teacherId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const studs: Student[] = [];
      snap.forEach((d) => studs.push({ id: d.id, ...d.data() } as Student));
      setServerStudents(studs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "students");
    });
    return () => unsub();
  }, [user, classId]);

  useEffect(() => {
    // Optimistic UI Merge
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      setStudents(serverStudents.map(s => {
        if (pendingUpdatesRef.current[s.id]) {
          return { ...s, ...pendingUpdatesRef.current[s.id] };
        }
        return s;
      }));
    } else {
      setStudents(serverStudents);
    }
    // Check if any student has a seat
    if (serverStudents.some(s => s.seatRow !== null && s.seatRow !== undefined)) {
        setHasGrid(true);
    }
  }, [serverStudents]);

  const queueStudentUpdate = useCallback((id: string, updates: { seatRow: number | null, seatCol: number | null }) => {
    pendingUpdatesRef.current[id] = { ...(pendingUpdatesRef.current[id] || {}), ...updates };
    
    // Update local UI immediately
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    setHasGrid(true);

    setIsSaving(true);
    if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
    debouncedSaveRef.current = setTimeout(async () => {
      const batch = writeBatch(db);
      const ids = Object.keys(pendingUpdatesRef.current);
      if (ids.length === 0) {
        setIsSaving(false);
        return;
      }
      
      ids.forEach(studentId => {
         const studentRef = doc(db, "students", studentId);
         batch.update(studentRef, pendingUpdatesRef.current[studentId]);
      });
      
      pendingUpdatesRef.current = {}; 
      
      try {
        await batch.commit();
      } catch(err) {
        handleFirestoreError(err, OperationType.UPDATE, "students_batch");
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    try {
      await addDoc(collection(db, "students"), {
        classId,
        teacherId: user.uid,
        name: name.trim(),
        performance: perf,
        behavioralIssues: bhv,
        avoidNeighbors: [],
        wishNeighbors: []
      });
      setName("");
      setPerf(2);
      setBhv(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "students");
    }
  };

  const removeStudent = async (id: string) => {
    if(confirm("Student entfernen?")) {
      try {
        await deleteDoc(doc(db, "students", id));
      } catch(err) {
        handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  const handleGenerate = () => {
    const updatedStudentsList = generateSeatingPlan(students, rows, cols);
    // Queue all changes
    updatedStudentsList.forEach(s => {
       const original = students.find(orig => orig.id === s.id);
       if (!original || original.seatRow !== s.seatRow || original.seatCol !== s.seatCol) {
          queueStudentUpdate(s.id, { seatRow: s.seatRow ?? null, seatCol: s.seatCol ?? null });
       }
    });

    setFeedbackSuccess(false);
    setRating(0);
    setFeedbackComment("");
  };

  const handleGenerateAI = async () => {
    if (profile?.licenseType !== "ULTRA") {
      alert("KI-Algorithmus ist ein ULTRA Feature! Kontaktiere deinen Administrator.");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const updatedStudentsList = await generateAISeatingPlan(students, rows, cols);
      updatedStudentsList.forEach(s => {
         const original = students.find(orig => orig.id === s.id);
         if (!original || original.seatRow !== s.seatRow || original.seatCol !== s.seatCol) {
            queueStudentUpdate(s.id, { seatRow: s.seatRow ?? null, seatCol: s.seatCol ?? null });
         }
      });
      setFeedbackSuccess(false);
      setRating(0);
      setFeedbackComment("");
    } catch (error) {
      alert("Fehler bei der KI-Generierung. Bitte versuche es erneut.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !user) return;
    try {
      if (editingStudent.id === "new") {
         await addDoc(collection(db, "students"), {
           classId,
           teacherId: user.uid,
           name: editingStudent.name,
           performance: editingStudent.performance,
           behavioralIssues: editingStudent.behavioralIssues,
           learningType: editingStudent.learningType || "visual",
           specialNeeds: editingStudent.specialNeeds || "",
           wishNeighbors: editingStudent.wishNeighbors || [],
           avoidNeighbors: editingStudent.avoidNeighbors || []
         });
      } else {
         await updateDoc(doc(db, "students", editingStudent.id), {
           name: editingStudent.name,
           performance: editingStudent.performance,
           behavioralIssues: editingStudent.behavioralIssues,
           learningType: editingStudent.learningType || "visual",
           specialNeeds: editingStudent.specialNeeds || "",
           wishNeighbors: editingStudent.wishNeighbors || [],
           avoidNeighbors: editingStudent.avoidNeighbors || []
         });
      }
      setEditingStudent(null);
    } catch (err) {
      handleFirestoreError(err, editingStudent.id === "new" ? OperationType.CREATE : OperationType.UPDATE, `students/${editingStudent.id}`);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || rating === 0) return;
    setIsFeedbackSubmitting(true);
    try {
      await addDoc(collection(db, `classes/${classId}/feedback`), {
        classId,
        teacherId: user.uid,
        rating,
        comment: feedbackComment,
        createdAt: new Date().toISOString()
      });
      setFeedbackSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `classes/${classId}/feedback`);
    }
    setIsFeedbackSubmitting(false);
  };

  const handleExport = () => {
    if (profile?.licenseType === "FREE" || profile?.licenseType === "STARTER") {
      alert("PDF Export benötigt mindestens die BASIC Lizenz. Bitte upgraden.");
      router.push("/dashboard/upgrade");
      return;
    }
    exportToPDF("seating-chart", `Sitzplan_${classId}`);
  };

  const [isSociogramModalOpen, setIsSociogramModalOpen] = useState(false);
  const [isAnalyzingSociogram, setIsAnalyzingSociogram] = useState(false);

  // Dynamic Sociogram Data
  const sociogramAnalysis = useMemo(() => {
    const seated = students.filter(s => 
      s.seatRow !== null && s.seatCol !== null && 
      s.seatRow !== undefined && s.seatCol !== undefined && 
      s.seatRow < rows && s.seatCol < cols
    );
    if (seated.length === 0) return null;

    const disrupters = seated.filter(s => s.behavioralIssues);
    const strong = seated.filter(s => s.performance === 3);
    const weak = seated.filter(s => s.performance === 1);

    return {
      groupDynamics: disrupters.length > 0 
        ? "Mischung aus unterschiedlichen Dynamiken. Fokus-Schüler sind im Raum präsent." 
        : "Die Gruppendynamik wirkt harmonisch und fokussiert.",
      conflict: disrupters.length > 0 
        ? `Reihe ${disrupters[0].seatRow! + 1} erfordert erhöhte Aufmerksamkeit durch ${disrupters[0].name}.`
        : "Keine offensichtlichen Unruheherde in der aktuellen Konstellation.",
      tip: strong.length > 0 
        ? `Setze ${strong[0].name} gezielt zur Unterstützung schwächerer Mitschüler in der Nähe ein.`
        : "Versuche, leistungsstarke Schüler als Ankerpunkte im Raum zu verteilen."
    };
  }, [students, rows, cols]);

  useEffect(() => {
    // Unseat students that are outside the current grid boundaries
    const cutOffStudents = students.filter(s => 
      s.seatRow !== null && s.seatCol !== null && 
      s.seatRow !== undefined && s.seatCol !== undefined &&
      (s.seatRow >= rows || s.seatCol >= cols)
    );
    
    if (cutOffStudents.length > 0) {
      cutOffStudents.forEach(s => {
        queueStudentUpdate(s.id, { seatRow: null, seatCol: null });
      });
    }
  }, [rows, cols, students, queueStudentUpdate]);

  const handleSociogram = () => {
    if (profile?.licenseType !== "ULTRA") {
      alert("KI-Soziogramm Analyse ist ein ULTRA Feature! Kontaktiere deinen Administrator.");
      return;
    }
    setIsSociogramModalOpen(true);
    setIsAnalyzingSociogram(true);
    setTimeout(() => {
        setIsAnalyzingSociogram(false);
    }, 3000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 }})
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const targetSlotId = over.id as string; // 'slot-row-col'

    const parts = targetSlotId.split('-');
    const tRow = parseInt(parts[1]);
    const tCol = parseInt(parts[2]);

    const activeStudent = students.find(s => s.id === activeId);
    if (!activeStudent) return;

    // Is there already someone there?
    const occupant = students.find(s => s.seatRow === tRow && s.seatCol === tCol);

    if (occupant && occupant.id !== activeId) {
      // Swap positions
      queueStudentUpdate(occupant.id, { seatRow: activeStudent.seatRow ?? null, seatCol: activeStudent.seatCol ?? null });
      queueStudentUpdate(activeId, { seatRow: tRow, seatCol: tCol });
    } else {
      // Just move to empty slot
      queueStudentUpdate(activeId, { seatRow: tRow, seatCol: tCol });
    }
  };

  const handleTapStudent = (id: string) => {
    if(tapSelectedStudentId === id) setTapSelectedStudentId(null);
    else {
      setTapSelectedStudentId(id);
      setMobileTab('GRID');
    }
  };

  const handleTapSlot = (r: number, c: number) => {
    if (!tapSelectedStudentId) {
      const occupant = students.find(s => s.seatRow === r && s.seatCol === c);
      if (occupant) {
        setTapSelectedStudentId(occupant.id);
      }
      return;
    }

    const tRow = r;
    const tCol = c;
    const activeId = tapSelectedStudentId;
    const activeStudent = students.find(s => s.id === activeId);
    if (!activeStudent) return;
    
    const occupant = students.find(s => s.seatRow === tRow && s.seatCol === tCol);
    if (occupant && occupant.id !== activeId) {
      queueStudentUpdate(occupant.id, { seatRow: activeStudent.seatRow ?? null, seatCol: activeStudent.seatCol ?? null });
    }
    queueStudentUpdate(activeId, { seatRow: tRow, seatCol: tCol });
    setTapSelectedStudentId(null);
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6 min-h-screen lg:h-[calc(100vh-theme(spacing.16))] h-full p-4 lg:p-8 bg-slate-100 overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Sitzplan: Standard-Layout</h2>
          <p className="text-sm text-slate-500">Optimiert für Fokus & Zusammenarbeit</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={handleExport} className="min-h-[44px] flex-1 sm:flex-none justify-center bg-white border border-slate-200 text-slate-800 px-4 sm:px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-slate-50 transition shadow-sm flex items-center">
            Export PDF
          </button>
          <button onClick={handleSociogram} className="min-h-[44px] flex-1 sm:flex-none justify-center bg-indigo-500 hover:bg-indigo-600 text-white px-4 sm:px-5 py-2.5 rounded-md font-semibold text-sm flex items-center gap-2 transition shadow-sm whitespace-nowrap">
            <BrainCircuit className="w-4 h-4" /> KI-Soziogramm
          </button>
        </div>
      </div>

      <div className="lg:hidden flex border border-slate-200 rounded-md overflow-hidden bg-white mb-4 shadow-sm">
          <button 
             onClick={() => setMobileTab('LIST')} 
             className={`flex-1 py-3 text-sm font-bold text-center ${mobileTab === 'LIST' ? 'bg-slate-800 text-white' : 'text-slate-600 bg-slate-50'}`}
          >Schülerliste</button>
          <button 
             onClick={() => setMobileTab('GRID')} 
             className={`flex-1 py-3 text-sm font-bold text-center flex flex-col items-center gap-0.5 justify-center ${mobileTab === 'GRID' ? 'bg-slate-800 text-white' : 'text-slate-600 bg-slate-50'}`}
          >
             Sitzplan 
             {tapSelectedStudentId && <span className="text-[10px] bg-blue-500 text-white px-1.5 rounded-full animate-pulse">Platz wählen</span>}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 flex-1 bg-white border border-slate-200 rounded-xl shadow-sm lg:overflow-hidden min-h-0">
        
        {/* Rules/Left Panel */}
        <div className={`lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-4 lg:p-6 flex-col gap-5 h-auto lg:h-full lg:max-h-none overflow-y-auto ${mobileTab === 'LIST' ? 'flex' : 'hidden lg:flex'}`}>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center justify-between">
              Schülerliste
              <span 
                 className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded cursor-pointer transition select-none"
                 onClick={() => setEditingStudent({
                   id: 'new',
                   name: '',
                   performance: 2,
                   behavioralIssues: false,
                   avoidNeighbors: [],
                   wishNeighbors: [],
                   learningType: 'visual',
                   specialNeeds: ''
                 })}
              >
                 + Neu
              </span>
            </h3>

            <div className="mb-3">
               <select 
                  value={filterPerf}
                  onChange={(e) => setFilterPerf(e.target.value === 'all' ? 'all' : Number(e.target.value) as 1|2|3)}
                  className="w-full text-xs border border-slate-200 rounded px-2 min-h-[44px] lg:min-h-[auto] py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 bg-slate-50"
               >
                  <option value="all">Leistung: Alle</option>
                  <option value="1">Nur Schwach</option>
                  <option value="2">Nur Mittel</option>
                  <option value="3">Nur Stark</option>
               </select>
            </div>

            <div className="space-y-2 max-h-[30vh] lg:max-h-none overflow-y-auto">
              {students
                .filter(s => filterPerf === 'all' || s.performance === filterPerf)
                .map(s => (
                <div 
                  key={s.id} 
                  onClick={() => handleTapStudent(s.id)}
                  className={`p-2 border rounded-md flex items-center justify-between transition px-3 cursor-pointer ${
                    tapSelectedStudentId === s.id ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' :
                    s.seatRow !== null ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-200 hover:border-slate-300 group'
                  }`}
                >
                  <div className="flex items-center gap-3 w-full overflow-hidden">
                    <div className={`w-3 h-3 rounded flex-shrink-0 transition-colors ${s.seatRow !== null ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.3)]' : 'bg-slate-200'}`}></div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold text-xs truncate ${s.seatRow !== null ? 'text-blue-900' : 'text-slate-800'}`}>{s.name}</div>
                      <div className="text-[0.65rem] text-slate-500 mt-0.5 truncate">
                        {s.performance === 3 ? "Stark" : s.performance === 1 ? "Schwach" : "Neutral"}
                        {s.behavioralIssues && " | Stört"}
                        {s.learningType && ` | ${s.learningType}`}
                        {s.specialNeeds && ` | ⚠️`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center opacity-100 lg:opacity-0 group-hover:opacity-100 transition gap-1 ml-2">
                    <button onClick={() => setEditingStudent({...s})} className="text-slate-400 hover:text-blue-500 p-2 lg:p-1">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeStudent(s.id)} className="text-slate-400 hover:text-red-500 p-2 lg:p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto border-2 border-dashed border-indigo-500 rounded-xl p-4 bg-indigo-50 text-center cursor-pointer hover:bg-indigo-100 transition" onClick={handleSociogram}>
             <span className="text-2xl block mb-2">🧠</span>
             <strong className="text-sm text-indigo-600 block">KI-Soziogramm</strong>
             <p className="text-[0.7rem] text-slate-500 mt-1">Pädagogische Tiefenauswertung</p>
          </div>
        </div>

        {/* Right Col: Seat Planner */}
        <div className={`lg:col-span-3 bg-slate-50 p-4 lg:p-6 flex-col lg:overflow-auto h-auto lg:h-full ${mobileTab === 'GRID' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 lg:mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              {isSaving && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full animate-pulse transition">
                  <div className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                  Speichert...
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reihen</label>
                <input type="number" min={1} max={10} value={rows} onChange={e => setRows(Number(e.target.value))} className="w-14 min-h-[44px] sm:min-h-[auto] border border-slate-200 rounded px-2 py-1 text-center text-sm font-medium" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spalten</label>
                <input type="number" min={1} max={10} value={cols} onChange={e => setCols(Number(e.target.value))} className="w-14 min-h-[44px] sm:min-h-[auto] border border-slate-200 rounded px-2 py-1 text-center text-sm font-medium" />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleGenerate} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[auto] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-1.5 text-sm rounded transition shadow-sm w-full sm:w-auto">
                Sitzplan generieren
              </button>
              <button onClick={handleGenerateAI} disabled={isGeneratingAI} className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[auto] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-4 py-1.5 text-sm rounded transition shadow-sm w-full sm:w-auto flex items-center justify-center gap-2">
                {isGeneratingAI ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Star className="w-4 h-4" />
                )}
                KI Algorithmus
              </button>
            </div>
          </div>

          <div id="seating-chart" className="flex-1 overflow-x-auto overflow-y-visible bg-white border border-slate-200 rounded-xl p-4 lg:p-8 relative min-h-[300px]">
             {!hasGrid ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[200px] lg:min-h-[400px]">
                     <LayoutTemplate className="w-12 h-12 lg:w-16 lg:h-16 mb-4 text-slate-200" />
                     <p className="text-sm font-medium">Klicke auf &quot;Generieren&quot; um den Plan zu berechnen.</p>
                 </div>
             ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="w-full min-w-[500px]">
                      <div className="col-span-full mb-6 lg:mb-10 h-8 lg:h-10 bg-slate-200 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-[10px] lg:text-xs text-slate-500 uppercase tracking-wider mx-auto w-4/5 lg:w-3/5">Tafel / Pult</div>
                      <div 
                          className="grid gap-2 lg:gap-4 pb-8" 
                          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                      >
                          {/* Render standard Grid */}
                          {Array.from({ length: rows * cols }).map((_, i) => {
                              const r = Math.floor(i / cols);
                              const c = i % cols;
                              const student = students.find(s => s.seatRow === r && s.seatCol === c);
                              let tagClass = "";
                              let tagLabel = "";
                              if (student) {
                                  if (student.behavioralIssues) { tagClass = "bg-red-100 text-red-800"; tagLabel = "Fokus"; }
                                  else if (student.performance === 3) { tagClass = "bg-green-100 text-green-800"; tagLabel = "Helfer"; }
                                  else if (student.performance === 1) { tagClass = "bg-red-100 text-red-800"; tagLabel = "Schwach"; }
                                  else { tagClass = "text-slate-500"; tagLabel = "Neutral"; }
                              }
                              
                              return (
                              <DroppableSlot key={i} row={r} col={c} onClick={() => handleTapSlot(r, c)}>
                                      {student ? (
                                        <DraggableStudent student={student} tagClass={tagClass} tagLabel={tagLabel} />
                                      ) : (
                                          <span className="text-slate-300 text-[0.55rem] font-bold uppercase tracking-wider pointer-events-none">Leer</span>
                                      )}
                                  </DroppableSlot>
                              )
                          })}
                      </div>
                  </div>
                </DndContext>
             )}
          </div>
          
          {/* Feedback Section (only shown if a grid exists) */}
          {hasGrid && !feedbackSuccess && (
            <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-slate-900 font-bold mb-4">Sitzplan bewerten</h3>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star 
                        className={`w-8 h-8 ${(hoverRating || rating) >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} 
                      />
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex gap-3">
                  <input
                    type="text"
                    placeholder="Optionales Feedback (z.B. 'Anna und Ben reden zu viel')..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button 
                    onClick={handleSubmitFeedback}
                    disabled={rating === 0 || isFeedbackSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold px-4 py-2 rounded-md text-sm transition"
                  >
                    {isFeedbackSubmitting ? "Wird gesendet..." : "Bewerten"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {feedbackSuccess && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-3 text-green-700">
              <Check className="w-6 h-6" />
              <div className="font-medium text-sm">Vielen Dank für dein Feedback! Das hilft der KI, zukünftige Pläne besser zu machen.</div>
            </div>
          )}
        </div>
      </div>
      {/* Sociogram Modal */}
      {isSociogramModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <Network className="w-10 h-10 mx-auto mb-4 text-indigo-200" />
              <h2 className="text-xl font-bold">Pädagogische Analyse</h2>
              <p className="text-indigo-100 mt-1 text-sm">Das Klassenklima wird von der KI evaluiert</p>
            </div>
            <div className="p-6 sm:p-8 text-center space-y-6 bg-slate-50">
                {isAnalyzingSociogram ? (
                   <div className="flex flex-col items-center justify-center py-8">
                     <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                     <p className="font-semibold text-slate-700">Analysiere Sitzplan und Konstellationen...</p>
                   </div>
                ) : sociogramAnalysis ? (
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left">
                      <h3 className="font-bold text-slate-800 border-b pb-2 mb-3">Ergebnis der Auswertung</h3>
                      <p className="text-sm text-slate-600 mb-2">✅ <strong className="text-slate-800">Gruppendynamik:</strong> {sociogramAnalysis.groupDynamics}</p>
                      <p className="text-sm text-slate-600 mb-2">⚠️ <strong className="text-slate-800">Potenzieller Konflikt:</strong> {sociogramAnalysis.conflict}</p>
                      <p className="text-sm text-slate-600 mb-4">💡 <strong className="text-slate-800">Tipp:</strong> {sociogramAnalysis.tip}</p>
                      <div className="p-3 bg-indigo-50 text-indigo-800 text-xs rounded-lg font-medium">Diese Analyse basiert auf den hinterlegten Schülerprofilen und deren aktueller Platzierung im Raum.</div>
                   </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center py-10">
                    <p className="text-slate-400 text-sm italic">Platziere zuerst Schüler im Sitzplan, um eine Analyse zu erhalten.</p>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsSociogramModalOpen(false)}
                  className="min-h-[44px] bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-300 transition w-full"
                >
                  {isAnalyzingSociogram ? "Abbrechen" : "Schließen"}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleUpdateStudent} className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-lg">
                 {editingStudent.id === 'new' ? 'Neuen Schüler hinzufügen' : `Schüler bearbeiten: ${editingStudent.name}`}
              </h2>
              <button type="button" onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white overflow-y-auto max-h-[70vh]">
               {/* Left Col */}
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      placeholder="Name des Schülers..."
                      value={editingStudent.name} 
                      onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} 
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Leistung</label>
                    <select 
                      value={editingStudent.performance} 
                      onChange={e => setEditingStudent({...editingStudent, performance: Number(e.target.value)})} 
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value={1}>Schwach</option>
                      <option value={2}>Mittel</option>
                      <option value={3}>Stark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Lerntyp</label>
                    <select 
                      value={editingStudent.learningType || "visual"} 
                      onChange={e => setEditingStudent({...editingStudent, learningType: e.target.value as 'visual' | 'auditory' | 'kinesthetic'})} 
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value="visual">Visuell (Beobachter)</option>
                      <option value="auditory">Auditiv (Zuhörer)</option>
                      <option value="kinesthetic">Kinästhetisch (Aktiver Lerner)</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <label className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2.5 bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editingStudent.behavioralIssues} 
                        onChange={e => setEditingStudent({...editingStudent, behavioralIssues: e.target.checked})} 
                        className="rounded text-red-500 focus:ring-red-500 w-4 h-4" 
                      />
                      <span className="text-sm text-slate-700 font-medium">Stört im Unterricht</span>
                      <ShieldAlert className="w-4 h-4 text-red-500 ml-auto" />
                    </label>
                  </div>
               </div>

               {/* Right Col */}
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Spezielle Bedürfnisse</label>
                    <textarea 
                      placeholder="z.B. LRS, Sehschwäche, Rollstuhlzugang (optional)..."
                      value={editingStudent.specialNeeds || ""} 
                      onChange={e => setEditingStudent({...editingStudent, specialNeeds: e.target.value})} 
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none min-h-[80px] resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 text-green-600">Bevorzugte Nachbarn</label>
                    <div className="flex border border-slate-200 rounded-md p-1 bg-slate-50 mb-1 max-h-24 overflow-y-auto flex-wrap gap-1">
                       {students.filter(s => s.id !== editingStudent.id).map(s => {
                         const isSelected = editingStudent.wishNeighbors?.includes(s.id);
                         return (
                           <label key={s.id} className={`text-xs px-2 py-1 rounded cursor-pointer border ${isSelected ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                             <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                               const nw = e.target.checked 
                                 ? [...(editingStudent.wishNeighbors || []), s.id]
                                 : (editingStudent.wishNeighbors || []).filter(id => id !== s.id);
                               setEditingStudent({...editingStudent, wishNeighbors: nw});
                             }} />
                             {s.name}
                           </label>
                         )
                       })}
                    </div>
                  </div>

                  <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 text-red-600">Nachbarn meiden</label>
                     <div className="flex border border-slate-200 rounded-md p-1 bg-slate-50 max-h-24 overflow-y-auto flex-wrap gap-1">
                       {students.filter(s => s.id !== editingStudent.id).map(s => {
                         const isSelected = editingStudent.avoidNeighbors?.includes(s.id);
                         return (
                           <label key={s.id} className={`text-xs px-2 py-1 rounded cursor-pointer border ${isSelected ? 'bg-red-100 border-red-300 text-red-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                             <input type="checkbox" className="hidden" checked={isSelected} onChange={(e) => {
                               const nw = e.target.checked 
                                 ? [...(editingStudent.avoidNeighbors || []), s.id]
                                 : (editingStudent.avoidNeighbors || []).filter(id => id !== s.id);
                               setEditingStudent({...editingStudent, avoidNeighbors: nw});
                             }} />
                             {s.name}
                           </label>
                         )
                       })}
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-3">
               <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-50">
                 Abbrechen
               </button>
               <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700">
                 Speichern
               </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
