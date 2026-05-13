import { Router } from "express"

import authRoutes from "./auth.route"

const router = Router()

router.use("/auth", authRoutes)
// chat
// user

export default router
