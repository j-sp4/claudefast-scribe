import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

// Initialize logging on server startup
if (typeof window === 'undefined') {
  import('@/lib/startup-logger');
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scribe MCP - Crowd-Sourced Documentation",
  description: "Collaborative documentation platform with MCP integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
