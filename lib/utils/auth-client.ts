'use client';

/**
 * Client-side helper to sign out a user via the sign-out route handler
 * Properly clears server-side session cookies
 */
export async function signOut() {
  try {
    const response = await fetch('/auth/sign-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('Sign out failed:', data.error);
      return { success: false, error: data.error || 'Failed to sign out' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error during sign out:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign out',
    };
  }
}
