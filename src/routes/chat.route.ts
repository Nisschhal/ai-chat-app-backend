import {
  createChatController,
  getSingleChatController,
  getUserChatsController,
} from "@/controllers/chat.controller"
import { Router } from "express"
import { passportAuthenticateJwt } from "@/config/passport.config"
import { sendMessageController } from "@/controllers/message.controller"

const chatRoutes = Router().use(passportAuthenticateJwt)

chatRoutes.post("/create", createChatController)
chatRoutes.post("/message/send", sendMessageController)
chatRoutes.get("/all", getUserChatsController)
chatRoutes.get("/:id", getSingleChatController)

export default chatRoutes
