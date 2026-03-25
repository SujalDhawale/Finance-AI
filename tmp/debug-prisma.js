const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function debugSync() {
  try {
    const user = await db.user.findFirst();
    if (!user) {
      console.log("No user found in DB");
      return;
    }
    console.log("Found user:", user.id);

    const account = await db.account.findFirst({
      where: { userId: user.id }
    });
    if (!account) {
      console.log("No account found for user");
      return;
    }
    console.log("Found account:", account.id);

    // Test the update logic from callback
    const updatedAccount = await db.account.update({
      where: { id: account.id },
      data: { isLinked: true, provider: "MOCK_SETU", externalId: "debug_consent" },
    });
    console.log("Account updated successfully");

    // Test the transaction creation (from syncAAAccount)
    const tx = await db.transaction.create({
      data: {
        type: "EXPENSE",
        amount: 100.50,
        description: "Debug Transaction",
        date: new Date(),
        category: "Food",
        source: "AA",
        userId: user.id,
        accountId: account.id
      }
    });
    console.log("Transaction created successfully:", tx.id);

  } catch (error) {
    console.error("DEBUG ERROR:", error);
  } finally {
    await db.$disconnect();
  }
}

debugSync();
