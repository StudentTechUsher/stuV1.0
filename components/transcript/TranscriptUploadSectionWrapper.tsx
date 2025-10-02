"use client";

import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues with client-side hooks
const TranscriptUploadSection = dynamic(() => import('./TranscriptUploadSection'), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">Loading...</div>
});

export default function TranscriptUploadSectionWrapper() {
  return <TranscriptUploadSection />;
}
