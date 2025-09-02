import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scribe Documentation",
  description: "Comprehensive documentation for the Scribe MCP crowd-sourced documentation system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}