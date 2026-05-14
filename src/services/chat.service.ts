import { BadRequestException, NotFoundException } from "@/config/app-error"
import prisma from "@/lib/prisma"

export const createChatService = async (
  userId: string,
  body: {
    participantId?: string
    isGroup?: boolean
    participants?: string[]
    groupName?: string
    groupAvatar?: string
  },
) => {
  const { participantId, isGroup, participants, groupName, groupAvatar } = body
  let chat
  let allParticipants: string[] = []

  // Create a group chat
  if (isGroup && participants?.length && groupName) {
    allParticipants = [...participants, userId]
    chat = await prisma.chat.create({
      data: {
        isGroup,
        groupName,
        groupAvatar,
        participants: {
          connect: allParticipants.map((id) => ({ id })),
        },
        createdById: userId,
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        latestMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: true,
      },
    })
  }
  // Create a direct chat
  else if (participantId) {
    const otherUser = await prisma.user.findUnique({
      where: {
        id: participantId,
      },
    })
    if (!otherUser) {
      throw new NotFoundException("User not found")
    }
    allParticipants = [userId, participantId]
    // Check if the chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        isGroup: false,
        AND: [
          {
            participants: {
              some: {
                id: userId,
              },
            },
          },
          {
            participants: {
              some: {
                id: participantId,
              },
            },
          },
          {
            participants: {
              every: {
                id: {
                  in: allParticipants,
                },
              },
            },
          },
        ],
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        latestMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: true,
      },
    })
    // If the chat already exists, return the existing chat
    if (existingChat) return existingChat

    // If the chat does not exist, create a new chat
    chat = await prisma.chat.create({
      data: {
        isGroup: false,
        participants: {
          connect: allParticipants.map((id) => ({ id })),
        },
        createdById: userId,
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        latestMessage: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: true,
      },
    })
  } else {
    throw new BadRequestException("Invalid chat type or parameters")
  }

  // TODO: Websocket notification to the other participant

  return chat
}

export const getUserChatsService = async (userId: string) => {
  // Get all chats for the user
  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        some: {
          id: userId,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      latestMessage: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
      //   messages: true,
    },
  })
  return chats
}

export const getSingleChatService = async (chatId: string, userId: string) => {
  // Get the chat by id and check if the user is a participant
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      participants: {
        some: { id: userId },
      },
    },
    include: {
      participants: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      latestMessage: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  })
  if (!chat) {
    throw new BadRequestException(
      "Chat not found or you are not authorized to view this chat",
    )
  }

  const messages = await prisma.message.findMany({
    where: {
      chatId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          image: true,
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return {
    chat,
    messages,
  }
}
