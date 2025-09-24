'use client';

import { useRef } from 'react';
import Button from '@mui/material/Button';

interface StartDialogProps {
  onClose: () => void;
}

export default function StartDialog({ onClose }: Readonly<StartDialogProps>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onUploadClick = () => fileInputRef.current?.click();
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = () => onClose();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-[92vw] max-w-xl rounded-2xl bg-white !p-8 shadow-2xl ring-1 ring-zinc-200">
        <h2 className="text-2xl font-semibold tracking-tight">Start planning</h2>

        <p className="text-zinc-600 mt-3 mb-6 text-base leading-relaxed">
          Upload your most up-to-date transcript or continue without one.
          <span className="opacity-80"> (This is a mock—either option proceeds.)</span>
        </p>

        <div className="mt-8 grid gap-4">
          {/* Primary */}
          <Button
            fullWidth
            variant="contained"
            disableElevation
            onClick={onUploadClick}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              py: 1.5,
              px: 2.5,
              bgcolor: '#ffffff',
              color: '#0A0A0A',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              '&:hover': {
                bgcolor: 'var(--primary)',
                borderColor: 'var(--primary)',
                color: '#000000',
                boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
              },
              '&:focus-visible': {
                outline: '2px solid var(--primary)',
                outlineOffset: '2px',
              },
            }}
          >
            Upload transcript (PDF/PNG/JPG)
          </Button>

          {/* Secondary */}
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              py: 1.5,
              px: 2.5,
              color: '#0A0A0A',
              borderColor: 'rgba(18,249,135,0.7)',
              '&:hover': {
                bgcolor: 'rgba(18,249,135,0.10)',
                borderColor: 'var(--primary)',
              },
              '&:focus-visible': {
                outline: '2px solid var(--primary)',
                outlineOffset: '2px',
              },
            }}
          >
            I don&apos;t have a transcript for this university
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
    </div>
  );
}
