'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon } from 'lucide-react';

type Profile = {
  id: string;
  role_id: string;
} & Record<string, unknown>;

interface SettingsClientProps {
  user: User;
  profile: Profile;
}

const ROLE_OPTIONS = [
  { value: '1', label: 'Admin' },
  { value: '2', label: 'Advisor' },
  { value: '3', label: 'Student' }
];

export default function SettingsClient({ user, profile }: SettingsClientProps) {
  const [currentRole, setCurrentRole] = useState(profile.role_id || '3');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Simple toast state
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  } | null>(null);

  const showToast = (message: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return;

    setIsUpdatingRole(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: newRole })
        .eq('id', user.id);

      if (error) throw error;

      setCurrentRole(newRole);
      showToast({
        title: "Role Updated",
        description: `Your role has been changed to ${ROLE_OPTIONS.find(r => r.value === newRole)?.label}`,
      });

      // Refresh the page to update navigation and permissions
      router.refresh();
    } catch (error) {
      console.error('Error updating role:', error);
      showToast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <>
      {/* Role Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            User Role (Dev Only)
          </CardTitle>
          <CardDescription>
            Change your role in the system. This affects your permissions and available features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-select">Current Role</Label>
            <Select value={currentRole} onValueChange={handleRoleChange} disabled={isUpdatingRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isUpdatingRole && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating role...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div
            className={`
              ${toastMessage.variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}
              border rounded-lg p-4 shadow-lg
            `}
          >
            <h3 className="font-medium text-sm">{toastMessage.title}</h3>
            {toastMessage.description && (
              <p className="text-sm opacity-90 mt-1">{toastMessage.description}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
