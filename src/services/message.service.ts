import { NotFoundException } from "@/config/app-error"
import cloudinary from "@/config/cloudinary.config"
import prisma from "@/lib/prisma"
import {
  emitLastMessageToChatParticipants,
  emitNewMessageToChatRoom,
} from "@/lib/socket"

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
      participants: {
        select: {
          id: true,
        },
      },
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

  return { message: newMessage, chatId }
}
