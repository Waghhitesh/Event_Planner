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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
