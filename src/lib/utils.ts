import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge to handle conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100); // Assuming amounts are in cents
}

/**
 * Format date to human readable string
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Get tier color class
 */
export function getTierColorClass(tierName: string): string {
  const tierColors: Record<string, string> = {
    legendary: "text-tier-legendary",
    epic: "text-tier-epic",
    rare: "text-tier-rare",
    common: "text-tier-common",
  };
  return tierColors[tierName.toLowerCase()] || "text-text-secondary";
}

/**
 * Get tier glow class
 */
export function getTierGlowClass(tierName: string): string {
  const tierGlows: Record<string, string> = {
    legendary: "glow-legendary",
    epic: "glow-epic",
    rare: "glow-rare",
    common: "glow-common",
  };
  return tierGlows[tierName.toLowerCase()] || "";
}

/**
 * Get tier background color
 */
export function getTierBgClass(tierName: string): string {
  const tierBgs: Record<string, string> = {
    legendary: "bg-tier-legendary/20",
    epic: "bg-tier-epic/20",
    rare: "bg-tier-rare/20",
    common: "bg-tier-common/20",
  };
  return tierBgs[tierName.toLowerCase()] || "bg-surface";
}

