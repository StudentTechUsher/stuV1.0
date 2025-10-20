"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StuLoader } from "@/components/ui/StuLoader"

interface UserProfile {
  id: string
  role_id: number
  created_at: string
  fname: string | null
  lname: string | null
  university_id: number | null
  university: {
    id: number
    name: string
  } | null
}

const ROLE_MAP = {
  1: "Admin",
  2: "Advisor",
  3: "Student"
}

export function UsersTable() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)

      // Query profiles table joined with university table for students and advisors only
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          role_id,
          created_at,
          fname,
          lname,
          university_id,
          university:university_id (
            id,
            name
          )
        `)
        .in('role_id', [2, 3]) // Only advisors (2) and students (3)
        .order('created_at', { ascending: false })

      if (profileError) {
        console.error('Error fetching profiles:', profileError)
        return
      }

      console.log('Profiles data:', profiles) // Debug log

      // Transform the data: Supabase returns university as an array, we need the first element
      const transformedProfiles: UserProfile[] = (profiles || []).map((profile) => ({
        ...profile,
        university: Array.isArray(profile.university) && profile.university.length > 0
          ? profile.university[0]
          : null
      }))

      setUsers(transformedProfiles)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      setUpdating(userId)

      const { error } = await supabase
        .from('profiles')
        .update({ role_id: parseInt(newRoleId) })
        .eq('id', userId)

      if (error) {
        console.error('Error updating role:', error)
        alert('Failed to update user role')
        return
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId
          ? { ...user, role_id: parseInt(newRoleId) }
          : user
      ))

      alert('User role updated successfully!')
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update user role')
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-16 shadow-sm">
        <StuLoader variant="card" text="Loading users..." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Users */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Total Users</p>
              <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">{users.length}</p>
            </div>
          </div>
        </div>

        {/* Advisors */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2196f3]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Advisors</p>
              <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">
                {users.filter(u => u.role_id === 2).length}
              </p>
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#5E35B1]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Students</p>
              <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">
                {users.filter(u => u.role_id === 3).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm">
        {/* Table Header */}
        <div className="border-b-2 px-4 py-3.5 sm:px-6" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-header text-sm font-bold uppercase tracking-wider text-white">
              All Users
            </h3>
            <button
              type="button"
              onClick={fetchUsers}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 font-body-semi text-xs font-semibold text-white transition-all duration-200 hover:bg-white/20"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Column Headers */}
        <div className="hidden border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] px-4 py-3 sm:px-6 md:grid md:grid-cols-5 md:gap-4">
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Name</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">University</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Current Role</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Change Role</div>
          <div className="font-body-semi text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Joined</div>
        </div>

        {/* Table Body */}
        <div className="max-h-[600px] overflow-y-auto">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]">
                <svg className="h-8 w-8 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-header-bold mb-2 text-lg font-bold text-[var(--foreground)]">No Users Found</h3>
              <p className="font-body text-sm text-[var(--muted-foreground)]">There are no users to display at this time.</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="group grid grid-cols-1 gap-3 border-b border-[var(--border)] px-4 py-4 transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] sm:px-6 md:grid-cols-5 md:items-center md:gap-4"
              >
                {/* Name */}
                <div>
                  <p className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
                    {user.fname && user.lname
                      ? `${user.fname} ${user.lname}`
                      : 'No name set'}
                  </p>
                  <p className="font-body mt-0.5 text-xs text-[var(--muted-foreground)] md:hidden">
                    {user.university?.name || 'No university'}
                  </p>
                </div>

                {/* University - Desktop Only */}
                <div className="hidden md:block">
                  <p className="font-body text-sm text-[var(--foreground)]">
                    {user.university?.name || 'No university'}
                  </p>
                </div>

                {/* Current Role */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                      user.role_id === 2
                        ? 'border-[#2196f3] bg-[color-mix(in_srgb,#2196f3_8%,transparent)] text-[#2196f3]'
                        : 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-[var(--primary)]'
                    }`}
                  >
                    {user.role_id === 2 ? (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                    ) : (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                      </svg>
                    )}
                    {ROLE_MAP[user.role_id as keyof typeof ROLE_MAP]}
                  </span>
                </div>

                {/* Change Role */}
                <div>
                  {updating === user.id ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Updating...
                    </div>
                  ) : (
                    <Select
                      value={user.role_id.toString()}
                      onValueChange={(newRoleId) => handleRoleChange(user.id, newRoleId)}
                    >
                      <SelectTrigger className="h-9 w-full max-w-[160px] border-[var(--border)] font-body-semi text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">
                          <div className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                            </svg>
                            Student
                          </div>
                        </SelectItem>
                        <SelectItem value="2">
                          <div className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                            </svg>
                            Advisor
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Joined Date */}
                <div>
                  <p className="font-body text-sm text-[var(--muted-foreground)]">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
