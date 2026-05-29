import prisma from "@/lib/prisma"

/**
 * Find a user by their ID
 * @param id - The ID of the user
 * @returns The user
 */
export const findByIdUserService = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return user
}

/**
 * Get all users except the current user
 * @param userId - The ID of the current user
 * @returns An array of users
 */
export const getUsersService = async (userId: string) => {
  const users = await prisma.user.findMany({
    where: {
      id: {
        not: userId,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      isAI: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
  return users
}
