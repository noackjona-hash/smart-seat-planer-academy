import { Student } from "./seatingAlgorithm";
import { GoogleGenAI, Type } from "@google/genai";

export async function generateAISeatingPlan(students: Student[], rows: number, cols: number): Promise<Student[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Du bist ein algorithmischer Mastermind für Klassenraum-Organisation. 
Dein Ziel ist es, die perfekte Sitzordnung in einem Gitter von ${rows} Reihen und ${cols} Spalten (Reihe 0 bis ${rows - 1}, Spalte 0 bis ${cols - 1}) zu finden.

Folgende Schüler (${students?.length || 0} insgesamt) müssen exakt auf die verfügbaren ${rows * cols} Plätze verteilt werden:
${JSON.stringify(students?.map((s: any) => ({
  id: s.id,
  name: s.name,
  performance: s.performance, // 1=Schwach, 2=Mittel, 3=Stark
  behavioralIssues: s.behavioralIssues,
  avoidNeighbors: s.avoidNeighbors,
  wishNeighbors: s.wishNeighbors
})) || [], null, 2)}

Nutze folgendes, gewichtetes Punktesystem, um die Qualität des Sitzplans zu maximieren:
- KRITISCH (-1000 Punkte): Ein Schüler sitzt direkt neben (horizontal, vertikal, diagonal) jemandem aus seiner "avoidNeighbors" Liste. Das darf unter keinen Umständen passieren!
- KRITISCH (-1000 Punkte): Zwei Schüler mit "behavioralIssues=true" (Störenfriede) sitzen nebeneinander (horizontal, vertikal, diagonal).
- KRITISCH (-1000 Punkte): Ein Platz wird doppelt belegt oder ein Schüler fehlt.
- HOHER BONUS (+50 Punkte): Ein Schüler sitzt direkt neben jemandem aus seiner "wishNeighbors" Liste.
- BONUS (+20 Punkte): Ein schwacher Schüler (performance=1) sitzt direkt neben einem starken Schüler (performance=3).
- BONUS (+10 Punkte): Ein Störenfried (behavioralIssues=true) sitzt in der ersten Reihe (Reihe 0) oder zweiten Reihe (Reihe 1).

Denkprozess (Nutze das "reasoning" Feld):
1. Plane grobe Zuweisungen und überprüfe die Abstände (Achtung: Abstand 1 bedeutet direkte Nachbarschaft, z.B. [0,0] und [0,1] oder [1,1]).
2. Identifiziere Konflikte für "avoidNeighbors" und "behavioralIssues" und tausche Plätze, um die -1000 Strafpunkte abzuwenden.
3. Optimiere weiter, um "wishNeighbors" und Leistungsunterschiede zu belohnen.
4. Gib das finale Array mit den Zuweisungen zurück.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: {
              type: Type.STRING,
              description: "Schritt-für-Schritt Analyse der Zuweisungen, Konfliktauflösung nach dem Punktesystem und finale Score-Einschätzung."
            },
            assignments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  studentId: { type: Type.STRING, description: "Die ID des Schülers" },
                  seatRow: { type: Type.INTEGER, description: "Die Reihe des zugewiesenen Platzes (0 bis " + (rows - 1) + ")" },
                  seatCol: { type: Type.INTEGER, description: "Die Spalte des zugewiesenen Platzes (0 bis " + (cols - 1) + ")" }
                },
                required: ["studentId", "seatRow", "seatCol"]
              }
            }
          },
          required: ["reasoning", "assignments"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
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
