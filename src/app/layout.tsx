import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SupaClone - Enterprise Supabase Project Cloner",
  description: "100% accurate cloning and migration of Supabase projects with enterprise-grade features",
  keywords: ["Supabase", "database", "migration", "cloning", "backup", "enterprise"],
  authors: [{ name: "SupaClone Team" }],
  creator: "SupaClone",
  publisher: "SupaClone",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
