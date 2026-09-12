import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SahiBhada — Fair Auto-Rickshaw Fares",
  description:
    "Crowdsourced auto-rickshaw fare transparency for India. Check the fair-market fare before you ride, report what you paid after — no login required.",
  keywords: [
    "auto rickshaw fare",
    "rickshaw fare calculator",
    "fair fare India",
    "SahiBhada",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-100 text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
