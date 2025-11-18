'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Shield } from 'lucide-react';

type Profile = {
  id: string;
  role_id: string;
} & Record<string, unknown>;

interface SettingsClientProps {
  user?: User;
  profile?: Profile;
}

const ROLE_OPTIONS = [
  { value: '1', label: 'Admin', description: 'Full system access and control' },
  { value: '2', label: 'Advisor', description: 'Student management and guidance' },
  { value: '3', label: 'Student', description: 'Personal academic planning' }
];

export default function SettingsClient({ user: passedUser, profile: passedProfile }: SettingsClientProps) {
  const [currentRole, setCurrentRole] = useState<string>('3');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [user, setUser] = useState<User | null>(passedUser || null);
  const [isLoading, setIsLoading] = useState(!passedUser || !passedProfile);

  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Simple toast state
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  } | null>(null);

  // Fetch user data if not provided
  useEffect(() => {
    if (passedUser && passedProfile) {
      setUser(passedUser);
      setCurrentRole(passedProfile.role_id || '3');
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (profileData) {
            setCurrentRole(profileData.role_id || '3');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showToast({
          title: 'Failed to load settings',
          description: 'There was a problem loading your settings. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [passedUser, passedProfile, supabase]);

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

  const currentRoleLabel = ROLE_OPTIONS.find(r => r.value === currentRole)?.label || 'Student';

  if (isLoading) {
    return (
      <Card className="p-0 border-0 rounded-[7px] overflow-hidden shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)] bg-white">
        <CardContent className="p-6 flex items-center justify-center h-32">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
            <span className="text-sm text-[var(--muted-foreground)]">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="p-0 border-0 rounded-[7px] overflow-hidden shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)] bg-white">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Please log in to access settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Role Settings - Modern card with clean design */}
      <Card className="p-0 border-0 rounded-[7px] overflow-hidden shadow-[0_52px_140px_-90px_rgba(10,31,26,0.58)] bg-white">
        {/* Premium black header */}
         <div className="bg-[#0A0A0A] w-full p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary)] shadow-lg">
              <Shield className="h-6 w-6 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <CardTitle className="text-white font-[family-name:var(--font-header)] font-extrabold text-xl mb-1">
                User Role
              </CardTitle>
              <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--primary)]">Dev Only</span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <CardDescription className="text-[var(--muted-foreground)] mb-6 text-sm leading-relaxed">
            Change your role in the system. This affects your permissions and available features. Changes take effect immediately.
          </CardDescription>

          {/* Current role display */}
          <div className="mb-6 p-4 rounded-xl bg-[color-mix(in_srgb,var(--muted)_30%,transparent)] border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-0.5">
                    Current Role
                  </p>
                  <p className="text-base font-bold text-[var(--foreground)]">
                    {currentRoleLabel}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[var(--primary)] shadow-sm">
                <span className="text-xs font-bold text-black uppercase tracking-wide">Active</span>
              </div>
            </div>
          </div>

          {/* Role selector */}
          <div className="space-y-3">
            <Label htmlFor="role-select" className="text-sm font-semibold text-[var(--foreground)]">
              Select New Role
            </Label>
            <Select value={currentRole} onValueChange={handleRoleChange} disabled={isUpdatingRole}>
              <SelectTrigger
                id="role-select"
                className="w-full h-12 rounded-xl border-[var(--border)] hover:border-[var(--primary)] transition-colors duration-200 focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-20"
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem
                    key={role.value}
                    value={role.value}
                    className="rounded-lg my-1 cursor-pointer"
                  >
                    <div className="flex flex-col py-1">
                      <span className="font-semibold text-sm">{role.label}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">{role.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isUpdatingRole && (
            <div className="flex items-center justify-center gap-2 mt-6 p-3 rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
              <span className="text-sm font-medium text-[var(--foreground)]">Updating role...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`
              ${toastMessage.variant === 'destructive'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_50%,black)] text-black'
              }
              border-2 rounded-2xl p-4 shadow-2xl backdrop-blur-sm
            `}
          >
            <h3 className="font-bold text-base mb-1">{toastMessage.title}</h3>
            {toastMessage.description && (
              <p className="text-sm opacity-90">{toastMessage.description}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
