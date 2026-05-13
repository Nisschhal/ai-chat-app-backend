declare namespace Express {
  interface Request {
    user?: {
      id: string
      name: string
      email: string
      avatar: string
      createdAt: Date
      updatedAt: Date
    }
  }
}
