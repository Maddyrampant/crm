import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailCampaigns } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  const rl = await checkRateLimit(`track-open:${campaignId}`, 30, 60_000);
  if (!rl.ok) {
    return new Response("Rate limited", { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  }

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
