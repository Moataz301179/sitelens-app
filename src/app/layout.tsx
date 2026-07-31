import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteLens — Multi-agent website audit",
  description:
    "Assess any website through a pipeline of expert AI agents: market analysis, idea validation, UX/UI scoring, security, QA, corrective prompts, design concepts and a tool finder.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230F1113'/%3E%3Ccircle cx='14.5' cy='14.5' r='7' fill='none' stroke='%23C8F169' stroke-width='2.6'/%3E%3Cline x1='19.8' y1='19.8' x2='25.5' y2='25.5' stroke='%23C8F169' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E"
        />
      </head>
      <body className="min-h-screen bg-bg text-ink">{children}</body>
    </html>
  );
}
