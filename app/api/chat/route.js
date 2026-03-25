import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateWithRetry(prompt, retries = 3, delayMs = 10000) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const systemInstruction = "You are a helpful AI financial assistant for the Welth platform. You help users understand their finances, give budgeting advice, and answer questions concisely. Keep your answers brief and helpful.";
  const fullPrompt = `${systemInstruction}\n\nUser: ${prompt}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error) {
      const isRateLimit = error.status === 429;
      if (isRateLimit && attempt < retries) {
        console.log(`Rate limited, retrying in ${delayMs / 1000}s... (attempt ${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}

async function getFinancialContext(userId) {
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      accounts: true,
      budgets: true,
    },
  });

  if (!user) return "User account not fully set up.";

  // LIMIT TO LAST 30 DAYS TO REDUCE TPM (Tokens Per Minute)
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const transactions = await db.transaction.findMany({
    where: { 
      userId: user.id, 
      type: "EXPENSE",
      date: { gte: last30Days }
    },
    select: { category: true, amount: true, date: true, description: true },
    orderBy: { date: "desc" },
    take: 50 // Only recent 50
  });

  // aggregate category totals
  const categoryTotals = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {});

  // Find top expenses
  const topExpenses = transactions.slice(0, 3).map(t =>
    `- ${t.description}: $${Number(t.amount)}`
  ).join("\n");

  // Summarize month-by-month for forecasting
  const allTimeTransactions = await db.transaction.findMany({
    where: { userId: user.id, type: "EXPENSE" },
    select: { amount: true, date: true },
    orderBy: { date: "asc" },
  });

  const monthlyData = allTimeTransactions.reduce((acc, t) => {
    const month = t.date.toISOString().slice(0, 7);
    acc[month] = (acc[month] || 0) + Number(t.amount);
    return acc;
  }, {});
  const history = Object.entries(monthlyData).map(([month, amount]) => ({ month, amount }));

  // Get Forecast (if enough data)
  let forecastMessage = "Forecasting pending more data.";
  if (history.length >= 2) {
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${mlServiceUrl}/predict/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      if (res.ok) {
        const data = await res.json();
        forecastMessage = `Predicted for next month: $${data.forecast}`;
      }
    } catch (e) {
      forecastMessage = "N/A";
    }
  }

  const budget = user.budgets[0]?.amount ? Number(user.budgets[0].amount) : 0;
  const totalBalance = user.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const totalSpentLast30 = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return `
    ### USER FINANCIAL CONTEXT (TODAY: ${new Date().toISOString().split("T")[0]})
    - Balance: $${totalBalance}
    - Last 30d Spending: $${totalSpentLast30}
    - Budget: ${budget ? `$${budget}` : "Not set"}
    - Prediction: ${forecastMessage}
    - Breakdown: ${Object.entries(categoryTotals).map(([c, a]) => `${c}: $${a}`).join(", ")}
    - Recent Highlights: ${topExpenses || "None"}
  `;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ text: "Please sign in." }, { status: 401 });

    const { prompt } = await req.json();
    const context = await getFinancialContext(userId);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const systemPrompt = `Assistant for Welth platform. Context: ${context}. Answer questions concisely using ONLY this data. If data is missing, say so.`;

    let result;
    let delay = 15000; // API suggested 14s, using 15s base delay
    for (let i = 0; i < 4; i++) {
        try {
            result = await model.generateContent(`${systemPrompt}\nUser: ${prompt}`);
            break;
        } catch (err) {
            if (err.status === 429 && i < 3) {
                console.log(`Rate limit detected. Retrying in ${delay/1000}s... (attempt ${i+1}/4)`);
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
            } else {
                throw err;
            }
        }
    }
    
    return Response.json({ text: result.response.text() });
  } catch (error) {
    console.error("--- ERR ---", error.status, error.message);
    
    if (error.status === 429) {
      return Response.json({ 
        text: "I'm on a free technical quota and it's currently exhausted. Please wait a full minute then try again."
      });
    }

    return Response.json({ 
      text: `I had an issue: ${error.message}. Please try again shortly.`
    });
  }
}
