export const ROLE_VALUES = ["student", "advisor", "admin", "super_admin"] as const;
export type Role = (typeof ROLE_VALUES)[number];

export function getEnvRole(): Role {
  const raw = process.env.MOCK_DASHBOARD_ROLE?.trim().toLowerCase();
  if (raw && (ROLE_VALUES as readonly string[]).includes(raw)) {
    return raw as Role;
  }
  if (process.env.NODE_ENV !== "production" && raw) {
    console.warn(
      `Invalid MOCK_DASHBOARD_ROLE="${raw}". Falling back to "student". Valid: ${ROLE_VALUES.join(", ")}.`
    );
  }
  return "student";
}
