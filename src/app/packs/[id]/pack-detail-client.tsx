"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button, Card, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { 
  Package, 
  Shield, 
  Sparkles, 
  ChevronLeft, 
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";

/**
 * Pack Detail Client Component
 * 
 * Client-side interactivity for pack detail page
 */

interface PackDetailClientProps {
  pack: {
    id: string;
    name: string;
    description: string | null;
    images: string[];
    priceInCents: number;
    maxSupply: number | null;
    soldCount: number;
    status: string;
    totalItems: number;
  };
  tierDistribution: {
    tierId: string;
    tierName: string;
    weight: number;
    color: string;
  }[];
  guarantees: {
    tierName: string;
    minCount: number;
    color: string;
  }[];
  previewItems: {
    id: string;
    name: string;
    images: string[];
    tierName: string;
    tierColor: string;
    estimatedValue: number;
  }[];
  isAvailable: boolean;
}

export function PackDetailClient({
  pack,
  tierDistribution,
  guarantees,
  previewItems,
  isAvailable,
}: PackDetailClientProps) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  const remaining = pack.maxSupply ? pack.maxSupply - pack.soldCount : null;
  const isLowStock = remaining !== null && remaining <= 10 && remaining > 0;

  const handlePurchase = async () => {
    if (!session) {
      router.push(`/login?redirect=/packs/${pack.id}`);
      return;
    }

    setError("");
    setPurchasing(true);

    try {
      const res = await fetch("/api/purchase/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packProductId: pack.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to initiate purchase");
        return;
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Packs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface-elevated">
              {pack.images[0] ? (
                <Image
                  src={pack.images[0]}
                  alt={pack.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-24 w-24 text-text-muted" />
                </div>
              )}
              
              {/* Status badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {!isAvailable && (
                  <Badge variant="error" className="text-sm">Sold Out</Badge>
                )}
                {isLowStock && (
                  <Badge variant="warning" className="text-sm">Only {remaining} left!</Badge>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {pack.name}
              </h1>
              {pack.description && (
                <p className="text-text-secondary text-lg">
                  {pack.description}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-accent">
                {formatCurrency(pack.priceInCents)}
              </span>
              {pack.maxSupply && (
                <span className="text-text-secondary">
                  {pack.soldCount} / {pack.maxSupply} sold
                </span>
              )}
            </div>

            {/* Guarantees */}
            {guarantees.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-foreground">Guaranteed</h3>
                </div>
                <div className="space-y-2">
                  {guarantees.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-text-secondary">
                        At least {g.minCount}x{" "}
                        <span style={{ color: g.color }} className="font-medium">
                          {g.tierName}
                        </span>{" "}
                        item
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Drop Rates */}
            {tierDistribution.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-foreground">Drop Rates</h3>
                </div>
                <div className="space-y-3">
                  {tierDistribution.map((tier) => (
                    <div key={tier.tierId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: tier.color }} className="font-medium">
                          {tier.tierName}
                        </span>
                        <span className="text-text-secondary">{tier.weight}%</span>
                      </div>
                      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: tier.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${tier.weight}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-info-muted">
              <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary">
                <p className="font-medium text-foreground mb-1">
                  Real Items from Our Vault
                </p>
                <p>
                  All items in this pack are physical collectibles stored in our secure vault. 
                  After opening, you can keep it in your vault, request shipping, or list for resale.
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-error-muted text-error text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Purchase button */}
            <Button
              size="xl"
              className="w-full"
              onClick={handlePurchase}
              disabled={!isAvailable || purchasing}
              loading={purchasing}
            >
              {!isAvailable
                ? "Sold Out"
                : authStatus === "loading"
                ? "Loading..."
                : session
                ? `Open Pack - ${formatCurrency(pack.priceInCents)}`
                : "Sign in to Purchase"}
            </Button>
          </motion.div>
        </div>

        {/* Preview Items */}
        {previewItems.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-16"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Possible Hits ({pack.totalItems} items in pool)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {previewItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="relative aspect-[3/4] bg-surface-elevated">
                    {item.images[0] ? (
                      <Image
                        src={item.images[0]}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-text-muted" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant={
                          item.tierName.toLowerCase() === "legendary"
                            ? "legendary"
                            : item.tierName.toLowerCase() === "epic"
                            ? "epic"
                            : item.tierName.toLowerCase() === "rare"
                            ? "rare"
                            : "common"
                        }
                      >
                        {item.tierName}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Est. {formatCurrency(item.estimatedValue)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}




