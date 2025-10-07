'use client';

import React, { useState } from 'react';
import StuLoadingAnimation, { StuLoadingOverlay } from '@/components/ui/StuLoadingAnimation';
import { Button } from '@/components/ui/button';

/**
 * Demo page for the STU Loading Animation
 * Shows different sizes and usage examples
 */
export default function LoadingDemoPage() {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleShowOverlay = () => {
    setShowOverlay(true);
    // Auto-hide after 3 seconds for demo purposes
    setTimeout(() => setShowOverlay(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            STU Loading Animation Demo
          </h1>
          <p className="text-muted-foreground">
            A professional loading animation featuring the STU graduation cap logo
          </p>
        </div>

        {/* Size Variations */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Size Variations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center bg-card p-8 rounded-lg border border-border">
            <div className="text-center space-y-2">
              <StuLoadingAnimation size={40} />
              <p className="text-xs text-muted-foreground">Small (40px)</p>
            </div>
            <div className="text-center space-y-2">
              <StuLoadingAnimation size={60} />
              <p className="text-xs text-muted-foreground">Medium (60px)</p>
            </div>
            <div className="text-center space-y-2">
              <StuLoadingAnimation size={80} />
              <p className="text-xs text-muted-foreground">Default (80px)</p>
            </div>
            <div className="text-center space-y-2">
              <StuLoadingAnimation size={120} />
              <p className="text-xs text-muted-foreground">Large (120px)</p>
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Usage Examples</h2>

          {/* Inline Loading */}
          <div className="bg-card p-6 rounded-lg border border-border space-y-4">
            <h3 className="text-lg font-medium">Inline Loading State</h3>
            <div className="flex items-center gap-4">
              <StuLoadingAnimation size={32} />
              <span className="text-muted-foreground">Loading your graduation plan...</span>
            </div>
          </div>

          {/* Card Loading */}
          <div className="bg-card p-6 rounded-lg border border-border space-y-4">
            <h3 className="text-lg font-medium">Card Center Loading</h3>
            <div className="h-48 flex items-center justify-center bg-muted rounded-md">
              <StuLoadingAnimation size={60} />
            </div>
          </div>

          {/* Full Page Overlay Demo */}
          <div className="bg-card p-6 rounded-lg border border-border space-y-4">
            <h3 className="text-lg font-medium">Full Page Overlay</h3>
            <p className="text-sm text-muted-foreground">
              Click the button to see a full-page loading overlay (auto-dismisses after 3 seconds)
            </p>
            <Button onClick={handleShowOverlay} className="font-body-semi">
              Show Overlay Demo
            </Button>
          </div>
        </section>

        {/* Dark Mode Test */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Dark Background Test</h2>
          <div className="bg-zinc-900 p-8 rounded-lg flex items-center justify-center">
            <StuLoadingAnimation size={100} />
          </div>
        </section>

        {/* Usage Code */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Usage</h2>
          <div className="bg-zinc-900 text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>{`// Basic usage
import StuLoadingAnimation from '@/components/ui/StuLoadingAnimation';

<StuLoadingAnimation size={80} />

// Full-page overlay
import { StuLoadingOverlay } from '@/components/ui/StuLoadingAnimation';

{isLoading && <StuLoadingOverlay />}

// Inline with text
<div className="flex items-center gap-4">
  <StuLoadingAnimation size={32} />
  <span>Loading...</span>
</div>`}</pre>
          </div>
        </section>
      </div>

      {/* Overlay Demo */}
      {showOverlay && <StuLoadingOverlay size={120} />}
    </div>
  );
}
