'use client';

import { useMemo, useState } from 'react';
import { MessageSquare, Pause, Play, RotateCcw, Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  MiniChatMessage,
  V3GenerationCommandType,
  V3GenerationJobStatus,
} from '@/lib/chatbot/grad-plan/v3/types';

interface MiniChatPanelProps {
  messages: MiniChatMessage[];
  pendingCommand: V3GenerationCommandType | null;
  jobStatus: V3GenerationJobStatus | 'idle';
  disabled?: boolean;
  onCommand: (commandType: 'pause' | 'resume' | 'cancel' | 'retry') => void;
  onSubmitReply: (message: string) => void;
}

function formatTs(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function commandButtonLabel(command: 'pause' | 'resume' | 'cancel' | 'retry'): string {
  if (command === 'pause') return 'Pause';
  if (command === 'resume') return 'Resume';
  if (command === 'cancel') return 'Cancel';
  return 'Retry';
}

function commandIcon(command: 'pause' | 'resume' | 'cancel' | 'retry') {
  if (command === 'pause') return Pause;
  if (command === 'resume') return Play;
  if (command === 'cancel') return Square;
  return RotateCcw;
}

export default function MiniChatPanel({
  messages,
  pendingCommand,
  jobStatus,
  disabled,
  onCommand,
  onSubmitReply,
}: Readonly<MiniChatPanelProps>) {
  const [reply, setReply] = useState('');

  const commandStates = useMemo(() => {
    const isInProgress = jobStatus === 'in_progress' || jobStatus === 'pause_requested' || jobStatus === 'cancel_requested';
    const isPaused = jobStatus === 'paused';
    const isTerminal = jobStatus === 'completed' || jobStatus === 'failed' || jobStatus === 'canceled';

    return {
      pauseDisabled: disabled || !isInProgress,
      resumeDisabled: disabled || !isPaused,
      cancelDisabled: disabled || (isTerminal || jobStatus === 'idle'),
      retryDisabled: disabled || !(jobStatus === 'failed' || jobStatus === 'canceled'),
      replyDisabled: disabled || isTerminal || jobStatus === 'idle' || pendingCommand === 'cancel',
    };
  }, [disabled, jobStatus, pendingCommand]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Mini Chat</p>
          <p className="text-xs text-zinc-600">Reply instructions are queued for the next safe boundary.</p>
        </div>
        <MessageSquare size={15} className="text-zinc-500" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(['pause', 'resume', 'cancel', 'retry'] as const).map((command) => {
          const Icon = commandIcon(command);
          const disabledForCommand =
            command === 'pause'
              ? commandStates.pauseDisabled
              : command === 'resume'
              ? commandStates.resumeDisabled
              : command === 'cancel'
              ? commandStates.cancelDisabled
              : commandStates.retryDisabled;

          const isPending = pendingCommand === command;

          return (
            <button
              key={command}
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition',
                disabledForCommand
                  ? 'cursor-not-allowed border-zinc-200 text-zinc-400'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-400',
                isPending ? 'border-amber-300 bg-amber-50 text-amber-800' : ''
              )}
              disabled={disabledForCommand}
              onClick={() => onCommand(command)}
            >
              <Icon size={12} />
              {commandButtonLabel(command)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50/60 p-2">
        {messages.length === 0 ? (
          <p className="px-2 py-1 text-xs text-zinc-500">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'rounded-lg border px-2.5 py-2 text-xs',
                message.role === 'user'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : message.role === 'agent'
                  ? 'border-sky-200 bg-sky-50 text-sky-900'
                  : 'border-zinc-200 bg-white text-zinc-700'
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
                <span>{message.role}</span>
                <span>{formatTs(message.ts)}</span>
              </div>
              <p className="leading-4">{message.message}</p>
            </div>
          ))
        )}
      </div>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = reply.trim();
          if (!trimmed || commandStates.replyDisabled) return;
          onSubmitReply(trimmed);
          setReply('');
        }}
      >
        <input
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Add guidance for next phase"
          className="h-9 flex-1 rounded-xl border border-zinc-200 px-3 text-sm"
          disabled={commandStates.replyDisabled}
        />
        <button
          type="submit"
          className={cn(
            'inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-xs',
            commandStates.replyDisabled
              ? 'cursor-not-allowed border-zinc-200 text-zinc-400'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
          )}
          disabled={commandStates.replyDisabled}
        >
          <Send size={12} />
          Send
        </button>
      </form>
    </section>
  );
}
