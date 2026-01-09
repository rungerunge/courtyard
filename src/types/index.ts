/**
 * Courtyard MVP - Type Definitions
 * 
 * Core types used throughout the application
 */

import type {
  User,
  Item,
  ItemTier,
  PackProduct,
  PackConfig,
  PackGuarantee,
  PackTierWeight,
  PackOpening,
  Assignment,
  VaultHolding,
  Listing,
  ShipmentRequest,
  AdminUser,
  AuditLog,
  ItemStatus,
  PackStatus,
  OpeningStatus,
  HoldingStatus,
  ListingStatus,
  ShipmentStatus,
  AdminRole,
} from "@prisma/client";

// Re-export Prisma types
export type {
  User,
  Item,
  ItemTier,
  PackProduct,
  PackConfig,
  PackGuarantee,
  PackTierWeight,
  PackOpening,
  Assignment,
  VaultHolding,
  Listing,
  ShipmentRequest,
  AdminUser,
  AuditLog,
};

export {
  ItemStatus,
  PackStatus,
  OpeningStatus,
  HoldingStatus,
  ListingStatus,
  ShipmentStatus,
  AdminRole,
};

// ============================================
// PACK HEALTH TYPES
// ============================================

export type PackHealthStatus = "SELLABLE" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface TierHealth {
  tierId: string;
  tierName: string;
  available: number;
  required: number;
  healthy: boolean;
  percentage: number;
}

export interface PackHealth {
  packProductId: string;
  status: PackHealthStatus;
  remainingPacks: number;
  maxSupply: number | null;
  soldCount: number;
  tierHealth: TierHealth[];
  canSellOne: boolean;
  warnings: string[];
  calculatedAt: Date;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// PACK OPENING TYPES
// ============================================

export interface PackOpeningResult {
  openingId: string;
  item: ItemWithTier;
  assignmentId: string;
  tier: ItemTier;
  estimatedValue: number;
}

export interface ItemWithTier extends Item {
  tier: ItemTier;
}

export interface PackProductWithDetails extends PackProduct {
  config: PackConfigWithDetails | null;
  _count?: {
    poolItems: number;
    openings: number;
  };
}

export interface PackConfigWithDetails extends PackConfig {
  guarantees: (PackGuarantee & { tier: ItemTier })[];
  tierWeights: (PackTierWeight & { tier: ItemTier })[];
}

// ============================================
// VAULT & HOLDINGS TYPES
// ============================================

export interface VaultHoldingWithDetails extends VaultHolding {
  item: ItemWithTier;
  listing: Listing | null;
  shipmentRequest: ShipmentRequest | null;
}

export interface UserVaultSummary {
  totalItems: number;
  totalValue: number;
  listedItems: number;
  shippingItems: number;
  holdings: VaultHoldingWithDetails[];
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminDashboardStats {
  totalUsers: number;
  totalItems: number;
  availableItems: number;
  totalPacks: number;
  activePacks: number;
  totalOpenings: number;
  revenue: number;
  recentOpenings: PackOpeningWithUser[];
}

export interface PackOpeningWithUser extends PackOpening {
  user: Pick<User, "id" | "email" | "name">;
  packProduct: Pick<PackProduct, "id" | "name">;
  assignment: (Assignment & { item: ItemWithTier }) | null;
}

// ============================================
// SIMULATION TYPES
// ============================================

export interface SimulationResult {
  packProductId: string;
  totalSimulations: number;
  results: {
    tierId: string;
    tierName: string;
    count: number;
    percentage: number;
    expectedPercentage: number;
    avgValue: number;
  }[];
  totalValue: number;
  avgValuePerPack: number;
  minValue: number;
  maxValue: number;
  guaranteesMet: boolean;
  issues: string[];
}

// ============================================
// FORM TYPES
// ============================================

export interface CreateItemInput {
  sku: string;
  name: string;
  description?: string;
  images: string[];
  tierId: string;
  collection?: string;
  category?: string;
  condition?: string;
  gradeInfo?: string;
  serialNumber?: string;
  estimatedValue: number;
}

export interface CreatePackInput {
  name: string;
  description?: string;
  images: string[];
  priceInCents: number;
  maxSupply?: number;
  guarantees: { tierId: string; minCount: number }[];
  tierWeights: { tierId: string; weight: number }[];
  poolItemIds: string[];
}

export interface ShippingAddressInput {
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// ============================================
// SESSION TYPES
// ============================================

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface AdminSessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: AdminRole;
}

