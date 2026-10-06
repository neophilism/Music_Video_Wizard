import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Video Wizard",
  description: "Direct, generate, compile, refine, and render complete music videos."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
