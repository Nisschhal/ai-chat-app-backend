export const getEnv = (key: string, defaultValue: string = "") => {
  // if the value is not found, return the default value
  const value = process.env[key] ?? defaultValue
  // if the value is not set, throw an error
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  // if the value is found, return the value
  return value
}
