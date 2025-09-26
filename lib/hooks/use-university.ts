'use client';

import { useEffect, useState } from 'react';
import { University } from '@/lib/types/university';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function useUniversity() {
  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const loadUniversity = async () => {
      try {
        // Parse subdomain from current URL
        const host = window.location.host;
        const subdomain = parseSubdomain(host);

        const { data: universityData, error } = await supabase
          .from('university')
          .select('*')
          .eq('subdomain', subdomain)
          .single();

        if (error) {
          console.error('Error loading university:', error);
        } else {
          setUniversity(universityData);
        }
      } catch (error) {
        console.error('Error parsing university data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUniversity();
  }, [supabase]);

  const parseSubdomain = (host: string): string => {
    const parts = host.split('.');
    if (parts.length > 2 || (parts.length === 2 && !parts[0].includes('localhost'))) {
      return parts[0] === 'www' ? 'stu' : parts[0];
    }
    return 'stu'; // default for localhost
  };

  return { university, loading };
}