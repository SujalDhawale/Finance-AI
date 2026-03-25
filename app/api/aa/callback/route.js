import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncAAAccount } from "@/lib/aa-service";
import { db } from "@/lib/prisma";

export async function GET(request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ensure user exists in our DB and get their internal ID
    const user = await db.user.findUnique({
      where: { clerkUserId },
    });
    console.log("AA Callback diagnostics - DB user:", user ? user.id : "null");

    if (!user) {
      return new NextResponse("User not found in database", { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId");
    console.log("AA Callback diagnostics - consentId:", consentId);

    if (!consentId) {
      return new NextResponse("Missing consentId", { status: 400 });
    }

    // In this mock, we'll sync the user's default account or the first one found
    const account = await db.account.findFirst({
      where: { userId: user.id, isDefault: true },
    }) || await db.account.findFirst({
      where: { userId: user.id },
    });
    console.log("AA Callback diagnostics - found account:", account ? account.id : "null");

    if (!account) {
      return new NextResponse("No account found to link. Please create an account first.", { status: 404 });
    }

    // Mark account as linked
    await db.account.update({
      where: { id: account.id },
      data: { isLinked: true, provider: "MOCK_SETU", externalId: consentId },
    });

    // Trigger initial sync
    await syncAAAccount(user.id, account.id);

    // Redirect back to dashboard with success
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/dashboard?linked=true`);
  } catch (error) {
    console.error("AA Callback Error:", error);
    return new NextResponse(JSON.stringify({ 
      error: error.message, 
      stack: error.stack 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
