import bcrypt from "bcryptjs"

export const hashValue = async (password: string, saltRounds: number = 10) => {
  return await bcrypt.hash(password, saltRounds)
}

export const compareValue = async (password: string, hashedValue: string) => {
  return await bcrypt.compare(password, hashedValue)
}
