import { HTTPSTATUS } from "@/config/http.config"
import { asyncHandler } from "@/middlewares/asyncHandler.middleware"
import { getUsersService } from "@/services/user.service"
import { Request, Response } from "express"

export const getUsersController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id

    const users = await getUsersService(userId as string)

    return res.status(HTTPSTATUS.OK).json({
      message: "Users retrieved successfully",
      success: true,
      data: users,
    })
  },
)
