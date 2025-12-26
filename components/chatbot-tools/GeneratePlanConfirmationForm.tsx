'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Edit } from 'lucide-react';

interface GeneratePlanConfirmationFormProps {
  onSubmit: (data: { confirmed: boolean }) => void;
}

export default function GeneratePlanConfirmationForm({
  onSubmit,
}: Readonly<GeneratePlanConfirmationFormProps>) {
  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles size={20} className="text-primary" />
          Ready to Generate Your Graduation Plan?
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          I've collected all the information needed to create your personalized graduation plan.
          This plan will organize your courses into semesters, taking into account your goals,
          preferences, and any constraints you've mentioned.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => onSubmit({ confirmed: true })}
          className="w-full bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 gap-2 justify-start shadow-lg"
        >
          <ArrowRight size={18} />
          Yes, generate my plan!
        </Button>

        <Button
          onClick={() => onSubmit({ confirmed: false })}
          variant="outline"
          className="w-full gap-2 justify-start border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Edit size={18} />
          Let me review my information first
        </Button>
      </div>
    </div>
  );
}
