"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Client-side Providers
 * 
 * Wraps the application with necessary providers:
 * - NextAuth SessionProvider for authentication
 */

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

export default Providers;


