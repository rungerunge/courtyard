import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Add Test Balance API
 * 
 * POST /api/balance/add
 * 
 * For testing purposes - adds balance to user account
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amountCents = body.amount || 10000; // Default $100

    // Update user balance
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        balanceCents: {
          increment: amountCents,
        },
      },
      select: {
        id: true,
        balanceCents: true,
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

