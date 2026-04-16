"use client";

import { useEffect, useState, use, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { collection, query, where, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Student, generateSeatingPlan, Seat } from "@/lib/seatingAlgorithm";
import { exportToPDF } from "@/lib/pdfExport";
import { Plus, Trash2, Camera, Download, LayoutTemplate, Settings2, ShieldAlert, Users, Edit, Star, Check, X, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, TouchSensor, DragEndEvent, useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function DroppableSlot({ row, col, children }: { row: number, col: number, children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${row}-${col}`,
  });
  return (
    <div ref={setNodeRef} className={`relative z-10 aspect-video rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center gap-1 text-center transition-all bg-slate-50 border border-slate-200 border-dashed ${isOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
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
      <span className={`text-[0.5rem] sm:text-[0.6rem] px-1 py-0.5 rounded-full font-medium truncate max-w-[90%] ${tagClass}`}>{tagLabel}</span>
    </div>
  )
}

import { OperationType, handleFirestoreError } from "@/lib/firestoreError";

export default function ClassDetails({ params }: { params: Promise<{ classId: string }> }) {
  const resolvedParams = use(params);
  const classId = resolvedParams.classId;
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [grid, setGrid] = useState<Seat[]>([]);
  
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

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "students"), where("classId", "==", classId), where("teacherId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const studs: Student[] = [];
      snap.forEach((d) => studs.push({ id: d.id, ...d.data() } as Student));
      setStudents(studs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "students");
    });
    return () => unsub();
  }, [user, classId]);

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
    const plan = generateSeatingPlan(students, rows, cols);
    setGrid(plan);
    setFeedbackSuccess(false);
    setRating(0);
    setFeedbackComment("");
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateDoc(doc(db, "students", editingStudent.id), {
        name: editingStudent.name,
        performance: editingStudent.performance,
        behavioralIssues: editingStudent.behavioralIssues,
        learningType: editingStudent.learningType || "visual",
        specialNeeds: editingStudent.specialNeeds || "",
        wishNeighbors: editingStudent.wishNeighbors || [],
        avoidNeighbors: editingStudent.avoidNeighbors || []
      });
      setEditingStudent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${editingStudent.id}`);
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

  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Kameras Zugriff wurde verweigert.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      // Here OCR logic could run
      alert("Foto aufgenommen! (OCR-Verarbeitung startet...)");
      stopCamera();
      setIsMagicModalOpen(false);
    }
  }

  const handleMagicImport = () => {
    if (profile?.licenseType !== "ULTRA") {
      alert("Magic Photo Import ist ein ULTRA Feature! Bitte upgraden.");
      router.push("/dashboard/upgrade");
      return;
    }
    setIsMagicModalOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 }})
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const targetSlotId = over.id as string; // 'slot-row-col'

    const newGrid = [...grid];
    const oldSeatIndex = newGrid.findIndex(s => s.studentId === activeId);
    
    const parts = targetSlotId.split('-');
    const tRow = parseInt(parts[1]);
    const tCol = parseInt(parts[2]);
    const newSeatIndex = newGrid.findIndex(s => s.row === tRow && s.col === tCol);

    if (oldSeatIndex !== -1 && newSeatIndex !== -1) {
      const temp = newGrid[oldSeatIndex].studentId;
      newGrid[oldSeatIndex].studentId = newGrid[newSeatIndex].studentId;
      newGrid[newSeatIndex].studentId = temp;
      setGrid(newGrid);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full p-4 lg:p-8 bg-slate-100 overflow-x-hidden w-full max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Sitzplan: Standard-Layout</h2>
          <p className="text-sm text-slate-500">Optimiert für Fokus & Zusammenarbeit</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button onClick={handleExport} className="min-h-[44px] flex-1 sm:flex-none justify-center bg-white border border-slate-200 text-slate-800 px-4 sm:px-5 py-2.5 rounded-md font-semibold text-sm hover:bg-slate-50 transition shadow-sm flex items-center">
            Export PDF <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 ml-1">BASIC+</span>
          </button>
          <button onClick={handleMagicImport} className="min-h-[44px] flex-1 sm:flex-none justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-5 py-2.5 rounded-md font-semibold text-sm flex items-center gap-2 transition shadow-sm whitespace-nowrap">
            <Camera className="w-4 h-4" /> Magic-Import <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">Ultra</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 items-start flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-0">
        
        {/* Rules/Left Panel */}
        <div className="lg:col-span-1 border-r border-slate-200 bg-white p-6 flex flex-col gap-5 h-full">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center justify-between">
              Schülerliste
              <span className="text-xs text-blue-500 cursor-pointer">+ Neu</span>
            </h3>

            <form onSubmit={handleAddStudent} className="grid gap-2 text-sm mb-4">
              <input 
                autoFocus
                type="text" 
                placeholder="Name..." 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-200 rounded text-slate-900 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <div className="flex gap-2">
                <select value={perf} onChange={e => setPerf(Number(e.target.value))} className="border border-slate-200 rounded px-2 py-1.5 flex-1 bg-white">
                  <option value={1}>Schwach</option>
                  <option value={2}>Mittel</option>
                  <option value={3}>Stark</option>
                </select>
                <label className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1.5 bg-slate-50 select-none cursor-pointer">
                  <input type="checkbox" checked={bhv} onChange={e => setBhv(e.target.checked)} className="rounded text-red-500 focus:ring-red-500 w-3 h-3" />
                  <span className="text-xs text-slate-600 font-medium">Stört</span>
                </label>
              </div>
              <button type="submit" disabled={!name.trim()} className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded font-semibold text-xs disabled:opacity-50 hover:bg-blue-100 transition">
                Hinzufügen
              </button>
            </form>

            <div className="space-y-2 max-h-[40vh] overflow-auto">
              {students.map(s => (
                <div key={s.id} className="p-2 border border-slate-200 rounded-md flex items-center justify-between hover:border-slate-300 group transition px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-slate-100 rounded flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-slate-800 text-xs">{s.name}</div>
                      <div className="text-[0.65rem] text-slate-500 mt-0.5">
                        {s.performance === 3 ? "Stark" : s.performance === 1 ? "Schwach" : "Neutral"}
                        {s.behavioralIssues && " | Stört"}
                        {s.learningType && ` | ${s.learningType}`}
                        {s.specialNeeds && ` | ⚠️`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition gap-1">
                    <button onClick={() => setEditingStudent({...s})} className="text-slate-300 hover:text-blue-500 p-1">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeStudent(s.id)} className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto border-2 border-dashed border-blue-500 rounded-xl p-4 bg-blue-50 text-center cursor-pointer hover:bg-blue-100 transition" onClick={handleMagicImport}>
             <span className="text-2xl block mb-2">📸</span>
             <strong className="text-sm text-blue-600 block">Magic-Photo Import</strong>
             <p className="text-[0.7rem] text-slate-500 mt-1">Wunschzettel-Foto hochladen (OCR)</p>
          </div>
        </div>

        {/* Right Col: Seat Planner */}
        <div className="lg:col-span-3 bg-slate-50 p-4 lg:p-6 flex flex-col overflow-auto h-[60vh] lg:h-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 lg:mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reihen</label>
                <input type="number" min={1} max={10} value={rows} onChange={e => setRows(Number(e.target.value))} className="w-14 min-h-[44px] sm:min-h-[auto] border border-slate-200 rounded px-2 py-1 text-center text-sm font-medium" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spalten</label>
                <input type="number" min={1} max={10} value={cols} onChange={e => setCols(Number(e.target.value))} className="w-14 min-h-[44px] sm:min-h-[auto] border border-slate-200 rounded px-2 py-1 text-center text-sm font-medium" />
              </div>
            </div>
            <button onClick={handleGenerate} className="min-h-[44px] sm:min-h-[auto] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-1.5 text-sm rounded transition shadow-sm w-full sm:w-auto">
              Sitzplan generieren
            </button>
          </div>

          <div id="seating-chart" className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl p-4 lg:p-8 relative min-h-[300px]">
             {grid.length === 0 ? (
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
                          {grid.sort((a,b) => (a.row * cols + a.col) - (b.row * cols + b.col)).map((seat, i) => {
                              const student = students.find(s => s.id === seat.studentId);
                              let tagClass = "";
                              let tagLabel = "";
                              if (student) {
                                  if (student.behavioralIssues) { tagClass = "bg-red-100 text-red-800"; tagLabel = "Fokus"; }
                                  else if (student.performance === 3) { tagClass = "bg-green-100 text-green-800"; tagLabel = "Helfer"; }
                                  else if (student.performance === 1) { tagClass = "bg-red-100 text-red-800"; tagLabel = "Schwach"; }
                                  else { tagClass = "text-slate-500"; tagLabel = "Neutral"; }
                              }
                              
                              return (
                                  <DroppableSlot key={i} row={seat.row} col={seat.col}>
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
          {grid.length > 0 && !feedbackSuccess && (
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
      {/* Magic Import Modal */}
      {isMagicModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-blue-600 p-6 text-white text-center">
              <Camera className="w-10 h-10 mx-auto mb-4 text-blue-200" />
              <h2 className="text-xl font-bold">Magic Photo Import</h2>
              <p className="text-blue-100 mt-1 text-sm">Schüler-Wünsche automatisch per Foto einlesen</p>
            </div>
            <div className="p-4 sm:p-8 text-center space-y-6 bg-slate-50">
                
                {cameraActive ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                       <button onClick={takePhoto} className="min-h-[44px] bg-white text-blue-600 px-6 py-2 rounded-full font-bold shadow-lg">Auslöser</button>
                       <button onClick={stopCamera} className="min-h-[44px] bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div onClick={startCamera} className="min-h-[120px] border-2 border-dashed border-blue-300 rounded-xl bg-white p-6 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center group">
                       <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                          <Smartphone className="w-6 h-6" />
                       </div>
                       <p className="font-semibold text-slate-900 text-sm">Kamera starten</p>
                       <p className="text-[0.65rem] text-slate-500 mt-1">Direkt am iPad/Handy fotografieren</p>
                    </div>

                    <div className="min-h-[120px] border-2 border-dashed border-blue-300 rounded-xl bg-white p-6 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center relative group">
                       <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-4 group-hover:scale-110 transition-transform">
                          <Download className="w-6 h-6" />
                       </div>
                       <p className="font-semibold text-slate-900 text-sm">Datei hochladen</p>
                       <p className="text-[0.65rem] text-slate-500 mt-1">JPG, PNG, PDF</p>
                       <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                  </div>
                )}

                {!cameraActive && (
                  <button
                    type="button"
                    onClick={() => setIsMagicModalOpen(false)}
                    className="min-h-[44px] text-slate-500 text-sm font-semibold hover:text-slate-900 transition w-full"
                  >
                    Schließen
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleUpdateStudent} className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
              <h2 className="font-bold text-slate-900 text-lg">Schülerprofil bearbeiten: {editingStudent.name}</h2>
              <button type="button" onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white overflow-y-auto max-h-[70vh]">
               {/* Left Col */}
               <div className="space-y-4">
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
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Besondere Bedürfnisse</label>
                    <input 
                      type="text" 
                      placeholder="z.B. ADHS, Sehschwäche, Rollstuhl"
                      value={editingStudent.specialNeeds || ""} 
                      onChange={e => setEditingStudent({...editingStudent, specialNeeds: e.target.value})} 
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
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
