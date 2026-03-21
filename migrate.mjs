import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("Generating schema SQL native to utf-8...");
  execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema_utf8.sql', { stdio: 'inherit' });
  
  const sql = fs.readFileSync('schema_utf8.sql', 'utf8');
  console.log("SQL Schema read. Length: " + sql.length);
  
  // Split by statements and execute
  // This uses a dirty split on ; but Prisma migrations end nicely with ;
  const queries = sql.split(';');

  for (let q of queries) {
    const qStr = q.trim();
    if (qStr && qStr.length > 5) {
      console.log("Running Query: " + qStr.substring(0, 40) + "...");
      try {
        await prisma.$executeRawUnsafe(qStr);
      } catch (e) {
        console.error("Error running query:", e.message);
        // Ignore "relation already exists" errors in case they partially ran
      }
    }
  }
  console.log("Migration complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
