import { Student } from "./seatingAlgorithm";

export async function generateAISeatingPlan(students: Student[], rows: number, cols: number): Promise<Student[]> {
  try {
    const res = await fetch('/api/ai-seating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students, rows, cols })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server Fehler: ${res.status}`);
    }

    const result = await res.json();
    const assignments: { studentId: string, seatRow: number, seatCol: number }[] = result.assignments || [];

    const newStudents = [...students];
    for (const a of assignments) {
      const idx = newStudents.findIndex(s => s.id === a.studentId);
      if (idx !== -1) {
        newStudents[idx] = { ...newStudents[idx], seatRow: a.seatRow, seatCol: a.seatCol };
      }
    }

    return newStudents;

  } catch (error) {
    console.error("AI Seating Plan generation failed", error);
    throw new Error('Sitzplan-Generierung mit KI fehlgeschlagen');
  }
}
