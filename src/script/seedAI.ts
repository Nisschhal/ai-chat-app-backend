import "dotenv/config"
import { connectDatabase } from "@/config/database.config"
import prisma from "@/lib/prisma"

export const createAIUser = async () => {
  let AIUser = await prisma.user.findFirst({
    where: {
      isAI: true,
    },
  })
  if (AIUser) {
    console.log("✅ AI user already exists", AIUser.id)
    return AIUser
  }

  AIUser = await prisma.user.create({
    data: {
      name: "AI",
      isAI: true,
      avatar:
        "https://res.cloudinary.com/da35wfzhv/image/upload/v1779861627/ai-logo_cwuxkc.png",
    },
  })
  console.log("✅ AI user created successfully", AIUser.id)
  return AIUser
}

const seedAI = async () => {
  try {
    await connectDatabase()
    await createAIUser()
    console.log("✅ AI user seeded successfully")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding AI user", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedAI()
