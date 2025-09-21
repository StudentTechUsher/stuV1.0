import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./stuV1.0/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          light: "#7dffc1",
          hover: "#0ed676",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        mint: {
          DEFAULT: "#12F987",
          hover: "#0ed676",
          light: "#7dffc1",
          50: "#f2fff7",
          100: "#e6ffef",
          200: "#bfffdb",
          300: "#7dffc1",
          400: "#12F987",
          500: "#0ed676",
          600: "#00b861",
          700: "#009250",
          800: "#006e3d",
          900: "#00522e",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.7s ease-out both",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    function ({ addUtilities, theme }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void, theme: (path: string) => unknown }) {
      const mintColors = theme('colors.mint') as Record<string, string>;
      const utilities: Record<string, Record<string, string>> = {};

      Object.entries(mintColors).forEach(([key, value]) => {
        utilities[`.border-mint-${key}/20`] = {
          borderColor: `${value}33`
        };
        utilities[`.bg-mint-${key}/20`] = {
          backgroundColor: `${value}33`
        };
        utilities[`.text-mint-${key}/20`] = {
          color: `${value}33`
        };
      });

      addUtilities(utilities);
    }
  ],
}

export default config