import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Faculty } from '@/types'

interface AuthContextType {
  faculty: Faculty | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (token: string, faculty: Faculty) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [faculty, setFaculty] = useState<Faculty | null>(() => {
    const stored = localStorage.getItem('faculty')
    return stored ? JSON.parse(stored) : null
  })

  const setAuth = (newToken: string, newFaculty: Faculty) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('faculty', JSON.stringify(newFaculty))
    setToken(newToken)
    setFaculty(newFaculty)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('faculty')
    setToken(null)
    setFaculty(null)
  }

  return (
    <AuthContext.Provider
      value={{ faculty, token, isAuthenticated: !!token, setAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
