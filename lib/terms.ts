/**
 * Term utilities for semester/term code manipulation
 */

export type Season = "Spring" | "Summer" | "Fall" | "Winter";

/**
 * Get current term code (e.g., "2025SP")
 * In production, this should be fetched from institution settings
 */
export function currentTermCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  let season: string;
  if (month >= 1 && month <= 4) {
    season = "SP"; // Spring
  } else if (month >= 5 && month <= 7) {
    season = "SU"; // Summer
  } else if (month >= 8 && month <= 11) {
    season = "FA"; // Fall
  } else {
    season = "WI"; // Winter
  }

  return `${year}${season}`;
}

/**
 * Add N terms to a term code
 * @param termCode - e.g., "2025SP"
 * @param n - number of terms to add
 * @returns new term code
 */
export function addTerms(termCode: string, n: number): string {
  const yearStr = termCode.slice(0, 4);
  const seasonCode = termCode.slice(4);

  let year = parseInt(yearStr, 10);
  const seasons = ["SP", "SU", "FA", "WI"];
  let seasonIndex = seasons.indexOf(seasonCode);

  if (seasonIndex === -1) {
    throw new Error(`Invalid season code: ${seasonCode}`);
  }

  // Add terms
  seasonIndex += n;

  // Handle year overflow
  while (seasonIndex >= seasons.length) {
    seasonIndex -= seasons.length;
    year++;
  }
  while (seasonIndex < 0) {
    seasonIndex += seasons.length;
    year--;
  }

  return `${year}${seasons[seasonIndex]}`;
}

/**
 * Expand future term codes for forecasting
 * @param n - number of semesters ahead (1-4)
 * @returns array of term codes
 */
export function expandFutureTerms(n: 1 | 2 | 3 | 4): string[] {
  const current = currentTermCode();
  const terms: string[] = [];

  for (let i = 1; i <= n; i++) {
    terms.push(addTerms(current, i));
  }

  return terms;
}

/**
 * Parse term code into year and season
 */
export function parseTermCode(termCode: string): { year: number; season: string } {
  const year = parseInt(termCode.slice(0, 4), 10);
  const season = termCode.slice(4);
  return { year, season };
}

/**
 * Format term code for display (e.g., "2025SP" -> "Spring 2025")
 */
export function formatTermCode(termCode: string): string {
  const { year, season } = parseTermCode(termCode);
  const seasonMap: Record<string, string> = {
    SP: "Spring",
    SU: "Summer",
    FA: "Fall",
    WI: "Winter",
  };
  return `${seasonMap[season] || season} ${year}`;
}
