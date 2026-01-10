"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui";
import { Package, User, LogOut, Menu, X, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Navbar Component
 * 
 * Main navigation bar for the customer site
 */

export function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isLoading = status === "loading";

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Package className="h-6 w-6 text-background" />
            </div>
            <span className="text-xl font-bold text-foreground">Courtyard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-text-secondary hover:text-foreground transition-colors"
            >
              Packs
            </Link>
            <Link
              href="/marketplace"
              className="text-text-secondary hover:text-foreground transition-colors"
            >
              Marketplace
            </Link>
            {session && (
              <Link
                href="/vault"
                className="text-text-secondary hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Wallet className="h-4 w-4" />
                Vault
              </Link>
            )}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <div className="h-10 w-24 animate-shimmer rounded-lg" />
            ) : session ? (
              <div className="flex items-center gap-4">
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {session.user?.name || session.user?.email?.split("@")[0]}
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => signOut()}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-surface"
          >
            <div className="px-4 py-4 space-y-4">
              <Link
                href="/"
                className="block text-text-secondary hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Packs
              </Link>
              <Link
                href="/marketplace"
                className="block text-text-secondary hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Marketplace
              </Link>
              {session && (
                <Link
                  href="/vault"
                  className="block text-text-secondary hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Vault
                </Link>
              )}
              <hr className="border-border" />
              {session ? (
                <>
                  <Link
                    href="/profile"
                    className="block text-text-secondary hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    className="block text-error hover:text-red-400"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;




