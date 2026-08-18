import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailCampaigns } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  await db
    .update(emailCampaigns)
    .set({
      totalOpened: sql`${emailCampaigns.totalOpened} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
