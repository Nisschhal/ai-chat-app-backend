import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/config/app-error"
import prisma from "@/lib/prisma"
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "@/validators/auth.validators"
import bcrypt from "bcryptjs"
import { compareValue, hashValue } from "@/utils/bcrypt"

export const registerService = async (body: RegisterSchemaType) => {
  const { name, email, password, avatar } = body
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  })

  if (existingUser) {
    throw new BadRequestException("User already exists")
  }

  const hashedPassword = await hashValue(password)

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      avatar,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return newUser
}

export const loginService = async (body: LoginSchemaType) => {
  const { email, password } = body
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  })

  if (!user) {
    throw new NotFoundException("User not found")
  }

  const isPasswordValid = await compareValue(password, user.password)

  if (!isPasswordValid) {
    throw new UnauthorizedException("Invalid email or password")
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
