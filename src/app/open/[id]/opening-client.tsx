"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button, Card, Badge } from "@/components/ui";
import { formatCurrency, getTierGlowClass } from "@/lib/utils";
import { 
  Package, 
  Sparkles, 
  Wallet, 
  Truck, 
  Tag,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Home,
  DollarSign
} from "lucide-react";

/**
 * Opening Client Component
 * 
 * Handles the pack opening animation and reveal
 * Includes instant buyback option
 */

interface OpeningClientProps {
  openingId: string;
  packName: string;
  status: string;
  isComplete: boolean;
  isFailed: boolean;
  isPending: boolean;
  holdingId: string | null;
  item: {
    id: string;
    name: string;
    description: string | null;
    images: string[];
    tierName: string;
    tierColor: string;
    estimatedValue: number;
    condition: string | null;
  } | null;
}

type RevealPhase = "intro" | "revealing" | "revealed";

const BUYBACK_RATE = 0.90; // 90%

export function OpeningClient({
  openingId,
  packName,
  status,
  isComplete,
  isFailed,
  isPending,
  holdingId,
  item,
}: OpeningClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<RevealPhase>("intro");
  const [hasMarkedRevealed, setHasMarkedRevealed] = useState(false);
  const [buybackLoading, setBuybackLoading] = useState(false);
  const [buybackComplete, setBuybackComplete] = useState(false);
  const [buybackAmount, setBuybackAmount] = useState<number | null>(null);

  // Calculate buyback value
  const buybackValue = item ? Math.floor(item.estimatedValue * BUYBACK_RATE) : 0;

  // Trigger confetti for rare items
  const triggerConfetti = useCallback(() => {
    if (!item) return;
    
    const tier = item.tierName.toLowerCase();
    
    if (tier === "legendary") {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ["#fbbf24", "#f59e0b", "#ffffff"],
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ["#fbbf24", "#f59e0b", "#ffffff"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else if (tier === "epic") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#a855f7", "#9333ea", "#ffffff"],
      });
    } else if (tier === "rare") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#2563eb", "#ffffff"],
      });
    }
  }, [item]);

  // Mark as revealed
  const markRevealed = useCallback(async () => {
    if (hasMarkedRevealed) return;
    setHasMarkedRevealed(true);
    
    try {
      await fetch(`/api/openings/${openingId}/reveal`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to mark as revealed:", error);
    }
  }, [openingId, hasMarkedRevealed]);

  // Handle instant buyback
  const handleBuyback = async () => {
    if (!holdingId || buybackComplete) return;
    
    setBuybackLoading(true);
    try {
      const res = await fetch("/api/vault/buyback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdingId }),
      });

      const data = await res.json();

      if (res.ok) {
        setBuybackComplete(true);
        setBuybackAmount(data.buybackAmount);
        // Trigger green confetti for successful sale
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#61ec7d", "#4fd969", "#ffffff"],
        });
      }
    } catch (error) {
      console.error("Buyback failed:", error);
    } finally {
      setBuybackLoading(false);
    }
  };

  // Auto-advance through phases
  useEffect(() => {
    if (isComplete && item && phase === "intro") {
      const timer = setTimeout(() => {
        setPhase("revealing");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, item, phase]);

  useEffect(() => {
    if (phase === "revealing") {
      const timer = setTimeout(() => {
        setPhase("revealed");
        triggerConfetti();
        markRevealed();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, triggerConfetti, markRevealed]);

  // Pending state
  if (isPending) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent border-t-transparent mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Processing Your Pack...
          </h2>
          <p className="text-text-secondary mb-6">
            Please wait while we prepare your reveal.
          </p>
          <Button variant="secondary" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </Card>
      </div>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-error-muted flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something Went Wrong
          </h2>
          <p className="text-text-secondary mb-6">
            We encountered an issue. Please contact support.
          </p>
          <Link href="/">
            <Button className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-text-secondary">Loading...</p>
        </Card>
      </div>
    );
  }

  const glowClass = getTierGlowClass(item.tierName);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${item.tierColor}20 0%, transparent 70%)`,
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Intro Phase */}
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, -2, 2, 0],
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-48 h-48 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto mb-6 border-2 border-accent/50 shadow-[0_0_30px_rgba(97,236,125,0.3)]"
            >
              <Package className="h-24 w-24 text-accent" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{packName}</h2>
            <p className="text-text-secondary">Get ready to reveal your item...</p>
          </motion.div>
        )}

        {/* Revealing Phase */}
        {phase === "revealing" && (
          <motion.div
            key="revealing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.div
              initial={{ rotateY: 0 }}
              animate={{ 
                rotateY: [0, 180, 360, 540, 720],
                scale: [1, 1.1, 1.2, 1.1, 1],
              }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="w-48 h-64 mx-auto perspective-1000"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div 
                className={`w-full h-full rounded-xl flex items-center justify-center ${glowClass}`}
                style={{ backgroundColor: `${item.tierColor}30` }}
              >
                <Sparkles className="h-16 w-16" style={{ color: item.tierColor }} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Revealed Phase */}
        {phase === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-lg"
          >
            {/* Tier announcement */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-6"
            >
              <Badge 
                className="text-lg px-4 py-2"
                style={{ 
                  backgroundColor: `${item.tierColor}30`,
                  color: item.tierColor,
                  borderColor: item.tierColor,
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {item.tierName.toUpperCase()}
              </Badge>
            </motion.div>

            {/* Item Card */}
            <Card className={`overflow-hidden ${glowClass}`}>
              <div className="relative aspect-[3/4] bg-surface-elevated">
                {item.images[0] ? (
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-24 w-24 text-text-muted" />
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {item.name}
                </h2>
                {item.description && (
                  <p className="text-text-secondary mb-4 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-text-muted">Estimated Value</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatCurrency(item.estimatedValue)}
                    </p>
                  </div>
                  {item.condition && (
                    <div className="text-right">
                      <p className="text-sm text-text-muted">Condition</p>
                      <p className="font-medium text-foreground">{item.condition}</p>
                    </div>
                  )}
                </div>

                {/* Buyback Complete Message */}
                {buybackComplete && buybackAmount !== null ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-success-muted mb-6">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium text-success">Sold for {formatCurrency(buybackAmount)}!</p>
                      <p className="text-sm text-success/80">Balance updated</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Success message */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success-muted mb-4">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="text-sm text-success">
                        Added to your vault!
                      </span>
                    </div>

                    {/* Instant Buyback Option */}
                    {holdingId && (
                      <div className="p-4 rounded-lg bg-warning-muted mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-warning">Instant Buyback</p>
                            <p className="text-sm text-warning/80">
                              Sell now for 90% value
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-warning">
                              {formatCurrency(buybackValue)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="warning"
                          className="w-full mt-3"
                          onClick={handleBuyback}
                          loading={buybackLoading}
                          disabled={buybackLoading}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Sell for {formatCurrency(buybackValue)}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                {!buybackComplete && (
                  <div className="grid grid-cols-3 gap-3">
                    <Link href="/vault" className="col-span-3 sm:col-span-1">
                      <Button variant="default" className="w-full">
                        <Wallet className="h-4 w-4 mr-2" />
                        Vault
                      </Button>
                    </Link>
                    <Button variant="secondary" className="col-span-3 sm:col-span-1">
                      <Truck className="h-4 w-4 mr-2" />
                      Ship
                    </Button>
                    <Button variant="secondary" className="col-span-3 sm:col-span-1">
                      <Tag className="h-4 w-4 mr-2" />
                      List
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Open another */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center mt-6"
            >
              <Link href="/">
                <Button variant="outline" size="lg">
                  <Package className="h-4 w-4 mr-2" />
                  Open Another Pack
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
