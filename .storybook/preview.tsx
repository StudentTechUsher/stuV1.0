import type { Preview } from '@storybook/react';
// import { withThemeByClassName } from '@storybook/addon-themes'; // TODO: Need v10 addon
import { withUniversityTheme } from './decorators/theme-decorator';
import { withMuiTheme } from './decorators/mui-decorator';
import '../app/globals.css';

const isStorybook =
  typeof window !== 'undefined' &&
  (
    // Common Storybook globals (set early in preview)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__STORYBOOK_PREVIEW__ ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__STORYBOOK_STORY_STORE__ ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__STORYBOOK_ADDONS_CHANNEL__
  );

const mockPrograms = {
  major: [
    { id: '101', name: 'Computer Science', program_type: 'major', priority: 1 },
    { id: '102', name: 'Business Analytics', program_type: 'major', priority: 2 },
  ],
  minor: [
    { id: '201', name: 'Psychology', program_type: 'minor', priority: 1 },
  ],
  gen_ed: [
    { id: '301', name: 'General Education', program_type: 'general_education', priority: 1 },
  ],
  honors: [
    { id: '401', name: 'Honors Program', program_type: 'honors', priority: 1 },
  ],
  graduate: [
    { id: '501', name: 'MBA', program_type: 'graduate', priority: 1 },
  ],
};

const buildJsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const buildStreamResponse = (payload: unknown) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const chunk = `data: ${JSON.stringify({
        choices: [{ delta: { content: JSON.stringify(payload) } }],
      })}\n\n`;
      controller.enqueue(encoder.encode(chunk));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
};

if (isStorybook && typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(window as any).__STORYBOOK_FETCH_MOCKED__) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__STORYBOOK_FETCH_MOCKED__ = true;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const parsed = new URL(url, base);

      if (!parsed.pathname.startsWith('/api/')) {
        return originalFetch(input, init);
      }

      // Programs catalog
      if (parsed.pathname === '/api/programs') {
        const type = parsed.searchParams.get('type') ?? 'major';
        const key = type === 'graduate_no_gen_ed' ? 'graduate' : type;
        const payload = (mockPrograms as Record<string, unknown[]>)[key] ?? [];
        return buildJsonResponse(payload);
      }

      if (parsed.pathname === '/api/programs/batch') {
        const ids = (parsed.searchParams.get('ids') || '').split(',').filter(Boolean);
        const allPrograms = Object.values(mockPrograms).flat();
        const payload = ids.map((id) => {
          const match = allPrograms.find((program) => (program as { id: string }).id === id);
          return match ?? { id, name: `Program ${id}`, program_type: 'major' };
        });
        return buildJsonResponse(payload);
      }

      if (parsed.pathname === '/api/programs/student-types') {
        return buildJsonResponse({
          undergraduate: true,
          graduate: true,
          honors: true,
        });
      }

      // Student planning data
      if (parsed.pathname === '/api/student/planning-data') {
        if (init?.method && init.method.toUpperCase() !== 'GET') {
          return buildJsonResponse({ success: true });
        }
        return buildJsonResponse({
          data: {
            est_grad_date: '2028-05-01',
            est_grad_term: 'Spring',
            admission_year: 2024,
            student_type: 'undergraduate',
            career_goals: 'Data Science',
            is_transfer: 'freshman',
          },
        });
      }

      if (parsed.pathname === '/api/transcript/parse') {
        return buildJsonResponse({
          success: true,
          report: {
            courses_found: 2,
            terms_detected: ['Fall 2024'],
            used_byu_parser: false,
            validation_report: { invalidCourses: 0 },
          },
        });
      }

      // Active feedback stream (minimal happy path)
      if (parsed.pathname === '/api/grad-plan/active-feedback/stream') {
        return buildStreamResponse({
          plan: [
            {
              term: 'Fall',
              courses: [{ code: 'CS 101', title: 'Intro to CS', credits: 3 }],
            },
          ],
        });
      }

      // Default: return empty JSON for unhandled API routes
      return buildJsonResponse({});
    };
  }
}

// Font configuration (replicate from layout.tsx)
// Note: In Storybook, we reference the fonts from the staticDirs
const fontStyles = `
  @font-face {
    font-family: 'Geist Sans';
    src: url('/fonts/Geist-Variable.woff2') format('woff2');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Geist Mono';
    src: url('/fonts/GeistMono-Variable.woff2') format('woff2');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  :root {
    --font-geist-sans: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-geist-mono: 'Geist Mono', 'Courier New', monospace;
  }

  body {
    font-family: var(--font-geist-sans);
  }
`;

// Inject font styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fontStyles;
  document.head.appendChild(style);
}

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a1f1a' },
        { name: 'mint-tint', value: '#f0fdf9' },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
  },
  globalTypes: {
    universityTheme: {
      description: 'University theme color preset',
      defaultValue: 'STU Mint (Default)',
      toolbar: {
        title: 'University Theme',
        icon: 'paintbrush',
        items: [
          { value: 'STU Mint (Default)', title: 'STU Mint (Default)' },
          { value: 'Custom Blue', title: 'Custom Blue' },
          { value: 'Custom Purple', title: 'Custom Purple' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    withMuiTheme,
    withUniversityTheme,
    // TODO: Re-enable when addon-themes v10 is available
    // withThemeByClassName({
    //   themes: {
    //     light: '',
    //     dark: 'dark',
    //   },
    //   defaultTheme: 'light',
    //   }),
  ],
};

export default preview;
