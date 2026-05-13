import { asyncHandler } from "@/middlewares/asyncHandler.middleware"
import { Request, Response } from "express"
import { loginSchema, registerSchema } from "@/validators/auth.validators"
import { loginService, registerService } from "@/services/auth.service"
import { clearJwtAuthCookie, setJwtAuthCookie } from "@/utils/cookie"
import { HTTPSTATUS } from "@/config/http.config"

export const registerController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = registerSchema.parse(req.body)

    const newUser = await registerService(body)

    const userId = newUser.id

    return setJwtAuthCookie({ res, userId }).status(HTTPSTATUS.CREATED).json({
      message: "User created and logged in successfully",
      data: newUser,
    })
  },
)

export const loginController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = loginSchema.parse(req.body)

    const user = await loginService(body)

    const userId = user.id

    return setJwtAuthCookie({ res, userId }).status(HTTPSTATUS.OK).json({
      message: "User logged in successfully",
      data: user,
    })
  },
)

export const logoutController = asyncHandler(
  async (req: Request, res: Response) => {
    return clearJwtAuthCookie(res).status(HTTPSTATUS.OK).json({
      message: "User logged out successfully",
    })
  },
)

export const authStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user
    return res.status(HTTPSTATUS.OK).json({
      message: "User is authenticated",
      data: user,
    })
  },
)
