"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, Badge, Button } from "@/components/ui";
import { formatCurrency, formatDate, getTierGlowClass } from "@/lib/utils";
import { 
  Package, 
  Wallet, 
  Truck, 
  Tag, 
  Clock,
  CheckCircle,
  ExternalLink
} from "lucide-react";

/**
 * Vault Client Component
 */

interface VaultClientProps {
  holdings: {
    id: string;
    status: string;
    acquiredAt: string;
    item: {
      id: string;
      name: string;
      images: string[];
      tierName: string;
      tierColor: string;
      estimatedValue: number;
      condition: string | null;
    };
    listing: {
      id: string;
      askingPrice: number;
      status: string;
    } | null;
    shipmentRequest: {
      id: string;
      status: string;
      trackingNumber: string | null;
    } | null;
  }[];
  openings: {
    id: string;
    packName: string;
    status: string;
    createdAt: string;
    item: {
      name: string;
      tierName: string;
      tierColor: string;
    } | null;
  }[];
  stats: {
    totalItems: number;
    totalValue: number;
    listedItems: number;
    shippingItems: number;
  };
}

export function VaultClient({ holdings, openings, stats }: VaultClientProps) {
  const [activeTab, setActiveTab] = useState<"holdings" | "history">("holdings");

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Vault</h1>
          <p className="text-text-secondary">
            Manage your collection of items from pack openings
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
                <p className="text-sm text-text-secondary">Total Items</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Package className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.totalValue)}
                </p>
                <p className="text-sm text-text-secondary">Total Value</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Tag className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.listedItems}</p>
                <p className="text-sm text-text-secondary">Listed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Truck className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.shippingItems}</p>
                <p className="text-sm text-text-secondary">Shipping</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          <button
            className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
              activeTab === "holdings"
                ? "text-accent"
                : "text-text-secondary hover:text-foreground"
            }`}
            onClick={() => setActiveTab("holdings")}
          >
            Holdings ({holdings.length})
            {activeTab === "holdings" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              />
            )}
          </button>
          <button
            className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
              activeTab === "history"
                ? "text-accent"
                : "text-text-secondary hover:text-foreground"
            }`}
            onClick={() => setActiveTab("history")}
          >
            Opening History ({openings.length})
            {activeTab === "history" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              />
            )}
          </button>
        </div>

        {/* Holdings Grid */}
        {activeTab === "holdings" && (
          <div>
            {holdings.length === 0 ? (
              <Card className="p-12 text-center">
                <Wallet className="h-12 w-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Your vault is empty
                </h3>
                <p className="text-text-secondary mb-4">
                  Open some packs to start building your collection!
                </p>
                <Button asChild>
                  <a href="/">Browse Packs</a>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {holdings.map((holding, index) => (
                  <motion.div
                    key={holding.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`overflow-hidden ${
                      holding.item.tierName.toLowerCase() === "legendary" 
                        ? getTierGlowClass("legendary") 
                        : ""
                    }`}>
                      <div className="relative aspect-[3/4] bg-surface-elevated">
                        {holding.item.images[0] ? (
                          <Image
                            src={holding.item.images[0]}
                            alt={holding.item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-12 w-12 text-text-muted" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge
                            style={{
                              backgroundColor: `${holding.item.tierColor}30`,
                              color: holding.item.tierColor,
                              borderColor: holding.item.tierColor,
                            }}
                          >
                            {holding.item.tierName}
                          </Badge>
                        </div>
                        {holding.status !== "HOLDING" && (
                          <div className="absolute top-2 right-2">
                            <Badge
                              variant={
                                holding.status === "LISTED" ? "warning" :
                                holding.status === "SHIPPING" ? "info" :
                                "success"
                              }
                            >
                              {holding.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                          {holding.item.name}
                        </h3>
                        <p className="text-sm text-accent font-medium mb-3">
                          {formatCurrency(holding.item.estimatedValue)}
                        </p>
                        
                        {holding.status === "HOLDING" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" className="flex-1">
                              <Truck className="h-3 w-3 mr-1" />
                              Ship
                            </Button>
                            <Button size="sm" variant="secondary" className="flex-1">
                              <Tag className="h-3 w-3 mr-1" />
                              List
                            </Button>
                          </div>
                        )}
                        
                        {holding.listing && (
                          <div className="text-sm text-text-secondary">
                            Listed for {formatCurrency(holding.listing.askingPrice)}
                          </div>
                        )}
                        
                        {holding.shipmentRequest && (
                          <div className="text-sm">
                            <span className="text-text-secondary">Status: </span>
                            <span className="text-foreground">
                              {holding.shipmentRequest.status}
                            </span>
                            {holding.shipmentRequest.trackingNumber && (
                              <Button size="sm" variant="ghost" className="ml-2 p-0 h-auto">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Opening History */}
        {activeTab === "history" && (
          <div>
            {openings.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="h-12 w-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No opening history
                </h3>
                <p className="text-text-secondary">
                  Your pack opening history will appear here.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {openings.map((opening) => (
                  <Card key={opening.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-surface-elevated">
                          <Package className="h-5 w-5 text-text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {opening.packName}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {formatDate(opening.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {opening.item ? (
                          <div className="text-right">
                            <p className="text-sm text-foreground">
                              {opening.item.name}
                            </p>
                            <Badge
                              style={{
                                backgroundColor: `${opening.item.tierColor}30`,
                                color: opening.item.tierColor,
                              }}
                            >
                              {opening.item.tierName}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant={
                            opening.status === "COMPLETED" ? "success" :
                            opening.status === "FAILED" ? "error" :
                            "secondary"
                          }>
                            {opening.status}
                          </Badge>
                        )}
                        {opening.status === "COMPLETED" && (
                          <CheckCircle className="h-5 w-5 text-success" />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}




