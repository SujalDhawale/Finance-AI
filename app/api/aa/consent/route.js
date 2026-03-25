import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createMockConsent } from "@/lib/aa-service";
import { db } from "@/lib/prisma";

export async function POST() {
  try {
    const { userId } = await auth();
    console.log("AA Consent diagnostics - Clerk userId:", userId);

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ensure user exists in our DB
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    console.log("AA Consent diagnostics - DB user found:", user ? user.id : "null");

    if (!user) {
      return new NextResponse("User not found in database", { status: 404 });
    }

    const consent = await createMockConsent(user.id);
    return NextResponse.json(consent);
  } catch (error) {
    console.error("AA Consent Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function GET() {
  return new NextResponse("Method Not Allowed. Use POST.", { status: 405 });
}
