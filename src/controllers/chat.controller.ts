import { HTTPSTATUS } from "@/config/http.config"
import { asyncHandler } from "@/middlewares/asyncHandler.middleware"
import {
  createChatService,
  getSingleChatService,
  getUserChatsService,
} from "@/services/chat.service"
import { chatIdSchema, createChatSchema } from "@/validators/chat.validator"
import { Request, Response } from "express"

/**
 * @description Create a chat or retrieve an existing chat
 * @param req - Request object
 * @param res - Response object
 * @returns {Promise<void>}
 * @example
 * POST /api/chats
 * Body:
 * {
 *   "participantId": "123",
 *   "isGroup": false,
 *   "participants": ["123", "456"],
 *   "groupName": "Group 1",
 *   "groupAvatar": "https://example.com/group1.jpg"
 * }
 * Response:
 * {
 *   "message": "Chat created or retrieved successfully",
 *   "success": true,
 *   "data": {
 *     "id": "123",
 *     "isGroup": false,
 *     "groupName": "Group 1",
 *     "groupAvatar": "https://example.com/group1.jpg",
 *     "createdAt": "2021-01-01T00:00:00.000Z",
 *     "updatedAt": "2021-01-01T00:00:00.000Z",
 *     "participants": [
 *       {
 *         "id": "123",
 *         "name": "John Doe",
 *         "avatar": "https://example.com/john.jpg"
 *       },
 *       {
 *         "id": "456",
 *         "name": "Jane Doe",
 *         "avatar": "https://example.com/jane.jpg"
 *       }
 *     ],
 *     "createdBy": {
 *       "id": "123",
 *       "name": "John Doe",
 *       "avatar": "https://example.com/john.jpg"
 *     },
 *     "latestMessage": {
 *       "id": "789",
 *       "content": "Hello, how are you?",
 *       "image": "https://example.com/message.jpg",
 *       "createdAt": "2021-01-01T00:00:00.000Z",
 *       "updatedAt": "2021-01-01T00:00:00.000Z",
 *       "sender": {
 *         "id": "123",
 *         "name": "John Doe",
 *         "avatar": "https://example.com/john.jpg"
 *       }
 *     }
 *   }
 * }
 */
export const createChatController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id
    console.log(req.body, "req.body create chat controller")

    const body = createChatSchema.parse(req.body)

    const chat = await createChatService(userId as string, {
      ...body,
      includeAI: body.includeAI ?? false,
    })

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Chat created or retrieved successfully",
      data: chat,
      success: true,
    })
  },
)

/**
 * @description Get all chats for a user
 * @param req - Request object
 * @param res - Response object
 * @returns {Promise<void>}
 * @example
 * GET /api/chats
 * Authorization: Bearer <token>
 * Response:
 * {
 *   "message": "Chats retrieved successfully",
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "123",
 *       "isGroup": false,
 *       "groupName": "Group 1",
 *       "groupAvatar": "https://example.com/group1.jpg",
 *       "createdAt": "2021-01-01T00:00:00.000Z",
 *       "updatedAt": "2021-01-01T00:00:00.000Z",
 *       "participants": [
 *         {
 *           "id": "123",
 *           "name": "John Doe",
 *           "avatar": "https://example.com/john.jpg"
 *         },
 *         {
 *           "id": "456",
 *           "name": "Jane Doe",
 *           "avatar": "https://example.com/jane.jpg"
 *         }
 *       ],
 *       "createdBy": {
 *         "id": "123",
 *         "name": "John Doe",
 *         "avatar": "https://example.com/john.jpg"
 *       },
 *       "latestMessage": {
 *         "id": "789",
 *         "content": "Hello, how are you?",
 *         "image": "https://example.com/message.jpg",
 *         "createdAt": "2021-01-01T00:00:00.000Z",
 *         "updatedAt": "2021-01-01T00:00:00.000Z",
 *         "sender": {
 *           "id": "123",
 *           "name": "John Doe",
 *           "avatar": "https://example.com/john.jpg"
 *         }
 *       }
 *     }
 *   ]
 * }
 */
export const getUserChatsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id
    const chats = await getUserChatsService(userId as string)
    return res.status(HTTPSTATUS.OK).json({
      message: "Chats retrieved successfully",
      success: true,
      data: { chats },
    })
  },
)

export const getSingleChatController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id
    const { id } = chatIdSchema.parse(req.params)

    const { chat, messages } = await getSingleChatService(id, userId as string)
    return res.status(HTTPSTATUS.OK).json({
      message: "Single chat retrieved successfully",
      success: true,
      data: { chat, messages },
    })
  },
)
