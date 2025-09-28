import { UsersTable } from "@/components/user-management/users-table"

export default function MaintainUsersPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Maintain Users</h1>
        <div className="text-sm text-muted-foreground">
          Manage user roles and permissions
        </div>
      </div>

      <UsersTable />
    </div>
  );
}