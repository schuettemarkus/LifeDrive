import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#0A0A0F",
          raised: "#101018",
          sunken: "#06060A",
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
          subtle: "rgba(255,255,255,0.03)",
          border: "rgba(255,255,255,0.08)",
        },
        accent: {
          violet: "#7C5CFF",
          cyan: "#00D4FF",
          warm: "#FF8A5B",
          gold: "#FFC542",
        },
        area: {
          family: "#FF6B6B",
          health: "#2DD4A7",
          home: "#FFB020",
          career: "#3B9EFF",
          money: "#34D399",
          growth: "#A78BFA",
          creative: "#F472B6",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        glass: "24px",
        pill: "999px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.45)",
        "glass-lg": "0 16px 48px rgba(0,0,0,0.55)",
        glow: "0 0 32px rgba(124,92,255,0.35)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #7C5CFF 0%, #00D4FF 100%)",
        "warm-gradient": "linear-gradient(135deg, #FF8A5B 0%, #FFC542 100%)",
        mesh: "radial-gradient(60% 50% at 30% 10%, rgba(124,92,255,0.18) 0%, transparent 60%), radial-gradient(50% 40% at 80% 80%, rgba(0,212,255,0.10) 0%, transparent 60%), radial-gradient(80% 60% at 50% 100%, rgba(20,8,40,0.6) 0%, #0A0A0F 80%)",
      },
      backdropBlur: {
        glass: "20px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
