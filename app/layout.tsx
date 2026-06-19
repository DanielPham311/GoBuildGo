import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gobuildgo — Plan your dream desk setup",
  description:
    "Vietnam-focused interactive desk setup planner. Plan, visualize, and shop your dream workspace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
