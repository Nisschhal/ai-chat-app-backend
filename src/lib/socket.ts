import { ENV } from "@/config/env.config"
import jwt from "jsonwebtoken"
import { type Server as HttpServer } from "http"
import { type Socket, Server as SocketServer } from "socket.io"
import { validateChatParticipantsService } from "@/services/chat.service"
import { Prisma } from "@/generated/prisma/client"

interface AuthenticatedSocket extends Socket {
  userId?: string
}

let io: SocketServer | null = null
// key: userId, value: socketId for each new connection

const onlineUsers = new Map<string, string>()

export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: ENV.FRONTEND_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // middleware to authenticate the socket
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie
      if (!rawCookie) {
        return next(new Error("Unauthorized"))
      }
      const token = rawCookie
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith("accessToken="))
        ?.split("=")[1]

      if (!token) {
        return next(new Error("Unauthorized"))
      }

      const decodedToken = jwt.verify(token, ENV.JWT_SECRET) as {
        userId: string
      }

      if (!decodedToken) {
        return next(new Error("Unauthorized"))
      }

      socket.userId = decodedToken.userId
      next()
    } catch (error) {
      next(new Error("Unauthorized"))
    }
  })

  // Listen for new connections
  io.on("connection", (socket: AuthenticatedSocket) => {
    if (!socket.userId) {
      console.log(`User with no userId disconnected with socket ${socket.id}`)
      return socket.disconnect()
    }

    const userId = socket.userId
    const newSocketId = socket.id

    console.log(`User ${userId} connected with socket ${newSocketId}`)

    // register or store the new socket id for the user in the onlineUsers map
    onlineUsers.set(userId, newSocketId)

    // Broadcast the new user connection to all other users
    io?.emit("online:users", Array.from(onlineUsers.keys()))

    // Create a personal chat room for the user
    socket.join(`user:${userId}`)

    // Join a chat room
    socket.on(
      "chat:join",
      async (chatId: string, callback?: (err?: string) => void) => {
        try {
          await validateChatParticipantsService(chatId, userId)
          socket.join(`chat:${chatId}`)
          callback?.()
        } catch (error) {
          callback?.("Error joining chat")
        }
      },
    )

    // Leave a chat room
    socket.on("chat:leave", async (chatId: string) => {
      if (chatId) {
        socket.leave(`chat:${chatId}`)
        console.log(`User ${userId} left chat ${chatId}`)
      }
    })

    // Disconnect the socket
    socket.on("disconnect", () => {
      if (onlineUsers.has(userId)) {
        onlineUsers.delete(userId)
        io?.emit("online:users", Array.from(onlineUsers.keys()))
        console.log(`User ${userId} disconnected from socket ${newSocketId}`)
      }
    })
  })
}

function getIo() {
  if (!io) throw new Error("Socket.io not initialized")
  return io
}

/**
 * Emit a new chat to the participants
 * @param participantsIds - The ids of the participants
 * @param chat - The chat to emit
 */

export const emitNewChatToParticipants = (
  participantsIds: string[],
  chat: any,
) => {
  const io = getIo()
  for (const participantId of participantsIds) {
    io.to(`user:${participantId}`).emit("chat:new", chat)
  }
}

export const emitNewUserToAll = (user: any) => {
  const io = getIo()
  io.emit("user:new", user)
}

export const emitNewMessageToChatRoom = (
  senderId: string,
  chatId: string,
  message: Prisma.MessageGetPayload<{
    include: {
      sender: {
        select: {
          id: true
          name: true
          avatar: true
        }
      }
    }
  }>,
) => {
  const io = getIo()

  const senderSocketId = onlineUsers.get(senderId)

  if (senderSocketId) {
    io.to(`chat:${chatId}`).except(senderSocketId).emit("message:new", message)
  } else {
    io.to(`chat:${chatId}`).emit("message:new", message)
  }
}

export const emitLastMessageToChatParticipants = (
  participantsIds: string[],
  chatId: string,
  lastMessage: any,
) => {
  const io = getIo()
  const payload = {
    chatId,
    lastMessage,
  }
  for (const participantId of participantsIds) {
    io.to(`user:${participantId}`).emit("chat:update", payload)
  }
}

export const emitChatAI = ({
  chatId,
  chunk,
  sender,
  done,
  message,
}: {
  chatId: string
  chunk?: string | null
  sender?: any
  done?: boolean
  message?: any
}) => {
  const io = getIo()
  if (chunk?.trim() && !done) {
    io.to(`chat:${chatId}`).emit("chat:ai", {
      chatId,
      chunk,
      sender,
      done,
      message,
    })
    return
  }
  if (done) {
    io.to(`chat:${chatId}`).emit("chat:ai", {
      chatId,
      done,
      chunk: null,
      message: message,
      sender,
    })
    return
  }
}
