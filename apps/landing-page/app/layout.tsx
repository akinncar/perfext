import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perfext — Make Perfect Texts",
  description:
    "Perfext is a browser extension that uses AI to improve your writing skills, suggesting improvements as you type, powered by the AI model of your choice.",
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
