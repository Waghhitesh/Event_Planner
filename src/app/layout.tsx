import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EventPulse AI — Smart Event Planning",
    template: "%s | EventPulse AI",
  },
  description:
    "AI-powered event orchestration for weddings, birthdays, and community gatherings. Get complete budgets, timelines, vendor checklists, and personalised ideas instantly.",
  authors: [{ name: "EventPulse AI", url: "https://github.com/Waghhitesh/Event_Planner" }],
  openGraph: {
    title: "EventPulse AI — Smart Event Planning",
    description:
      "AI-powered event planning for weddings, birthdays, and community gatherings using Google Gemini Flash.",
    type: "website",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms;
              animation-iteration-count: 1;
              transition-duration: 0.01ms;
              scroll-behavior: auto;
            }
          }
          @media print {
            header, footer, [data-print-hidden] { display: none; }
            body { background: #ffffff; color: #000000; font-size: 12pt; }
            a[href]::after { content: " (" attr(href) ")"; font-size: 9pt; color: #555; }
          }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
