export interface Student {
  id: string;
  classId?: string;
  teacherId?: string;
  name: string;
  performance: number; // 1 = weak, 2 = average, 3 = strong
  behavioralIssues: boolean;
  avoidNeighbors: string[]; // student IDs
  wishNeighbors: string[]; // student IDs
  learningType?: 'visual' | 'auditory' | 'kinesthetic';
  specialNeeds?: string;
  seatRow?: number | null;
  seatCol?: number | null;
}

export interface Seat {
  row: number;
  col: number;
  studentId: string | null;
}

export function generateSeatingPlan(students: Student[], rows: number, cols: number): Student[] {
  // Initialize empty grid to track occupied seats
  const occupied: (string | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));

  if (students.length === 0) return students;

  // Clear existing seats
  const updatedStudents: Student[] = students.map(s => ({ ...s, seatRow: null, seatCol: null }));

  // Extremely basic heuristic for seating
  let unseated = [...updatedStudents];
  
  // Sort by 'difficulty to seat'
  unseated.sort((a, b) => {
    let scoreA = (a.behavioralIssues ? 10 : 0) + a.avoidNeighbors.length + a.wishNeighbors.length;
    let scoreB = (b.behavioralIssues ? 10 : 0) + b.avoidNeighbors.length + b.wishNeighbors.length;
    return scoreB - scoreA;
  });

  const getNeighbors = (r: number, c: number) => {
    const neighbors: (string | null)[] = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (occupied[nr][nc]) neighbors.push(occupied[nr][nc]);
      }
    }
    return neighbors;
  };

  for (let c = 0; c < unseated.length; c++) {
    const student = unseated[c];
    let bestR = -1;
    let bestC = -1;
    let bestScore = -Infinity;

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if (occupied[r][col] !== null) continue;

        const neighbors = getNeighbors(r, col);
        let currentScore = 0;
        let conflict = false;

        // Neighbor check
        for (const nId of neighbors) {
          if (!nId) continue;
          const nStudent = students.find(s => s.id === nId);
          if (!nStudent) continue;

          // Avoid conflicts
          if (student.avoidNeighbors.includes(nId) || nStudent.avoidNeighbors.includes(student.id)) {
            conflict = true;
            break;
          }

          // Rule: separate behavioral issues
          if (student.behavioralIssues && nStudent.behavioralIssues) {
            currentScore -= 100; // heavy penalty
          }

          // Rule: Strong next to weak
          if ((student.performance === 3 && nStudent.performance === 1) || 
              (student.performance === 1 && nStudent.performance === 3)) {
            currentScore += 50; 
          }

          // Rule: Wishes
          if (student.wishNeighbors.includes(nId)) currentScore += 30;
          if (nStudent.wishNeighbors.includes(student.id)) currentScore += 30;
        }

        if (conflict) continue;

        // Front row preference for behavioral?
        if (student.behavioralIssues) {
            currentScore += (rows - r) * 5;
        }

        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestR = r;
            bestC = col;
        }
      }
    }

    // Fallback if no valid seat without conflicts find any empty seat
    if (bestR === -1) {
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
           if (occupied[r][col] === null) {
              bestR = r;
              bestC = col;
              break;
           }
        }
        if (bestR !== -1) break;
      }
    }

    if (bestR !== -1) {
        occupied[bestR][bestC] = student.id;
        const studentIndex = updatedStudents.findIndex(s => s.id === student.id);
        if (studentIndex > -1) {
           updatedStudents[studentIndex] = { ...updatedStudents[studentIndex], seatRow: bestR, seatCol: bestC };
        }
    }
  }

  return updatedStudents;
}
