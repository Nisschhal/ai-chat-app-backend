import { HTTPSTATUS } from "@/config/http.config"
import { asyncHandler } from "@/middlewares/asyncHandler.middleware"
import { sendMessageService } from "@/services/message.service"
import { sendMessageSchema } from "@/validators/message.validator"
import { Request, Response } from "express"

export const sendMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id
    const body = sendMessageSchema.parse(req.body)

    const { message, chatId } = await sendMessageService(userId as string, body)

    return res.status(HTTPSTATUS.OK).json({
      message: "Message sent successfully",
      data: { message, chatId },
    })
  },
)
