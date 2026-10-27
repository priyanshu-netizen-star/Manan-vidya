/**
 * Grade bands used on report cards. This follows the familiar CBSE-style 8-point scale and is a
 * DEFAULT: the school must confirm its own scale before report cards are issued.
 */
export const GRADE_BANDS = [
  { min: 91, grade: "A1" },
  { min: 81, grade: "A2" },
  { min: 71, grade: "B1" },
  { min: 61, grade: "B2" },
  { min: 51, grade: "C1" },
  { min: 41, grade: "C2" },
  { min: 33, grade: "D" },
  { min: 0, grade: "E" },
] as const;

export function gradeFor(percent: number | null): string {
  if (percent == null || Number.isNaN(percent)) return "—";
  return GRADE_BANDS.find((b) => percent >= b.min)!.grade;
}
