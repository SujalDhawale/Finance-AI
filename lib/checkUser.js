import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  let clerkUser;
  try {
    clerkUser = await currentUser();
  } catch (error) {
    console.error("Clerk error in checkUser:", error.message);
    return null;
  }

  if (!clerkUser) {
    return null;
  }

  try {
    const email = clerkUser.emailAddresses[0].emailAddress;
    
    // 1. Try to find user by clerkUserId
    let loggedInUser = await db.user.findUnique({
      where: { clerkUserId: clerkUser.id },
    });

    // 2. If not found by ID, try by email (session recovery)
    if (!loggedInUser) {
      loggedInUser = await db.user.findUnique({
        where: { email: email },
      });

      if (loggedInUser) {
        // Update the Clerk ID if it changed
        loggedInUser = await db.user.update({
          where: { id: loggedInUser.id },
          data: { clerkUserId: clerkUser.id },
        });
        console.log("Updated clerkUserId for user:", email);
      }
    }

    // 3. If still not found, create new user
    if (!loggedInUser) {
      const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
      loggedInUser = await db.user.create({
        data: {
          clerkUserId: clerkUser.id,
          name: name || "User",
          imageUrl: clerkUser.imageUrl,
          email: email,
        },
      });
      console.log("Created new user in DB:", email);
    }

    // 4. Ensure the user has at least one account (required for AA and Transactions)
    const accountCount = await db.account.count({
      where: { userId: loggedInUser.id },
    });

    if (accountCount === 0) {
      await db.account.create({
        data: {
          name: "Main Savings",
          type: "SAVINGS",
          balance: 0,
          isDefault: true,
          userId: loggedInUser.id,
        },
      });
      console.log("Created default 'Main Savings' account for user:", email);
    }

    return loggedInUser;
  } catch (error) {
    console.error("Error in checkUser (DB sync):", error.message);
    return null;
  }
};
