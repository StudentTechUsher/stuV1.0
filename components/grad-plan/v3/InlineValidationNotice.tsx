'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ValidationTone = 'info' | 'warn' | 'error' | 'success';

interface InlineValidationNoticeProps {
  tone?: ValidationTone;
  title: string;
  message: string;
}

const noticeConfig: Record<ValidationTone, { icon: typeof Info; classes: string }> = {
  info: {
    icon: Info,
    classes: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  warn: {
    icon: AlertTriangle,
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  error: {
    icon: AlertCircle,
    classes: 'border-red-200 bg-red-50 text-red-800',
  },
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
};

export default function InlineValidationNotice({
  tone = 'info',
  title,
  message,
}: Readonly<InlineValidationNoticeProps>) {
  const config = noticeConfig[tone];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-3 py-2 text-sm', config.classes)}>
      <Icon size={16} className="mt-0.5" />
      <div>
        <p className="font-semibold leading-5">{title}</p>
        <p className="mt-0.5 text-xs leading-5 opacity-90">{message}</p>
      </div>
    </div>
  );
}
