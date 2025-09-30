import { UsersTable } from "@/components/user-management/users-table"

export default function MaintainUsersPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 style={{
          fontFamily: '"Red Hat Display", sans-serif',
          fontWeight: 800,
          color: 'black',
          fontSize: '2rem',
          margin: 0,
          marginBottom: '24px'
        }}>Maintain Users</h1>
        <div className="text-sm text-muted-foreground">
          Manage user roles and permissions
        </div>
      </div>

      <UsersTable />
    </div>
  );
}