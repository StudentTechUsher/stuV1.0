import { AdvisorDailyInsights } from "@/models/advisor-daily-insights";

export async function getAdvisorDailyInsights(advisorId: string): Promise<AdvisorDailyInsights> {
  // TODO: replace with your real data source (SQL, RPC, Supabase fn, etc.)
  // Keep a tiny delay to mirror I/O while developing
  await new Promise((r) => setTimeout(r, 120));
  return {
    percentPlansUpdated: 57,
    studentsOnProbation: 6,
    planningRequisitions: 24,
    plansAwaitingReview: 13,
  };
}
