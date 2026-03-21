import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

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

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const text = await generateWithRetry(prompt);
    return Response.json({ text });
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    return Response.json({ 
      text: "I'm temporarily unavailable due to high demand. Please try again in a minute!"
    });
  }
}
