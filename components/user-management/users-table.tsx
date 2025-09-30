"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
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
      setUsers((profiles || []) as unknown as UserProfile[])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

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
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage user roles for students and advisors. You can promote students to advisors.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
            <div>Name</div>
            <div>University</div>
            <div>Current Role</div>
            <div>Change Role</div>
            <div>Joined</div>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="grid grid-cols-5 gap-4 items-center py-3 border-b">
                <div>
                  <div className="font-medium">
                    {user.fname && user.lname
                      ? `${user.fname} ${user.lname}`
                      : 'No name set'}
                  </div>
                </div>

                <div>
                  <div className="text-sm">
                    {user.university?.name || 'No university'}
                  </div>
                </div>

                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-black ${
                    user.role_id === 2
                      ? 'bg-[var(--action-info)]/20 border border-[var(--action-info)]/30'
                      : 'bg-[var(--primary)]/20 border border-[var(--primary)]/30'
                  }`}>
                    {ROLE_MAP[user.role_id as keyof typeof ROLE_MAP]}
                  </span>
                </div>

                <div>
                  {updating === user.id ? (
                    <div className="text-sm text-muted-foreground">Updating...</div>
                  ) : (
                    <Select
                      value={user.role_id.toString()}
                      onValueChange={(newRoleId) => handleRoleChange(user.id, newRoleId)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">Student</SelectItem>
                        <SelectItem value="2">Advisor</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="text-sm">
                  {formatDate(user.created_at)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <Button onClick={fetchUsers} variant="outline">
            Refresh Users
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}