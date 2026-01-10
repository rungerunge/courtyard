import { prisma } from "@/lib/prisma";
import { Card, Badge, Button } from "@/components/ui";
import { Package, Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Force dynamic rendering - database not accessible at build time
export const dynamic = "force-dynamic";

/**
 * Admin Inventory Page
 * 
 * Manage items in the vault
 */

async function getInventory() {
  const items = await prisma.item.findMany({
    include: { tier: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const tiers = await prisma.itemTier.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const stats = await prisma.item.groupBy({
    by: ["status"],
    _count: true,
  });

  return { items, tiers, stats };
}

export default async function InventoryPage() {
  const { items, tiers, stats } = await getInventory();

  const totalItems = stats.reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-text-secondary">
            {totalItems} items in vault
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats by status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.status} className="p-4">
            <p className="text-sm text-text-secondary">{stat.status}</p>
            <p className="text-2xl font-bold text-foreground">{stat._count}</p>
          </Card>
        ))}
      </div>

      {/* Search and filters */}
      <Card className="p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-elevated border border-border text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select className="px-4 py-2 rounded-lg bg-surface-elevated border border-border text-foreground">
            <option value="">All Tiers</option>
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>{tier.name}</option>
            ))}
          </select>
          <select className="px-4 py-2 rounded-lg bg-surface-elevated border border-border text-foreground">
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="SHIPPED">Shipped</option>
          </select>
        </div>
      </Card>

      {/* Items table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-elevated border-b border-border">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Item</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">SKU</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Tier</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Value</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-surface-elevated/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-surface-elevated flex items-center justify-center">
                        <Package className="h-5 w-5 text-text-muted" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-xs text-text-muted">{item.collection}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-text-secondary">{item.sku}</td>
                  <td className="p-4">
                    <Badge
                      style={{
                        backgroundColor: `${item.tier.color}30`,
                        color: item.tier.color,
                      }}
                    >
                      {item.tier.name}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    {formatCurrency(item.estimatedValue)}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        item.status === "AVAILABLE" ? "success" :
                        item.status === "RESERVED" ? "warning" :
                        item.status === "ASSIGNED" ? "secondary" :
                        "error"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}




