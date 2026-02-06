# Auth Model (Tables + Invariants)

Goal: make role escalation impossible even with a malicious client by (1) separating user-controlled requests from privileged approvals, and (2) encoding access **purely in RLS** (no “default allow” logic in application code).

## Roles

| Role | Meaning | How assigned |
|---|---|---|
| `student` | Default end-user | **Server-assigned** (never user-writable) |
| `advisor` | Can view/act for linked students | **Server-assigned** after approval |
| `university_admin` | Admin within a single university | **Server-assigned** (scoped by university) |
| `service` | Backend/edge function with service-role key | Not a user role; bypasses RLS via service key |

## Tables (ownership / write paths)

| Table | Purpose | Client may `INSERT` | Client may `UPDATE` | Privileged service may write |
|---|---|---:|---:|---:|
| `profiles` | Public-ish user profile data | (optional) self | **Self only**, but **cannot** change role/university/approval flags | ✅ |
| `user_roles` | Canonical role assignments (user ↔ role) | ❌ | ❌ | ✅ (only) |
| `advisor_students` | Advisor ↔ student relationship (per-student grant) | ❌ | ❌ | ✅ (only) |
| `advisor_programs` | Advisor ↔ program relationship (bulk grant via program) | ❌ | ❌ | ✅ (only) |
| `advisor_requests` | User-initiated request to become advisor | ✅ (self) | ❌ (or very limited self fields) | ✅ (approve/deny via server workflow) |
| `students` (and any student-owned tables) | Student academic data | ✅ (self, if applicable) | ✅ (self) | ✅ |
| `universities` / `programs` | Reference / scoping entities | ❌ | ❌ | ✅ |

## Invariants (must always hold)

1. **No client can grant itself privileges.** Clients can never write `user_roles`, `advisor_students`, or `advisor_programs`.
2. **Profiles are non-authoritative for access.** A user cannot set `role`, `university_id`, or any approval/admin flags in `profiles`.
3. **Advisor status is a server decision.** Users can create an `advisor_requests` row, but can never approve it (no client updates that flip an approved flag).
4. **Student data is identity-scoped.** For any student-owned table `T`, access is gated by `T.student_id = auth.uid()` unless elevated via advisor/admin rules.
5. **Advisor access is explicit.** Advisors only access a student if:
   - `exists(select 1 from advisor_students where advisor_id = auth.uid() and student_id = T.student_id)`, **or**
   - `exists(select 1 from advisor_programs ap join students s on s.program_id = ap.program_id where ap.advisor_id = auth.uid() and s.id = T.student_id)`.
6. **University admin access is university-scoped.** Admin access requires `students.university_id = <server-assigned university_id for auth.uid()>` and never crosses universities.
7. **RLS is the sole enforcement point.** Application code must not “filter after the fact” or “default to allowed data.”

## RLS predicates (canonical checks)

Use the following predicates consistently across student-owned tables (`students`, `plans`, `notes`, etc.):

- **Self (student)**
  - `T.student_id = auth.uid()`
- **Advisor-of-student**
  - `exists (select 1 from advisor_students ast where ast.advisor_id = auth.uid() and ast.student_id = T.student_id)`
- **Advisor-of-program**
  - `exists (select 1 from advisor_programs ap join students s on s.program_id = ap.program_id where ap.advisor_id = auth.uid() and s.id = T.student_id)`
- **University admin**
  - `exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'university_admin')`
  - AND `T.university_id = (select university_id from user_university_scope where user_id = auth.uid())` *(server-assigned scope; exact storage can vary)*

## Automated “attack” tests (run before BYU/design-partner demos)

Add/keep an automated suite that uses **real auth tokens** and attempts common privilege escalations:

1. Student A cannot `SELECT` Student B rows from any student-owned table.
2. Student A cannot `UPDATE` Student B rows from any student-owned table.
3. Student cannot `UPDATE profiles.role` / `profiles.university_id` / any approval/admin flags.
4. Student cannot `INSERT`/`UPDATE` into `user_roles`, `advisor_students`, or `advisor_programs`.
5. Student can `INSERT` an `advisor_requests` row for self, but cannot mark it approved/denied.
6. Advisor cannot access students not linked via `advisor_students` and not in an allowed program via `advisor_programs`.
7. Advisor cannot access any student in a different university (even if IDs are guessed).
8. University admin cannot access data outside their university scope.
9. Client cannot bypass RLS by requesting broad queries (e.g., “select all students”)—must return only allowed rows.
10. Regression: after any schema/policy change, rerun the suite to ensure no “default allow” creep.

