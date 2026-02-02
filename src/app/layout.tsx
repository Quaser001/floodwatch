import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FloodWatch Guwahati | Community Flood Alert System",
  description: "Near-real-time urban flood and drain overflow alert system for Guwahati. Citizens as sensors. Rule-based alerts. Community-driven.",
  keywords: ["flood alert", "Guwahati", "urban resilience", "SDG-13", "community", "disaster response"],
  authors: [{ name: "FloodWatch Team" }],
  openGraph: {
    title: "FloodWatch Guwahati",
    description: "Community-driven flood alert system for Guwahati",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌊</text></svg>" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
