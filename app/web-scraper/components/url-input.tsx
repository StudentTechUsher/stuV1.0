'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface UrlInputProps {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
}

export function UrlInput({ urls, onUrlsChange }: UrlInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const addUrl = () => {
    if (!input.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(input.trim());
      if (urls.includes(input.trim())) {
        setError('This URL is already added');
        return;
      }
      onUrlsChange([...urls, input.trim()]);
      setInput('');
      setError('');
    } catch {
      setError('Invalid URL format. Please enter a valid URL.');
    }
  };

  const removeUrl = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addUrl();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input Section */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add URLs</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="url"
              placeholder="Paste a URL containing educational institutions..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
            />
          </div>
          <Button
            onClick={addUrl}
            variant="default"
            size="sm"
            className="w-full sm:w-auto rounded-lg font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add URL
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* URLs List */}
      {urls.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              URLs to scrape
            </label>
            <span className="text-xs font-semibold text-foreground bg-primary/10 px-2.5 py-1 rounded-full">
              {urls.length}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {urls.map((url, index) => (
              <div
                key={index}
                className="group flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/30 hover:bg-muted/60 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <LinkIcon className="w-4 h-4 text-primary/60 flex-shrink-0" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate underline-offset-2"
                    title={url}
                  >
                    {url}
                  </a>
                </div>
                <button
                  onClick={() => removeUrl(index)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Remove URL"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
