import { Router } from "express"
import {
  loginController,
  logoutController,
  registerController,
  authStatusController,
} from "@/controllers/auth.controller"
import { passportAuthenticateJwt } from "@/config/passport.config"

const authRoutes = Router()

authRoutes.post("/register", registerController)
authRoutes.post("/login", loginController)
authRoutes.post("/logout", logoutController)
authRoutes.get("/status", passportAuthenticateJwt, authStatusController)

export default authRoutes
