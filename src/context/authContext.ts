import { createContext } from "react"
import type { AuthContextType } from "../types/auth"

export const authContext = createContext<AuthContextType | undefined>(undefined)
