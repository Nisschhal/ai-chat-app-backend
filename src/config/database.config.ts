// database/connection.ts  (or any file name you like)

import prisma from "@/lib/prisma"

export async function connectDatabase(): Promise<boolean> {
  try {
    // Try to establish connection
    await prisma.$connect()

    // Run the smallest possible query to really confirm it works
    const result = await prisma.$queryRawUnsafe<{ connected: number }[]>(
      `SELECT 1 AS connected`,
    )

    if (result && result[0]?.connected === 1) {
      console.log("✅ Database connected successfully")
      return true
    }

    throw new Error("Query returned unexpected result")
  } catch (error) {
    console.error("❌ Database connection failed")
    console.error(error instanceof Error ? error.message : String(error))
    return false
  }
  // Note: we don't call $disconnect() here so the connection pool stays alive
}
