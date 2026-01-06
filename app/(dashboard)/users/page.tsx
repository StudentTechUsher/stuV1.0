import { UsersTable } from "@/components/user-management/users-table"

export default function MaintainUsersPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Modern Header */}
      <div className="space-y-2">
        <h1 className="font-header text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Maintain Users
        </h1>
        <p className="font-body text-sm text-[var(--muted-foreground)]">
          Manage roles and access for students and advisors
        </p>
      </div>

      <UsersTable />
    </div>
  );
}