import { prisma } from "@/lib/prisma";
import { getAllPacksHealth } from "@/lib/pack-health";
import { Card, Badge, Button } from "@/components/ui";
import { Gift, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Admin Packs Page
 * 
 * Manage pack products and configurations
 */

async function getPacks() {
  const packs = await prisma.packProduct.findMany({
    include: {
      config: {
        include: {
          guarantees: { include: { tier: true } },
          tierWeights: { include: { tier: true } },
        },
      },
      _count: {
        select: {
          poolItems: true,
          openings: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const health = await getAllPacksHealth();

  return { packs, health };
}

export default async function PacksPage() {
  const { packs, health } = await getPacks();

  const healthMap = new Map(health.map(h => [h.packProductId, h]));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Packs</h1>
          <p className="text-text-secondary">
            Manage pack products and configurations
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Pack
        </Button>
      </div>

      <div className="space-y-4">
        {packs.map((pack) => {
          const packHealth = healthMap.get(pack.id);
          
          return (
            <Card key={pack.id} className="p-6">
              <div className="flex items-start gap-6">
                {/* Pack Icon */}
                <div className="h-20 w-20 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
                  <Gift className="h-10 w-10 text-text-muted" />
                </div>

                {/* Pack Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{pack.name}</h3>
                    <Badge
                      variant={
                        pack.status === "ACTIVE" ? "success" :
                        pack.status === "OUT_OF_STOCK" ? "error" :
                        pack.status === "PAUSED" ? "warning" :
                        "secondary"
                      }
                    >
                      {pack.status}
                    </Badge>
                    {pack.featured && (
                      <Badge variant="default">Featured</Badge>
                    )}
                  </div>

                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                    {pack.description}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-text-muted">Price</p>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(pack.priceInCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Sold</p>
                      <p className="font-semibold text-foreground">
                        {pack.soldCount} / {pack.maxSupply || "∞"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Pool Size</p>
                      <p className="font-semibold text-foreground">
                        {pack._count.poolItems} items
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Total Opens</p>
                      <p className="font-semibold text-foreground">
                        {pack._count.openings}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Health Status */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-muted mb-2">Pack Health</p>
                  {packHealth ? (
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                      packHealth.status === "SELLABLE"
                        ? "bg-success-muted text-success"
                        : packHealth.status === "LOW_STOCK"
                        ? "bg-warning-muted text-warning"
                        : "bg-error-muted text-error"
                    }`}>
                      {packHealth.status === "SELLABLE" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{packHealth.status}</span>
                    </div>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}

                  {/* Tier breakdown */}
                  {packHealth && packHealth.tierHealth.length > 0 && (
                    <div className="mt-3 text-left">
                      {packHealth.tierHealth.map((th) => (
                        <div key={th.tierId} className="text-xs flex justify-between gap-4">
                          <span className="text-text-muted">{th.tierName}</span>
                          <span className={th.healthy ? "text-success" : "text-error"}>
                            {th.available}/{th.required}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="secondary" size="sm">Edit</Button>
                  <Button variant="ghost" size="sm">
                    {pack.status === "ACTIVE" ? "Pause" : "Activate"}
                  </Button>
                </div>
              </div>

              {/* Guarantees and Weights */}
              {pack.config && (
                <div className="mt-4 pt-4 border-t border-border flex gap-8">
                  {pack.config.guarantees.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted mb-2">Guarantees</p>
                      <div className="flex gap-2">
                        {pack.config.guarantees.map((g) => (
                          <Badge
                            key={g.tierId}
                            style={{
                              backgroundColor: `${g.tier.color}30`,
                              color: g.tier.color,
                            }}
                          >
                            {g.minCount}x {g.tier.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {pack.config.tierWeights.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted mb-2">Drop Rates</p>
                      <div className="flex gap-2">
                        {pack.config.tierWeights.map((tw) => {
                          const total = pack.config!.tierWeights.reduce((s, t) => s + t.weight, 0);
                          const pct = Math.round((tw.weight / total) * 100);
                          return (
                            <span
                              key={tw.tierId}
                              className="text-xs"
                              style={{ color: tw.tier.color }}
                            >
                              {tw.tier.name} {pct}%
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}




