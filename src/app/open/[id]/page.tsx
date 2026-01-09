import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OpeningStatus } from "@prisma/client";
import { OpeningClient } from "./opening-client";

/**
 * Pack Opening Page
 * 
 * The reveal experience after purchase
 */

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

async function getOpening(id: string, userId: string) {
  const opening = await prisma.packOpening.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      packProduct: true,
      assignment: {
        include: {
          item: {
            include: { tier: true },
          },
        },
      },
    },
  });

  return opening;
}

export default async function OpeningPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const { session_id } = await searchParams;
  
  const opening = await getOpening(id, session.user.id);

  if (!opening) {
    notFound();
  }

  // If still pending and we have session_id, wait for webhook
  // In production, you might want to poll or use websockets
  if (opening.status === OpeningStatus.PENDING && session_id) {
    // Wait a moment for webhook to process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Refresh opening data
    const refreshedOpening = await getOpening(id, session.user.id);
    if (refreshedOpening?.status !== OpeningStatus.PENDING) {
      // Redirect to refresh page with new data
      redirect(`/open/${id}`);
    }
  }

  // Check if opening is complete
  const isComplete = [OpeningStatus.COMPLETED, OpeningStatus.REVEALED].includes(opening.status);
  const isFailed = opening.status === OpeningStatus.FAILED;
  const isPending = opening.status === OpeningStatus.PENDING || opening.status === OpeningStatus.PROCESSING;

  return (
    <OpeningClient
      openingId={opening.id}
      packName={opening.packProduct.name}
      status={opening.status}
      isComplete={isComplete}
      isFailed={isFailed}
      isPending={isPending}
      item={opening.assignment?.item ? {
        id: opening.assignment.item.id,
        name: opening.assignment.item.name,
        description: opening.assignment.item.description,
        images: opening.assignment.item.images,
        tierName: opening.assignment.item.tier.name,
        tierColor: opening.assignment.item.tier.color,
        estimatedValue: opening.assignment.item.estimatedValue,
        condition: opening.assignment.item.condition,
      } : null}
    />
  );
}

