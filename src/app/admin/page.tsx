import { prisma } from "@/lib/prisma";
import { getAllPacksHealth } from "@/lib/pack-health";
import { Card } from "@/components/ui";
import { 
  Package, 
  BoxesIcon, 
  Gift, 
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ItemStatus, PackStatus, OpeningStatus } from "@prisma/client";

/**
 * Admin Dashboard
 * 
 * Overview of platform metrics and health
 */

async function getStats() {
  const [
    userCount,
    itemStats,
    packStats,
    openingStats,
    recentOpenings,
    packsHealth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.item.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.packProduct.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.packOpening.aggregate({
      where: { status: OpeningStatus.COMPLETED },
      _count: true,
      _sum: { amountPaid: true },
    }),
    prisma.packOpening.findMany({
      where: { status: OpeningStatus.COMPLETED },
      include: {
        user: { select: { email: true, name: true } },
        packProduct: { select: { name: true } },
        assignment: {
          include: { item: { include: { tier: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getAllPacksHealth(),
  ]);

  // Process item stats
  const totalItems = itemStats.reduce((sum, s) => sum + s._count, 0);
  const availableItems = itemStats.find(s => s.status === ItemStatus.AVAILABLE)?._count || 0;
  const assignedItems = itemStats.find(s => s.status === ItemStatus.ASSIGNED)?._count || 0;

  // Process pack stats
  const totalPacks = packStats.reduce((sum, s) => sum + s._count, 0);
  const activePacks = packStats.find(s => s.status === PackStatus.ACTIVE)?._count || 0;
  const outOfStockPacks = packStats.find(s => s.status === PackStatus.OUT_OF_STOCK)?._count || 0;

  // Health warnings
  const unhealthyPacks = packsHealth.filter(h => h.status !== "SELLABLE");

  return {
    userCount,
    totalItems,
    availableItems,
    assignedItems,
    totalPacks,
    activePacks,
    outOfStockPacks,
    totalOpenings: openingStats._count,
    totalRevenue: openingStats._sum.amountPaid || 0,
    recentOpenings,
    packsHealth,
    unhealthyPacks,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-text-secondary">Overview of your platform</p>
      </div>

      {/* Health Warnings */}
      {stats.unhealthyPacks.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-warning-muted border border-warning/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="font-medium text-warning">Pack Health Warnings</span>
          </div>
          <ul className="space-y-1 text-sm text-text-secondary">
            {stats.unhealthyPacks.map((pack) => (
              <li key={pack.packProductId}>
                Pack {pack.packProductId.slice(0, 8)}... is {pack.status}: {pack.warnings.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-accent/10">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Pack Openings</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalOpenings}</p>
            </div>
            <div className="p-3 rounded-full bg-accent/10">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Available Items</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.availableItems} / {stats.totalItems}
              </p>
            </div>
            <div className="p-3 rounded-full bg-accent/10">
              <BoxesIcon className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.userCount}</p>
            </div>
            <div className="p-3 rounded-full bg-accent/10">
              <Users className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pack Health & Recent Openings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pack Health */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Pack Health
          </h2>
          <div className="space-y-3">
            {stats.packsHealth.length === 0 ? (
              <p className="text-text-secondary text-sm">No packs configured</p>
            ) : (
              stats.packsHealth.map((health) => (
                <div
                  key={health.packProductId}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {health.packProductId.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-text-muted">
                      {health.soldCount} / {health.maxSupply || "∞"} sold
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    health.status === "SELLABLE" 
                      ? "bg-success-muted text-success" 
                      : health.status === "LOW_STOCK"
                      ? "bg-warning-muted text-warning"
                      : "bg-error-muted text-error"
                  }`}>
                    {health.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Openings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Openings
          </h2>
          <div className="space-y-3">
            {stats.recentOpenings.length === 0 ? (
              <p className="text-text-secondary text-sm">No openings yet</p>
            ) : (
              stats.recentOpenings.map((opening) => (
                <div
                  key={opening.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {opening.user.name || opening.user.email}
                    </p>
                    <p className="text-xs text-text-muted">
                      {opening.packProduct.name}
                    </p>
                  </div>
                  {opening.assignment?.item && (
                    <div 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${opening.assignment.item.tier.color}30`,
                        color: opening.assignment.item.tier.color,
                      }}
                    >
                      {opening.assignment.item.tier.name}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

