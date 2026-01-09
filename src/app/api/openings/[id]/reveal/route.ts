import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markOpeningRevealed } from "@/lib/assignment-engine";

/**
 * Mark Opening as Revealed
 * 
 * POST /api/openings/[id]/reveal
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    
    await markOpeningRevealed(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark revealed error:", error);
    return NextResponse.json(
      { error: "Failed to mark as revealed" },
      { status: 500 }
    );
  }
}

