import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Courtyard | Premium Pack Opening Experience",
  description: "Open mystery packs and discover rare collectibles from our vault. Every item is real, verified, and ready to ship.",
  keywords: ["collectibles", "mystery packs", "trading cards", "vault", "graded cards"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-border bg-surface py-8">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-text-secondary text-sm">
                    © {new Date().getFullYear()} Courtyard. All rights reserved.
                  </p>
                  <div className="flex gap-6 text-sm text-text-secondary">
                    <a href="#" className="hover:text-foreground transition-colors">
                      Terms
                    </a>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Privacy
                    </a>
                    <a href="#" className="hover:text-foreground transition-colors">
                      Support
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
