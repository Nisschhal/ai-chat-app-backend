import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { ModelMessage, streamText } from "ai"
import { ENV } from "@/config/env.config"
import { NotFoundException } from "@/config/app-error"
import cloudinary from "@/config/cloudinary.config"
import prisma from "@/lib/prisma"
import {
  emitChatAI,
  emitLastMessageToChatParticipants,
  emitNewMessageToChatRoom,
} from "@/lib/socket"

const google = createGoogleGenerativeAI({
  apiKey: ENV.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const sendMessageService = async (
  userId: string,
  body: {
    chatId: string
    content?: string
    image?: string
    replyToId?: string
  },
) => {
  const { chatId, content, image, replyToId } = body
  const chat = await prisma.chat.findFirst({
    select: {
      isAIChat: true,
      participants: {
        select: {
          id: true,
        },
      },
      latestMessageId: true,
    },
    where: {
      id: chatId,
      participants: {
        some: {
          id: userId,
        },
      },
    },
  })
  if (!chat) {
    throw new NotFoundException("Chat not found or Unauthorized")
  }

  let imageUrl

  if (replyToId) {
    const replyToMessage = await prisma.message.findFirst({
      where: {
        id: replyToId,
        chatId,
      },
    })

    if (!replyToMessage) {
      throw new NotFoundException("Reply to message not found")
    }
  }

  if (image) {
    // TODO: Implement image upload to cloudinary
    //   imageUrl = await uploadImage(image)
    const result = await cloudinary.uploader.upload(image, {
      resource_type: "auto",
    })
    imageUrl = result.secure_url
  }

  const newMessage = await prisma.message.create({
    data: {
      chatId,
      content,
      image: imageUrl,
      replyToId: replyToId || null,
      senderId: userId,
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
  })
  await prisma.chat.update({
    where: {
      id: chatId,
    },
    data: {
      latestMessageId: newMessage.id,
    },
  })
  // Websocket: emit the new || last message to the chat participants

  emitNewMessageToChatRoom(userId, chatId, newMessage)

  // Websocket: emit the last message to memberss (personal room users) of the chat
  const allParticipantsIds = chat.participants.map((participant) =>
    participant.id.toString(),
  )

  emitLastMessageToChatParticipants(allParticipantsIds, chatId, newMessage)

  // Generate a response from the AI
  let aiResponse: any = null

  if (chat.isAIChat) {
    aiResponse = await getAIResponse(chatId, userId)
    chat.latestMessageId = aiResponse.id
    await prisma.chat.update({
      where: {
        id: chatId,
      },
      data: {
        latestMessageId: aiResponse.id,
      },
    })
  }

  return { message: newMessage, chatId, aiResponse }
}

async function getAIResponse(chatId: string, userId: string) {
  const AIUser = await prisma.user.findFirst({
    where: {
      isAI: true,
    },
  })
  if (!AIUser) {
    throw new NotFoundException("AI user not found")
  }
  const chatHistory = await getChatHistory(chatId)
  const formattedMessages: ModelMessage[] = chatHistory.map((message: any) => {
    const role = message.sender.isAI ? "assistant" : "user"
    const parts: any[] = []
    if (message.image) {
      parts.push({
        type: "image",
        image: new URL(message.image),
      })
    }
    if (!message.content) {
      parts.push({
        type: "text",
        text: "Describe what the image is showing",
      })
    }
    if (message.content) {
      parts.push({
        type: "text",
        text: message.replyTo?.content
          ? `[Replying to ${message.replyTo.sender.name}] ${message.replyTo.content}\n${message.content}`
          : message.content,
      })
    }
    return {
      id: message.id,
      role,
      content: parts,
    }
  })

  const createAIMessage = async (content: string) => {
    const aiMessage = await prisma.message.create({
      data: {
        chatId,
        content,
        senderId: AIUser.id,
        replyToId: chatHistory[chatHistory.length - 1].id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isAI: true,
          },
        },
      },
    })

    emitChatAI({
      chatId,
      chunk: null,
      sender: AIUser,
      done: true,
      message: aiMessage,
    })

    emitLastMessageToChatParticipants([userId], chatId, aiMessage)

    return aiMessage
  }

  try {
    const result = await streamText({
      model: google("gemini-2.5-flash"),
      messages: formattedMessages,
      system:
        "You are a helpful and friendly assistant. Respond only with text and attend to the last user message only.",
    })

    let fullResponse = ""
    for await (const chunk of result.textStream) {
      emitChatAI({
        chatId,
        chunk,
        sender: AIUser,
        done: false,
        message: null,
      })
      fullResponse += chunk
    }

    if (!fullResponse.trim()) {
      return createAIMessage(
        "I couldn't come up with a response for that. Please try again.",
      )
    }

    return createAIMessage(fullResponse)
  } catch (error) {
    console.error("AI response generation failed", error)

    return createAIMessage(
      "Sorry, I couldn't generate a response right now. Please try again in a moment.",
    )
  }
}

async function getChatHistory(chatId: string) {
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
          isAI: true,
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
              isAI: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })
  return messages.reverse()
}
