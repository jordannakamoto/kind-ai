import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { ConversationProvider } from "./contexts/ConversationContext";
import { GoalCompletionProvider } from "./contexts/GoalCompletionContext";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kind",
  description: "Your AI Therapist",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConversationProvider>
          <GoalCompletionProvider>
            {children}
          </GoalCompletionProvider>
        </ConversationProvider>
      </body>
    </html>
  );
}