export interface Student {
  id: string;
  name: string;
  performance: number; // 1 = weak, 2 = average, 3 = strong
  behavioralIssues: boolean;
  avoidNeighbors: string[]; // student IDs
  wishNeighbors: string[]; // student IDs
  learningType?: 'visual' | 'auditory' | 'kinesthetic';
  specialNeeds?: string;
}

export interface Seat {
  row: number;
  col: number;
  studentId: string | null;
}

export function generateSeatingPlan(students: Student[], rows: number, cols: number): Seat[] {
  // Initialize empty grid
  const grid: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push({ row: r, col: c, studentId: null });
    }
  }

  if (students.length === 0) return grid;

  // Extremely basic heuristic for seating (not purely optimal, just a decent attempt)
  // 1. Separate behavioral issues
  // 2. Pair strong (3) and weak (1) if possible
  // 3. Respect avoid/wish

  let unseated = [...students];
  
  // Sort by 'difficulty to seat': e.g., behavioral issues first, then strong constraints
  unseated.sort((a, b) => {
    let scoreA = (a.behavioralIssues ? 10 : 0) + a.avoidNeighbors.length + a.wishNeighbors.length;
    let scoreB = (b.behavioralIssues ? 10 : 0) + b.avoidNeighbors.length + b.wishNeighbors.length;
    return scoreB - scoreA;
  });

  const getNeighbors = (r: number, c: number, currentGrid: typeof grid) => {
    const neighbors: (string | null)[] = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const seat = currentGrid.find(s => s.row === nr && s.col === nc);
        if (seat?.studentId) neighbors.push(seat.studentId);
      }
    }
    return neighbors;
  };

  for (let c = 0; c < unseated.length; c++) {
    const student = unseated[c];
    let bestSeatIndex = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < grid.length; i++) {
        if (grid[i].studentId !== null) continue;

        const neighbors = getNeighbors(grid[i].row, grid[i].col, grid);
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

        // Front row preference for weak or behavioral?
        // simple test: rows closer to 0 get slight preference for behavioral
        if (student.behavioralIssues) {
            currentScore += (rows - grid[i].row) * 5;
        }

        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestSeatIndex = i;
        }
    }

    // Fallback if no valid seat without conflicts find any empty seat
    if (bestSeatIndex === -1) {
        bestSeatIndex = grid.findIndex(s => s.studentId === null);
    }

    if (bestSeatIndex !== -1) {
        grid[bestSeatIndex].studentId = student.id;
    }
  }

  return grid;
}
