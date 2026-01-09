import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import type { AdminUser, AdminRole } from "@prisma/client";

/**
 * Admin Authentication
 * 
 * Separate authentication system for admin users
 * Uses JWT stored in httpOnly cookies
 */

const ADMIN_TOKEN_NAME = "admin_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "admin-secret-key"
);

export interface AdminSession {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

/**
 * Create admin JWT token
 */
async function createAdminToken(admin: AdminUser): Promise<string> {
  return new SignJWT({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

/**
 * Verify admin JWT token
 */
async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

/**
 * Admin login
 */
export async function adminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!admin || !admin.isActive) {
    return { success: false, error: "Invalid credentials" };
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);

  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }

  // Update last login
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  // Create token
  const token = await createAdminToken(admin);

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return { success: true };
}

/**
 * Admin logout
 */
export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_TOKEN_NAME);
}

/**
 * Get current admin session
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifyAdminToken(token);

  if (!session) {
    return null;
  }

  // Verify admin still exists and is active
  const admin = await prisma.adminUser.findUnique({
    where: { id: session.id },
    select: { id: true, isActive: true },
  });

  if (!admin || !admin.isActive) {
    return null;
  }

  return session;
}

/**
 * Require admin authentication
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Admin authentication required");
  }

  return session;
}

/**
 * Require specific admin role
 */
export async function requireAdminRole(
  requiredRoles: AdminRole[]
): Promise<AdminSession> {
  const session = await requireAdmin();

  if (!requiredRoles.includes(session.role)) {
    throw new Error("Insufficient permissions");
  }

  return session;
}

/**
 * Create audit log entry
 */
export async function createAuditLog({
  adminId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
  userAgent,
}: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      adminUserId: adminId,
      action,
      entityType,
      entityId,
      details: details as object,
      ipAddress,
      userAgent,
    },
  });
}

/**
 * Hash password for admin
 */
export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Create initial admin user if none exists
 */
export async function ensureInitialAdmin(): Promise<void> {
  const adminCount = await prisma.adminUser.count();

  if (adminCount === 0) {
    const email = process.env.ADMIN_INITIAL_EMAIL || "admin@courtyard.io";
    const password = process.env.ADMIN_INITIAL_PASSWORD || "changeme123";

    const passwordHash = await hashAdminPassword(password);

    await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name: "Super Admin",
        role: "SUPER_ADMIN",
      },
    });

    console.log(`Created initial admin user: ${email}`);
  }
}

