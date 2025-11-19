'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import WizardFormLayout from '../WizardFormLayout';
import OptionTile from '../OptionTile';

interface TranscriptScreenProps {
  hasCourses: boolean;
  onSubmit: (hasTranscript: boolean, isNewStudent?: boolean) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function TranscriptScreen({
  hasCourses,
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<TranscriptScreenProps>) {
  const [step, setStep] = useState<'initial' | 'upload'>('initial');
  const [selected, setSelected] = useState<'yes' | 'no' | 'new' | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF or Word document');
        return;
      }
      // Validate file size (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10 MB');
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected === 'yes') {
      // Has transcript on file
      onSubmit(true, false);
    } else if (selected === 'no') {
      // Move to upload step
      setStep('upload');
    } else if (selected === 'new') {
      // Brand new student
      onSubmit(false, true);
    }
  };

  const isValid = selected !== null;

  if (step === 'upload') {
    return (
      <WizardFormLayout
        title="Upload your transcript"
        subtitle="This helps us see your completed courses and plan accordingly."
        footerButtons={
          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep('initial');
                setSelected(null);
              }}
              disabled={isLoading}
              className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </Button>
            <Button
              onClick={() => onSubmit(false, false)}
              disabled={isLoading}
              className="px-6 py-2 text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Continuing...' : 'Continue →'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            onClick={handleUploadClick}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file) {
                const syntheticEvent = {
                  target: {
                    files: e.dataTransfer.files,
                  },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleFileChange(syntheticEvent);
              }
            }}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-gray-50"
          >
            {uploadedFile ? (
              <>
                <div className="text-green-600 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-xs text-indigo-600 mt-2 font-medium">
                  Click to change file
                </p>
              </>
            ) : (
              <>
                <Upload className="mx-auto mb-3 text-gray-400" size={32} />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, or DOCX (Max 10 MB)
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Tip:</span> Your transcript should show all courses and grades you've completed.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">No transcript?</span> If you don't have a transcript or any completed classes, you can just click Continue and we'll help you build your plan from scratch.
            </p>
          </div>
        </div>
      </WizardFormLayout>
    );
  }

  // Initial step - ask if they have transcript
  return (
    <WizardFormLayout
      title="Do you have a transcript on file?"
      subtitle="This helps us see what you've already completed."
      footerButtons={
        <div className="flex gap-3 justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-2 text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="px-6 py-2 text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <OptionTile
          title="Yes, I have one"
          description="I have a transcript uploaded"
          selected={selected === 'yes'}
          onClick={() => setSelected('yes')}
          disabled={isLoading}
        />
        <OptionTile
          title="No, I don't have one"
          description="I'll upload my transcript"
          selected={selected === 'no'}
          onClick={() => setSelected('no')}
          disabled={isLoading}
        />
        {!hasCourses && (
          <OptionTile
            title="I'm a brand new student"
            description="I have no prior credits"
            selected={selected === 'new'}
            onClick={() => setSelected('new')}
            disabled={isLoading}
          />
        )}
      </form>
    </WizardFormLayout>
  );
}
