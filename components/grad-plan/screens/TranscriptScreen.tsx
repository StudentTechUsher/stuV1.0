'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';
import OptionTile from '../OptionTile';
import TranscriptUpload from '@/components/transcript/TranscriptUpload';

interface TranscriptScreenProps {
  hasCourses: boolean;
  onSubmit: (hasTranscript: boolean, isNewStudent?: boolean, transcriptParsed?: boolean) => void;
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
  const [transcriptParsed, setTranscriptParsed] = useState(false);

  const handleParsingComplete = async () => {
    setTranscriptParsed(true);
    // Auto-advance to next step after successful parsing
    setTimeout(() => {
      onSubmit(false, false, true);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected === 'yes') {
      // Has transcript on file
      onSubmit(true, false, undefined);
    } else if (selected === 'no') {
      // Move to upload step
      setStep('upload');
    } else if (selected === 'new') {
      // Brand new student
      onSubmit(false, true, undefined);
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
              variant="secondary"
              onClick={() => {
                setStep('initial');
                setSelected(null);
                setTranscriptParsed(false);
              }}
              disabled={isLoading || transcriptParsed}
            >
              ← Back
            </Button>
            {transcriptParsed && (
              <Button
                variant="primary"
                onClick={() => onSubmit(false, false, true)}
                disabled={isLoading}
              >
                {isLoading ? 'Continuing...' : 'Continue →'}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {/* Use the TranscriptUpload component */}
          <TranscriptUpload
            onTextExtracted={(text) => {
              console.log('Extracted transcript text:', text);
            }}
            onParsingComplete={handleParsingComplete}
          />

          {!transcriptParsed && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Tip:</span> Your transcript should show all courses and grades you've completed.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">No transcript?</span> You can go back and skip this step to build your plan from scratch.
                </p>
              </div>
            </>
          )}
        </div>
      </WizardFormLayout>
    );
  }

  // Initial step - different prompts based on whether user has courses
  if (hasCourses) {
    // User already has courses - ask if they want to update
    return (
      <WizardFormLayout
        title="Update your transcript?"
        subtitle="We found courses on your record. Would you like to upload a new version of your transcript to update your completed courses?"
        footerButtons={
          <div className="flex gap-3 justify-between">
            <Button
              variant="secondary"
              onClick={onBack}
              disabled={isLoading}
            >
              ← Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Continuing...' : 'Continue →'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <OptionTile
            title="Yes, upload new transcript"
            description="I have an updated transcript to upload"
            selected={selected === 'no'}
            onClick={() => setSelected('no')}
            disabled={isLoading}
          />
          <OptionTile
            title="No, use existing courses"
            description="Continue with courses already on file"
            selected={selected === 'yes'}
            onClick={() => setSelected('yes')}
            disabled={isLoading}
          />
        </form>
      </WizardFormLayout>
    );
  }

  // User has no courses - ask if they want to upload
  return (
    <WizardFormLayout
      title="Upload a transcript?"
      subtitle="Would you like to upload a transcript to include your completed courses in your graduation plan?"
      footerButtons={
        <div className="flex gap-3 justify-between">
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={isLoading}
          >
            ← Back
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <OptionTile
          title="Yes, upload transcript"
          description="I have completed courses to include"
          selected={selected === 'no'}
          onClick={() => setSelected('no')}
          disabled={isLoading}
        />
        <OptionTile
          title="No, I'm a new student"
          description="I have no prior credits"
          selected={selected === 'new'}
          onClick={() => setSelected('new')}
          disabled={isLoading}
        />
      </form>
    </WizardFormLayout>
  );
}
