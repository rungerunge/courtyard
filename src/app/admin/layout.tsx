import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminSidebar } from "./components/admin-sidebar";

/**
 * Admin Layout
 * 
 * Wraps all admin pages with authentication check and sidebar
 */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar admin={session} />
        <main className="flex-1 ml-64 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

