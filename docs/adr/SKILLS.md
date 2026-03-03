# Agent Design Skills & Heuristics

This document describes the principles and patterns used to design agents and agentic features in this codebase. Any plan to create or extend an agentic system must be audited against every section here before implementation begins.

---

## 1. Tool Design

### Tools must be specific, not general

Each tool should do exactly one thing. A tool named `manageSchedule` that creates, updates, and deletes schedule entries is three tools pretending to be one. Broad tools:
- make it harder to audit what the agent is actually doing
- inflate the decision space at each step, increasing hallucination risk
- produce noisy traces that are difficult to debug

**Heuristic:** If you cannot describe a tool's behavior in one sentence without the word "and", split it.

**Good:**
```typescript
tools: [
  { name: 'get_course_section', description: 'Fetch a single course section by CRN' },
  { name: 'check_conflict', description: 'Check whether two sections overlap in time' },
  { name: 'add_section_to_schedule', description: 'Add a resolved section to the working schedule' },
]
```

**Bad:**
```typescript
tools: [
  { name: 'manage_schedule', description: 'Get, check, and modify schedule entries' },
]
```

### Math must be done by tools, not the model

LLMs are unreliable arithmetic engines. Any calculation — credit hour sums, GPA projections, schedule conflict detection, prerequisite chain resolution — must be implemented as a deterministic tool function and called by the agent. The model's job is to decide *when* to call the tool, not to compute the result itself.

```typescript
// Tool implementation (deterministic, testable)
function calculateGpa(courses: CourseWithGrade[]): number {
  const totalPoints = courses.reduce((sum, c) => sum + c.gradePoints * c.credits, 0);
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  return totalCredits === 0 ? 0 : totalPoints / totalCredits;
}
```

---

## 2. Model Routing

### Use the minimum-cost model that can do the job

Not every step in a pipeline needs the most capable model. Route to smaller, faster, cheaper models for deterministic or low-context steps. Reserve high-context models for steps that require genuine reasoning.

| Task type | Model tier |
|---|---|
| Slot-fill from structured data | Small (e.g. `gpt-4o-mini`) |
| Classify user intent from short input | Small |
| Multi-turn plan generation with constraint satisfaction | Large (e.g. `gpt-4o`) |
| Verify heuristics, check plan coherence | Large |
| Summarize tool output into a user-facing message | Small |

This is captured in ADR 0001 for the createV3 runtime. The same principle applies to all new agentic features.

### Make routing decisions explicit and auditable

Model selection must not be hardcoded deep in a utility. Routing logic belongs at the workflow or phase level, and must be logged so it appears in traces.

---

## 3. Human-in-the-Loop (HITL)

Every agentic plan must answer: **at what points can the human intervene, correct, or abort?**

### Required HITL checkpoints

- **Before irreversible actions** — any tool call that writes to the database, sends a message, or modifies shared state must have a confirmation step or be explicitly scoped as auto-approved with justification documented.
- **On low-confidence branches** — if the agent cannot resolve ambiguity from context alone, it must surface a clarifying question rather than guess.
- **On plan completion** — the agent should present its final output for user review before committing it (e.g. "Here is the plan I generated — approve to save").

### Pattern: Speculative generation + explicit commit

Generate the artifact first, hold it in working state, then require an explicit user action to persist it. Never auto-save agentic output without user acknowledgment.

```typescript
// 1. Generate into draft state
const draft = await runPlanGenerator(context);

// 2. Surface to user for review
await updateJobState(jobId, { status: 'awaiting_approval', draft });

// 3. Commit only on explicit approval
// (triggered by user action in UI, not by the agent)
```

---

## 4. Prompt Injection Prevention

Any agentic feature that accepts user-supplied text, document content, or external data as tool input must treat that content as untrusted.

### Rules

1. **Never interpolate untrusted input directly into system prompts.** Pass it as a clearly delimited user turn or a structured tool result, not embedded in instructions.

2. **Delimit external content explicitly.** Wrap document content, transcript text, or user descriptions in XML-style tags so the model has a clear boundary between instructions and data:
   ```
   <transcript>
   {{ untrustedContent }}
   </transcript>
   ```

3. **Tool schemas are the last line of defense.** Define strict input types on every tool. If a tool expects a course code string, validate that it matches the expected pattern before execution — do not pass raw model output directly to a database query.

4. **Audit tool call arguments in traces.** Log the exact arguments the model passed to each tool. If an argument looks like an instruction rather than a data value, treat it as a potential injection attempt.

---

## 5. Cascading Hallucination Risk

Multi-step agents compound errors. A hallucinated course code in step 1 produces a failed lookup in step 2, which causes the agent to fill a gap with another hallucinated value in step 3. By step 5 the plan is plausible-looking but entirely fabricated.

### Mitigation checklist

- [ ] **Ground every claim in a tool result.** If the agent references a course, program, or requirement, there must be a prior tool call that returned it. The model must not invent identifiers.
- [ ] **Validate tool outputs at boundaries.** When a tool returns a list of options, the agent must select from that list — do not allow free-text invention of identifiers not in the response.
- [ ] **Fail loudly on lookup misses.** Tools should throw typed errors on not-found rather than returning empty or null, so the agent cannot silently proceed on a missing dependency.
- [ ] **Include a verification phase.** For complex plans (e.g. full graduation plan generation), include a dedicated heuristic-check step that re-validates the output against known constraints before surfacing to the user.
- [ ] **Cap tool call depth.** Set a maximum iteration limit on any agentic loop. An agent that loops indefinitely is masking a compounding error, not solving a hard problem.

---

## 6. Observability

Observability is not optional. Every agentic feature must emit structured traces that can be inspected without re-running the agent.

### Required instrumentation

| Signal | What to capture |
|---|---|
| **Tool calls** | Tool name, input arguments, raw output, duration, success/error |
| **Model invocations** | Model ID, prompt token count, completion token count, latency |
| **Phase transitions** | Current phase/step name, timestamp, triggering event |
| **Errors** | Error type, message, stack, which tool or phase failed |
| **Final output** | The artifact produced, which session/job ID it belongs to |

### Event ledger pattern

Write every significant event as an append-only record tied to a `sessionId` or `jobId`. This enables replay, debugging, and audit without side effects.

```typescript
await appendTraceEvent(sessionId, {
  type: 'tool_call',
  tool: 'get_course_section',
  args: { crn: '12345' },
  result: { ... },
  durationMs: 42,
});
```

### UI observability

The user must never be left staring at a spinner with no information. At minimum:

- Show which phase or step is currently running (e.g. "Analyzing your transcript…", "Building course skeleton…")
- Show progress if the number of steps is known
- Surface a human-readable error if the agent fails — never expose raw model output or stack traces

This is a UI contract, not a nice-to-have. A job that completes silently or fails silently erodes trust.

---

## 7. Feature Audit Checklist

Before implementing any new agentic feature, verify:

- [ ] All tools are specific (single-responsibility, one-sentence description)
- [ ] All math/calculations are in tool functions, not prompted to the model
- [ ] Model routing is documented — which steps use which tier and why
- [ ] HITL checkpoints are identified and implemented
- [ ] Irreversible actions require explicit user confirmation
- [ ] Untrusted input is delimited and never interpolated into system prompts
- [ ] Tool schemas validate arguments before execution
- [ ] Hallucination grounding: every referenced entity comes from a tool result
- [ ] A verification/heuristic-check phase exists for complex output
- [ ] Tool call depth is bounded
- [ ] All tool calls are logged with arguments and results
- [ ] Phase transitions are emitted to the trace/event ledger
- [ ] UI surfaces current agent state to the user during execution
- [ ] Errors surface as human-readable messages, not raw model output
