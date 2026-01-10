"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, Package, TrendingUp } from "lucide-react";

/**
 * Pack Card Component
 * 
 * Displays a pack product in the store grid
 */

interface PackCardProps {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  priceInCents: number;
  maxSupply: number | null;
  soldCount: number;
  status: string;
  featured: boolean;
  tierDistribution?: {
    tierId: string;
    tierName: string;
    weight: number;
    color: string;
  }[];
}

export function PackCard({
  id,
  name,
  description,
  images,
  priceInCents,
  maxSupply,
  soldCount,
  status,
  featured,
  tierDistribution,
}: PackCardProps) {
  const isAvailable = status === "ACTIVE";
  const remaining = maxSupply ? maxSupply - soldCount : null;
  const isLowStock = remaining !== null && remaining <= 10 && remaining > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <Link href={`/packs/${id}`}>
        <Card className={`overflow-hidden transition-all duration-300 ${
          featured 
            ? "ring-2 ring-accent shadow-[0_0_30px_rgba(97,236,125,0.2)]" 
            : "hover:border-accent/50"
        }`}>
          {/* Image Section */}
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-elevated">
            {images[0] ? (
              <Image
                src={images[0]}
                alt={name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-16 w-16 text-text-muted" />
              </div>
            )}
            
            {/* Featured Badge */}
            {featured && (
              <div className="absolute top-3 left-3">
                <Badge variant="default" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Featured
                </Badge>
              </div>
            )}

            {/* Stock Status */}
            <div className="absolute top-3 right-3">
              {!isAvailable ? (
                <Badge variant="error">Sold Out</Badge>
              ) : isLowStock ? (
                <Badge variant="warning">Only {remaining} left</Badge>
              ) : remaining ? (
                <Badge variant="secondary">{remaining} available</Badge>
              ) : null}
            </div>

            {/* Price Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(priceInCents)}
                  </p>
                </div>
                {maxSupply && (
                  <div className="text-right text-sm text-white/70">
                    <p>{soldCount} / {maxSupply} sold</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
              {name}
            </h3>
            {description && (
              <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                {description}
              </p>
            )}

            {/* Tier Distribution */}
            {tierDistribution && tierDistribution.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1 mb-2">
                  <TrendingUp className="h-3 w-3 text-text-muted" />
                  <span className="text-xs text-text-muted">Drop Rates</span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-surface-elevated">
                  {tierDistribution.map((tier) => (
                    <div
                      key={tier.tierId}
                      className="h-full transition-all"
                      style={{
                        width: `${tier.weight}%`,
                        backgroundColor: tier.color,
                      }}
                      title={`${tier.tierName}: ${tier.weight}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tierDistribution.map((tier) => (
                    <span
                      key={tier.tierId}
                      className="text-xs"
                      style={{ color: tier.color }}
                    >
                      {tier.tierName} {tier.weight}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <Button
              className="w-full"
              variant={isAvailable ? "default" : "secondary"}
              disabled={!isAvailable}
            >
              {isAvailable ? "Open Pack" : "Sold Out"}
            </Button>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export default PackCard;




