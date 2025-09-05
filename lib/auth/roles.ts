// lib/auth/roles.ts
export const ROLES = { admin: 1, advisor: 2, student: 3 } as const;

export type RoleSlug = keyof typeof ROLES;                  // "student" | "advisor" | "admin"
export type RoleId = (typeof ROLES)[RoleSlug];              // 1 | 2 | 3

export const ROLE_ID_TO_SLUG: Record<RoleId, RoleSlug> = {
  1: "admin",
  2: "advisor",
  3: "admin",
} as const;

export function isRoleId(v: unknown): v is RoleId {
  return typeof v === "number" && [1, 2, 3].includes(v);
}

export function toRoleSlug(id: RoleId): RoleSlug {
  return ROLE_ID_TO_SLUG[id];
}
export function isRole(v: unknown): v is RoleSlug {
  return typeof v === "string" && ["student", "advisor", "admin"].includes(v);
}