import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailCampaigns } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  const url = request.nextUrl.searchParams.get("url");

  await db
    .update(emailCampaigns)
    .set({
      totalClicked: sql`${emailCampaigns.totalClicked} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  if (url) {
    return NextResponse.redirect(url);
  }

  return new NextResponse(null, { status: 204 });
}
