"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Package, 
  LayoutDashboard, 
  BoxesIcon, 
  Gift,
  ShoppingCart,
  Truck,
  Users,
  Settings,
  LogOut,
  Activity
} from "lucide-react";

/**
 * Admin Sidebar Component
 */

interface AdminSidebarProps {
  admin: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Inventory", icon: BoxesIcon },
  { href: "/admin/packs", label: "Packs", icon: Gift },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/shipments", label: "Shipments", icon: Truck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit Log", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
            <Package className="h-6 w-6 text-background" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">Courtyard</span>
            <p className="text-xs text-text-muted">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-accent text-background font-medium"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-elevated"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-medium">
              {admin.name?.[0] || admin.email[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {admin.name || admin.email}
            </p>
            <p className="text-xs text-text-muted">{admin.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:text-error hover:bg-error-muted rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

