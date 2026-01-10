import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Add Test Balance API
 * 
 * POST /api/user/add-balance
 * Adds test balance to the user's account
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    // Default to $100 if no amount specified
    const amountCents = amount ? Math.abs(amount) * 100 : 10000;

    // Update user balance
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        balanceCents: { increment: amountCents } 
      },
      select: { 
        id: true, 
        balanceCents: true 
      },
    });

    return NextResponse.json({
      success: true,
      newBalance: user.balanceCents,
      added: amountCents,
    });
  } catch (error) {
    console.error("Add balance error:", error);
    return NextResponse.json(
      { error: "Failed to add balance" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/add-balance
 * Get current balance
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balanceCents: true },
    });

    return NextResponse.json({
      balance: user?.balanceCents || 0,
    });
  } catch (error) {
    console.error("Get balance error:", error);
    return NextResponse.json(
      { error: "Failed to get balance" },
      { status: 500 }
    );
  }
}

