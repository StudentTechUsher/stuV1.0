'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
}

interface GeneratingPlanScreenProps {
  initialMessage?: string;
}

export default function GeneratingPlanScreen({
  initialMessage = 'Building your personalized graduation plan...',
}: Readonly<GeneratingPlanScreenProps>) {
  const [steps, setSteps] = useState<ProgressStep[]>([
    { id: '1', label: 'Gathering your information', completed: false },
    { id: '2', label: 'Analyzing degree requirements', completed: false },
    { id: '3', label: 'Organizing courses into semesters', completed: false },
    { id: '4', label: 'Finalizing your plan', completed: false },
  ]);

  // Animate step completion
  useEffect(() => {
    const delays = [500, 1500, 2500, 3500];
    const timers = delays.map((delay, index) =>
      setTimeout(() => {
        setSteps(prev => {
          const newSteps = [...prev];
          if (newSteps[index]) {
            newSteps[index] = { ...newSteps[index], completed: true };
          }
          return newSteps;
        });
      }, delay)
    );

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  return (
    <div className="w-full space-y-8">
      {/* Title Section */}
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">
          {initialMessage}
        </h2>
      </div>

      {/* Animated Spinner */}
      <div className="flex justify-center py-8">
        <div className="relative w-16 h-16">
          {/* Outer rotating circle */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
            style={{
              borderTopColor: 'var(--primary)',
              borderRightColor: 'var(--primary)',
              animationDuration: '2s'
            }}
          />
          {/* Center circle */}
          <div className="absolute inset-4 rounded-full border-4 border-gray-200" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 pt-1">
              {step.completed ? (
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Circle size={24} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Label and Animation */}
            <div className="flex-1">
              <p
                className={`text-sm font-medium transition-all ${
                  step.completed ? 'text-green-700' : 'text-gray-700'
                }`}
              >
                {step.label}
              </p>
              {!step.completed && index === steps.findIndex(s => !s.completed) && (
                <div className="flex gap-1 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Text */}
      <p className="text-sm text-gray-600 text-center">
        This usually takes 30-60 seconds. You'll be redirected automatically when complete.
      </p>
    </div>
  );
}
