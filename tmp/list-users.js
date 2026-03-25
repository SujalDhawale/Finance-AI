const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function listUsers() {
  try {
    const users = await db.user.findMany();
    console.log("USERS IN DB:", JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("PRISMA ERROR:", error);
  } finally {
    await db.$disconnect();
  }
}

listUsers();
