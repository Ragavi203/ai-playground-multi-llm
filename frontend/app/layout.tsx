import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI Playground – Multi-LLM Arena",
  description: "Run prompts across multiple LLMs, compare responses, and see what wins."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}


