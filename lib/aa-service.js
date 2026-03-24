import { db } from "./prisma";

export const MOCK_TRANSACTIONS = [
  { merchant: "Zomato", amount: 450, category: "Food", type: "EXPENSE", date: new Date().toISOString() },
  { merchant: "Amazon India", amount: 1200, category: "Shopping", type: "EXPENSE", date: new Date().toISOString() },
  { merchant: "Uber", amount: 150, category: "Transport", type: "EXPENSE", date: new Date().toISOString() },
  { merchant: "Netflix", amount: 499, category: "Entertainment", type: "EXPENSE", date: new Date().toISOString() },
  { merchant: "HDFC Bank Salary", amount: 75000, category: "Salary", type: "INCOME", date: new Date().toISOString() },
];

export async function syncAAAccount(userId, accountId) {
  const account = await db.account.findUnique({
    where: { id: accountId },
    include: { user: true }
  });

  if (!account || account.userId !== userId) {
    throw new Error("Account not found or access denied");
  }

  // In a real AA integration, you would:
  // 1. Call the AA API (e.g., Setu) using the stored consentId.
  // 2. Map the FI data to our Transaction model.
  // 3. Save new transactions to the database.

  console.log(`[Mock AA] Syncing transactions for account ${accountId}...`);

  const newTransactions = [];
  for (const mock of MOCK_TRANSACTIONS) {
    // Check if transaction already exists (simplified check by description and date)
    const existing = await db.transaction.findFirst({
      where: {
        accountId,
        description: mock.merchant,
        amount: mock.amount,
        date: {
          gte: new Date(new Date().setDate(new Date().getDate() - 1)) // roughly today
        }
      }
    });

    if (!existing) {
      const tx = await db.transaction.create({
        data: {
          type: mock.type,
          amount: mock.amount,
          description: mock.merchant,
          date: new Date(mock.date),
          category: mock.category,
          source: "AA",
          userId,
          accountId
        }
      });
      newTransactions.push(tx);
    }
  }

  // Update account balance (simplified)
  const totalChange = newTransactions.reduce((acc, tx) => {
    return tx.type === "INCOME" ? acc + Number(tx.amount) : acc - Number(tx.amount);
  }, 0);

  if (totalChange !== 0) {
    await db.account.update({
      where: { id: accountId },
      data: { balance: { increment: totalChange } }
    });
  }

  return newTransactions;
}

export async function createMockConsent(userId) {
  // Simulate calling Setu's Consent Request API
  const mockConsentId = `consent_${Math.random().toString(36).substring(7)}`;
  
  // In a real app, you'd store this in a 'Consent' table or similar.
  // For now, we'll just return a mock URL.
  return {
    consentId: mockConsentId,
    redirectUrl: `/api/aa/callback?consentId=${mockConsentId}`
  };
}
