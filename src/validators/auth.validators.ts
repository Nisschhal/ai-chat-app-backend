import z from "zod"

export const emailSchema = z
  .email("Invalid email address")
  .min(1, "Email is required")
  .trim()

export const passwordSchema = z.string().trim().min(1, "Password is required")

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(25, "Name must be less than 20 characters"),
  email: emailSchema,
  password: passwordSchema,
  avatar: z.string().trim().optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export type RegisterSchemaType = z.infer<typeof registerSchema>
export type LoginSchemaType = z.infer<typeof loginSchema>
