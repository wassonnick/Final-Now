import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#F8FAFC",
          100: "#EEF4FF",
          200: "#DDE8FA",
          300: "#C4D7F5",
          400: "#8FB0EA",
          500: "#5F8EE8",
          600: "#4F7DF3",
          700: "#315CC7",
          800: "#183B82",
          900: "#0F172A",
          950: "#080F1F",
        },
        ivory: {
          50: "#FFFFFF",
          100: "#FAF8F5",
          200: "#F5F2ED",
          300: "#EFE9E1",
          400: "#E8DED2",
          500: "#D9C9B7",
        },
        gold: {
          50: "#FFF9E8",
          100: "#F8EBC2",
          200: "#EDD481",
          300: "#DDB64A",
          400: "#C99A24",
          500: "#B8860B",
          600: "#916609",
          700: "#704C0B",
          800: "#51370D",
          900: "#36250A",
        },
        score: {
          excellent: "#22c55e",
          good: "#84cc16",
          average: "#eab308",
          poor: "#ef4444",
        },
        // Redesign tokens (see design_handoff_societyflats/01-design-system.md).
        // Namespaced separately from navy/ivory/gold so the legacy palette keeps working
        // on pages that haven't been rebuilt yet.
        paper: {
          DEFAULT: "#F8F3EA",
          alt: "#F6F1E8",
          cream: "#FFFBF3",
          sage: "#DDE7DC",
          chip: "#F1ECE1",
        },
        pine: {
          DEFAULT: "#123C32",
          press: "#0F3B2E",
          link: "#2A6147",
        },
        clay: {
          DEFAULT: "#C2724E",
          deep: "#B86F4B",
        },
        rdtext: {
          DEFAULT: "#25302B",
          forest: "#10251F",
          muted: "#6E756E",
          faint: "#8A8F89",
        },
        rdborder: "#E7DCCB",
        trust: {
          green: "#1F7A5A",
          bg: "#E4F0E6",
        },
        rdstar: "#D9A21B",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Playfair Display', 'DM Sans', 'ui-serif', 'Georgia', 'serif'],
        // Redesign typography (design_handoff_societyflats/01-design-system.md).
        grotesk: ['Hanken Grotesk', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        newsreader: ['Newsreader', 'Playfair Display', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.08)',
        apple: '0 24px 80px rgba(79, 125, 243, 0.14)',
        premium: '0 24px 80px rgba(10, 22, 40, 0.12)',
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { transform: "translateY(10px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
