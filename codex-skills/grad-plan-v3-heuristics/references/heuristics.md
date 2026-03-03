# Heuristics Reference

## Remaining requirements
- Compute remaining requirement credits as `sum(max(required - completed, 0))` across requirement buckets.
- Requested elective credits are separate from required buckets.
- `totalCreditsToComplete = remainingRequirementCredits + requestedElectiveCredits`.

## Term envelope
- Respect selected distribution envelope (`minCreditsPerTerm`, `maxCreditsPerTerm`, `targetCreditsPerTerm`).
- A plan violates envelope if any term credits are `< min` or `> max`.
- Suggested repair for envelope violations targets `elective_fill` first.

## Verification failures and repair targets
- Duplicate planned courses:
  - detect across all terms by course code
  - repair target: `major_fill` or `minor_fill`
- Transcript leakage:
  - planned code appears in transcript completed list without explicit retake rule
  - repair target: `major_fill` or `gen_ed_fill`
- Missing requirement buckets:
  - bucket has remaining credits and no planned candidate coverage
  - repair target by bucket type

## Trace expectations
- Every check/repair decision emits a trace event.
- Trace payloads are redacted before persistence/display.
- Include `phase`, `scope`, and short failure codes for quick debugging.
