import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perfext — make perfect texts",
  description:
    "Perfext is a browser extension that suggests improvements to your writing as you type, Grammarly-style, powered by the AI model of your choice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
