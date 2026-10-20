import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventPulse AI — Enterprise Event Orchestration Engine",
  description: "AI-powered event planning for weddings, birthdays, and community gatherings using Google Gemini 1.5 Flash.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
