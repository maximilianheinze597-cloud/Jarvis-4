import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "J.A.R.V.I.S. // Personal AI Assistant",
  description: "Futuristischer persönlicher KI-Assistent mit Groq + Fish Audio",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
