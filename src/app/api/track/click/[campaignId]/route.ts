import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailCampaigns } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  const url = request.nextUrl.searchParams.get("url");

  const rl = await checkRateLimit(`track:${campaignId}`, 30, 60_000);
  if (!rl.ok) {
    return new Response("Rate limited", { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  }

  await db
    .update(emailCampaigns)
    .set({
      totalClicked: sql`${emailCampaigns.totalClicked} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new NextResponse(null, { status: 204 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.redirect(url);
  }

  return new NextResponse(null, { status: 204 });
}
