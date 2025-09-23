'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AuthorizationPopup from '@/components/auth/authorization-popup';

export default function AuthorizePage() {
  const [showPopup, setShowPopup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const handleAgree = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Update the user's profile to mark authorization as agreed
      const { error } = await supabase
        .from('profiles')
        .update({
          authorization_agreed: true,
          authorization_agreed_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating authorization:', error);
        alert('Error saving authorization. Please try again.');
        setIsLoading(false);
        return;
      }

      // Redirect to the intended destination
      const next = searchParams.get('next') || '/dashboard';
      router.push(next);
    } catch (error) {
      console.error('Error in handleAgree:', error);
      alert('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    // Sign out the user and redirect to login
    supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthorizationPopup
        isOpen={showPopup}
        onAgree={handleAgree}
        onGoBack={handleGoBack}
        schoolName="BYU" // You can make this dynamic later
      />

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-lg">Processing...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}