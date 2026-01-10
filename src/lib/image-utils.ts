/**
 * Image Utilities
 * 
 * Generate SVG placeholder images for packs and items
 * These are inline data URLs that work without external dependencies
 */

// Color palette for tiers
export const TIER_COLORS = {
  legendary: { bg: "#1a1500", accent: "#fbbf24", glow: "rgba(251, 191, 36, 0.3)" },
  epic: { bg: "#1a0a1f", accent: "#a855f7", glow: "rgba(168, 85, 247, 0.3)" },
  rare: { bg: "#0a1420", accent: "#3b82f6", glow: "rgba(59, 130, 246, 0.3)" },
  common: { bg: "#1a1a1a", accent: "#9ca3af", glow: "rgba(156, 163, 175, 0.2)" },
};

/**
 * Generate a pack image SVG as data URL
 */
export function generatePackImage(
  name: string,
  tier: "legendary" | "epic" | "rare" | "common" = "common"
): string {
  const colors = TIER_COLORS[tier];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg}"/>
          <stop offset="100%" style="stop-color:#0a0a0a"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="400" height="500" fill="url(#bg)"/>
      <rect x="20" y="20" width="360" height="460" rx="16" fill="none" stroke="${colors.accent}" stroke-width="2" opacity="0.5"/>
      <circle cx="200" cy="200" r="80" fill="none" stroke="${colors.accent}" stroke-width="3" filter="url(#glow)"/>
      <text x="200" y="205" text-anchor="middle" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">?</text>
      <text x="200" y="380" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${escapeXml(name)}</text>
      <text x="200" y="420" text-anchor="middle" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="14" text-transform="uppercase">${tier.toUpperCase()}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

/**
 * Generate an item card image SVG as data URL
 */
export function generateItemImage(
  name: string,
  tier: "legendary" | "epic" | "rare" | "common" = "common"
): string {
  const colors = TIER_COLORS[tier];
  const shortName = name.length > 15 ? name.substring(0, 12) + "..." : name;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420">
      <defs>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg}"/>
          <stop offset="100%" style="stop-color:#0f0f0f"/>
        </linearGradient>
        <filter id="cardGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="300" height="420" rx="12" fill="url(#cardBg)"/>
      <rect x="10" y="10" width="280" height="400" rx="8" fill="none" stroke="${colors.accent}" stroke-width="2" opacity="0.6"/>
      <rect x="20" y="20" width="260" height="260" rx="8" fill="#0a0a0a"/>
      <circle cx="150" cy="150" r="60" fill="none" stroke="${colors.accent}" stroke-width="2" filter="url(#cardGlow)"/>
      <text x="150" y="160" text-anchor="middle" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="48" font-weight="bold">★</text>
      <text x="150" y="320" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="18" font-weight="bold">${escapeXml(shortName)}</text>
      <rect x="100" y="350" width="100" height="24" rx="12" fill="${colors.accent}" opacity="0.2"/>
      <text x="150" y="367" text-anchor="middle" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${tier.toUpperCase()}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Get tier from tier name string
 */
export function getTierType(tierName: string): "legendary" | "epic" | "rare" | "common" {
  const lower = tierName.toLowerCase();
  if (lower === "legendary") return "legendary";
  if (lower === "epic") return "epic";
  if (lower === "rare") return "rare";
  return "common";
}

