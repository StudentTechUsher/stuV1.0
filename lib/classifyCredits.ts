/**
 * Type representing class year/standing based on earned credits
 */
export type ClassYear = "Freshman" | "Sophomore" | "Junior" | "Senior";

/**
 * Classifies a student's standing based on total credits earned.
 * Uses inclusive range boundaries: 0–29.9 (Freshman), 30–59.9 (Sophomore),
 * 60–89.9 (Junior), 90+ (Senior).
 *
 * @param total - Total credits earned (may be decimal, null, or undefined)
 * @returns ClassYear standing ("Freshman", "Sophomore", "Junior", or "Senior")
 *
 * @remarks
 * - Handles null/undefined by defaulting to "Freshman"
 * - Handles NaN by defaulting to "Freshman"
 * - Handles negative values by defaulting to "Freshman"
 * - Decimal-aware comparisons (no rounding)
 * - Logs a warning when invalid values are encountered
 */
export function classifyCredits(total: number | null | undefined): ClassYear {
  // Check for null or undefined
  if (total == null) {
    if (typeof window !== "undefined") {
      console.warn(
        "classifyCredits: Invalid totalCreditsEarned (null/undefined); defaulting to Freshman"
      );
    }
    return "Freshman";
  }

  // Check for NaN
  if (Number.isNaN(total)) {
    if (typeof window !== "undefined") {
      console.warn(
        "classifyCredits: Invalid totalCreditsEarned (NaN); defaulting to Freshman"
      );
    }
    return "Freshman";
  }

  // Check for negative values
  if (total < 0) {
    if (typeof window !== "undefined") {
      console.warn(
        "classifyCredits: Invalid totalCreditsEarned (negative); defaulting to Freshman"
      );
    }
    return "Freshman";
  }

  // Classification logic with decimal-aware comparisons
  if (total < 30) return "Freshman";
  if (total < 60) return "Sophomore";
  if (total < 90) return "Junior";
  return "Senior";
}
