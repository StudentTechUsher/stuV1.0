'use client';

import { useState } from 'react';

import { GraduationCap, BookOpen } from 'lucide-react';
import { StudentTypeInput, getStudentTypeDescription } from '@/lib/chatbot/tools/studentTypeTool';

interface StudentTypeFormProps {
  onSubmit: (data: StudentTypeInput) => void;
}

export default function StudentTypeForm({
  onSubmit,
}: Readonly<StudentTypeFormProps>) {
  const [selectedType, setSelectedType] = useState<'undergraduate' | 'graduate' | null>(null);

  const handleSelect = (type: 'undergraduate' | 'graduate') => {
    setSelectedType(type);
    // Small delay for visual feedback
    setTimeout(() => {
      onSubmit({ studentType: type });
    }, 300);
  };

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Student Type</h3>
        <p className="text-sm text-muted-foreground">
          Are you pursuing an undergraduate or graduate degree?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Undergraduate Option */}
        <button
          onClick={() => handleSelect('undergraduate')}
          className={`
            relative p-6 border-2 rounded-xl transition-all duration-200
            hover:border-[var(--primary)] hover:shadow-md
            ${selectedType === 'undergraduate'
              ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-md'
              : 'border-border bg-background'
            }
            text-zinc-900 dark:text-zinc-100
          `}
          disabled={selectedType !== null}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${selectedType === 'undergraduate'
                ? 'bg-[var(--primary)] text-primary-foreground'
                : 'bg-muted text-muted-foreground'
              }
            `}>
              <BookOpen size={32} />
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-1">Undergraduate</h4>
              <p className="text-sm text-muted-foreground">
                {getStudentTypeDescription('undergraduate')}
              </p>
            </div>
          </div>
        </button>

        {/* Graduate Option */}
        <button
          onClick={() => handleSelect('graduate')}
          className={`
            relative p-6 border-2 rounded-xl transition-all duration-200
            hover:border-[var(--primary)] hover:shadow-md
            ${selectedType === 'graduate'
              ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-md'
              : 'border-border bg-background'
            }
            text-zinc-900 dark:text-zinc-100
          `}
          disabled={selectedType !== null}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${selectedType === 'graduate'
                ? 'bg-[var(--primary)] text-primary-foreground'
                : 'bg-muted text-muted-foreground'
              }
            `}>
              <GraduationCap size={32} />
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-1">Graduate</h4>
              <p className="text-sm text-muted-foreground">
                {getStudentTypeDescription('graduate')}
              </p>
            </div>
          </div>
        </button>
      </div>

      {selectedType && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Processing your selection...
        </div>
      )}
    </div>
  );
}
