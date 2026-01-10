import { prisma } from "@/lib/prisma";
import { PackCard } from "@/components/pack-card";
import { PackStatus } from "@prisma/client";
import { Sparkles, Shield, Truck } from "lucide-react";

// Force dynamic rendering - database not accessible at build time
export const dynamic = "force-dynamic";

/**
 * Home Page - Pack Store
 * 
 * Displays all available packs for purchase
 */

async function getPacks() {
  const packs = await prisma.packProduct.findMany({
    where: {
      status: {
        in: [PackStatus.ACTIVE, PackStatus.OUT_OF_STOCK],
      },
    },
    include: {
      config: {
        include: {
          tierWeights: {
            include: { tier: true },
            orderBy: { tier: { displayOrder: "asc" } },
          },
        },
      },
    },
    orderBy: [
      { featured: "desc" },
      { displayOrder: "asc" },
    ],
  });

  return packs;
}

export default async function HomePage() {
  const packs = await getPacks();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface to-background py-20">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Open the <span className="text-accent">Vault</span>
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8">
            Discover rare collectibles through our mystery packs. Every item is real, 
            graded, and stored securely in our vault until you&apos;re ready to claim it.
          </p>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="p-3 rounded-full bg-accent/10">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">100% Authentic</p>
                <p className="text-sm">Verified & Graded Items</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="p-3 rounded-full bg-accent/10">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Real Inventory</p>
                <p className="text-sm">Items Pre-Owned in Vault</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="p-3 rounded-full bg-accent/10">
                <Truck className="h-6 w-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Instant Shipping</p>
                <p className="text-sm">Or Keep in Your Vault</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packs Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Available Packs
              </h2>
              <p className="text-text-secondary mt-1">
                Choose your pack and discover what&apos;s inside
              </p>
            </div>
          </div>

          {packs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-secondary text-lg">
                No packs available at the moment. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {packs.map((pack) => {
                // Calculate tier distribution percentages
                const totalWeight = pack.config?.tierWeights.reduce(
                  (sum, tw) => sum + tw.weight,
                  0
                ) || 0;

                const tierDistribution = pack.config?.tierWeights.map((tw) => ({
                  tierId: tw.tierId,
                  tierName: tw.tier.name,
                  weight: totalWeight > 0 
                    ? Math.round((tw.weight / totalWeight) * 100) 
                    : 0,
                  color: tw.tier.color,
                }));

                return (
                  <PackCard
                    key={pack.id}
                    id={pack.id}
                    name={pack.name}
                    description={pack.description}
                    images={pack.images}
                    priceInCents={pack.priceInCents}
                    maxSupply={pack.maxSupply}
                    soldCount={pack.soldCount}
                    status={pack.status}
                    featured={pack.featured}
                    tierDistribution={tierDistribution}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Simple, transparent, and exciting. Here&apos;s how our pack opening experience works.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-accent">1</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Choose Your Pack
              </h3>
              <p className="text-text-secondary">
                Browse our selection of packs with different odds and price points.
                Each pack contains items from our verified vault.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-accent">2</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Open & Reveal
              </h3>
              <p className="text-text-secondary">
                Experience the thrill of opening your pack and discovering 
                which item from our inventory is now yours.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-accent">3</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ship or Hold
              </h3>
              <p className="text-text-secondary">
                Keep your item safely stored in your vault, request shipping 
                to your door, or list it for sale on our marketplace.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
