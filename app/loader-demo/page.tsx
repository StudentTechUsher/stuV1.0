import { StuLoader } from '@/components/ui/StuLoader';

export default function LoaderDemoPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-brand-bold text-foreground">
            Stu Loading Animation System
          </h1>
          <p className="text-lg text-muted-foreground font-body-medium">
            Preview of all variants and use cases
          </p>
        </div>

        {/* Variant Showcase */}
        <div className="space-y-16">
          {/* PAGE VARIANT */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-header text-foreground mb-2">
                Page Variant
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Large loader (80px) for full-screen or main content loading states
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-12">
              <StuLoader
                variant="page"
                text="Analyzing your coursework & motivations..."
              />
            </div>

            <div className="bg-card border border-border rounded-lg p-12">
              <StuLoader
                variant="page"
                text="Generating personalized career directions..."
              />
            </div>
          </section>

          {/* CARD VARIANT */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-header text-foreground mb-2">
                Card Variant
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Medium loader (48px) for cards, sections, and modals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg min-h-[300px] flex items-center justify-center">
                <StuLoader
                  variant="card"
                  text="Parsing transcript..."
                />
              </div>

              <div className="bg-card border border-border rounded-lg min-h-[300px] flex items-center justify-center">
                <StuLoader
                  variant="card"
                  text="Compiling salary data..."
                />
              </div>

              <div className="bg-card border border-border rounded-lg min-h-[300px] flex items-center justify-center">
                <StuLoader
                  variant="card"
                  text="Analyzing overlaps across minors..."
                />
              </div>

              <div className="bg-card border border-border rounded-lg min-h-[300px] flex items-center justify-center">
                <StuLoader
                  variant="card"
                  text="Gathering salary ranges from entry-level to senior positions..."
                />
              </div>
            </div>
          </section>

          {/* INLINE VARIANT */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-header text-foreground mb-2">
                Inline Variant
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Small loader (20px) for inline use in buttons, lists, and process indicators
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 space-y-6">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded">
                <StuLoader
                  variant="inline"
                  text="Saving changes..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded">
                <StuLoader
                  variant="inline"
                  text="Uploading transcript..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded">
                <StuLoader
                  variant="inline"
                  text="Generating plan..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded">
                <StuLoader
                  variant="inline"
                  text="Processing request..."
                />
              </div>
            </div>
          </section>

          {/* WITHOUT TEXT */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-header text-foreground mb-2">
                Icon Only (No Text)
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Loaders can be used without text for simpler loading states
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8">
              <div className="flex items-center justify-around">
                <StuLoader variant="page" />
                <StuLoader variant="card" />
                <StuLoader variant="inline" />
              </div>
            </div>
          </section>

          {/* CUSTOM SPEEDS */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-header text-foreground mb-2">
                Custom Animation Speeds
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Control animation timing with the speed prop (in seconds)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-4">
                <StuLoader
                  variant="card"
                  text="Fast (1s)"
                  speed={1}
                />
              </div>

              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-4">
                <StuLoader
                  variant="card"
                  text="Normal (2s)"
                  speed={2}
                />
              </div>

              <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-4">
                <StuLoader
                  variant="card"
                  text="Slow (4s)"
                  speed={4}
                />
              </div>
            </div>
          </section>

          {/* REAL WORLD USE CASES */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-header text-foreground mb-2">
                Real-World Use Cases
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                Examples of how the loader will be used throughout the app
              </p>
            </div>

            <div className="space-y-8">
              {/* Pathfinder Process */}
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-header text-foreground">
                  Pathfinder Career Generation
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-primary-15 rounded-lg border-l-4 border-primary">
                    <StuLoader
                      variant="inline"
                      text="Analyzing your academic profile..."
                    />
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg opacity-50">
                    <span className="text-sm font-body text-muted-foreground">
                      Gathering career options...
                    </span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg opacity-50">
                    <span className="text-sm font-body text-muted-foreground">
                      Compiling recommendations...
                    </span>
                  </div>
                </div>
              </div>

              {/* Grad Plan Loading */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-header text-foreground mb-4">
                  Grad Plan Generation
                </h3>
                <StuLoader
                  variant="card"
                  text="Building your personalized graduation plan..."
                />
              </div>

              {/* Dashboard Data Refresh */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-header text-foreground mb-4">
                  Dashboard Refresh
                </h3>
                <div className="space-y-4">
                  <div className="h-24 bg-muted/30 rounded flex items-center justify-center">
                    <StuLoader variant="inline" text="Refreshing academic summary..." />
                  </div>
                  <div className="h-24 bg-muted/30 rounded flex items-center justify-center">
                    <StuLoader variant="inline" text="Loading upcoming events..." />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Dark Mode Preview */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-header text-foreground mb-2">
                Dark Mode Preview
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                The loader adapts seamlessly to dark mode
              </p>
            </div>

            <div className="dark bg-[#18181b] border border-[#27272a] rounded-lg p-12">
              <StuLoader
                variant="page"
                text="Dark mode looks great too!"
              />
            </div>

            <div className="dark bg-[#18181b] border border-[#27272a] rounded-lg p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#27272a] rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                  <StuLoader
                    variant="card"
                    text="Processing your data..."
                  />
                </div>
                <div className="bg-[#27272a] rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                  <StuLoader
                    variant="card"
                    text="Analyzing courses..."
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Info */}
        <div className="mt-16 pt-8 border-t border-border text-center space-y-2">
          <p className="text-sm text-muted-foreground font-body">
            This loading animation system replaces all traditional spinners and skeletons
          </p>
          <p className="text-xs text-muted-foreground font-body">
            Built with CSS animations • Theme-aware • Accessible • Respects reduced motion preferences
          </p>
        </div>
      </div>
    </div>
  );
}
