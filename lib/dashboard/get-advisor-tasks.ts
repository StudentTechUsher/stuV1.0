// lib/tasks/get-advisor-tasks-today.ts
export type TaskChunk = { text: string; underline?: boolean; href?: string };
export type AdvisorTask = {
  id: string;
  chunks: TaskChunk[];        // render in order; chunks with underline=true are underlined
  href?: string;              // whole-row link (optional)
};

export async function getAdvisorTasksToday(advisorId: string): Promise<AdvisorTask[]> {
  // TODO: replace with real query
  await new Promise((r) => setTimeout(r, 120));
  return [
    {
      id: "t1",
      chunks: [
        { text: "John Appleseed", underline: true, href: "/students/123" },
        { text: " submitted a new Four Year Plan for your approval" },
      ],
      href: "/advisor/reviews/plan/987",
    },
    {
      id: "t2",
      chunks: [
        { text: "Martin Boone", underline: true, href: "/students/456" },
        { text: " submitted a requisition for a double major" },
      ],
      href: "/advisor/requisitions/654",
    },
  ];
}
