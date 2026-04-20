import { GoogleGenAI, Type } from "@google/genai";
import { Student } from "./seatingAlgorithm";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function generateAISeatingPlan(students: Student[], rows: number, cols: number): Promise<Student[]> {
  try {
    const prompt = `
Du bist ein erfahrener Lehrer. Der Sitzplan muss auf einem Gitter von ${rows} Reihen und ${cols} Spalten aufgebaut werden (Reihenindex 0 bis ${rows - 1}, Spaltenindex 0 bis ${cols - 1}).

Folgende Schüler müssen platziert werden:
${JSON.stringify(students.map(s => ({
  id: s.id,
  name: s.name,
  performance: s.performance, // 1=Schwach, 2=Mittel, 3=Stark
  behavioralIssues: s.behavioralIssues,
  avoidNeighbors: s.avoidNeighbors,
  wishNeighbors: s.wishNeighbors
})), null, 2)}

Regeln für einen exzellenten Sitzplan:
1. Schüler mit "behavioralIssues" (Störenfriede) sollten tendenziell weiter vorne sitzen (niedriger Reihenindex).
2. Schüler, die in "avoidNeighbors" stehen, DÜRFEN NICHT als direkte Nachbarn (vertikal, horizontal oder diagonal = Abstand von 1) sitzen. Halte maximalen Abstand.
3. Schüler, die in "wishNeighbors" stehen, SOLLTEN als direkte Nachbarn platziert werden, wo möglich.
4. Setze leistungsschwache Schüler (performance=1) gerne neben leistungsstarke Schüler (performance=3), damit sie Unterstützung bekommen.
5. Zwei Störenfriede (behavioralIssues=true) dürfen NIEMALS nebeneinander sitzen.
6. Jeder Schüler muss einen exakten, einmaligen Sitzplatz (seatRow, seatCol) bekommen! Kein Platz darf doppelt belegt sein.

Generiere den optimierten Sitzplan und gib ihn präzise im JSON Format mit der Sitzplatzstruktur zurück.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              studentId: { type: Type.STRING, description: "Die ID des Schülers" },
              seatRow: { type: Type.INTEGER, description: "Die Reihe des zugewiesenen Platzes", minimum: 0, maximum: rows - 1 },
              seatCol: { type: Type.INTEGER, description: "Die Spalte des zugewiesenen Platzes", minimum: 0, maximum: cols - 1 }
            },
            required: ["studentId", "seatRow", "seatCol"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const assignments: { studentId: string, seatRow: number, seatCol: number }[] = JSON.parse(text);

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
