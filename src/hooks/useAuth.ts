import { useContext } from "react"
import { authContext } from "../context/authContext"
import type { AuthContextType } from "../types/auth"

export function useAuth(): AuthContextType {
  const context = useContext(authContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
