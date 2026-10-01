import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  // undefined = todavía preguntando al backend; null = sin sesión; objeto = con sesión.
  const [usuario, setUsuario] = useState(undefined)

  // Al abrir la app: si la cookie de sesión sigue viva, entra directo (como Instagram).
  useEffect(() => {
    api('/auth/me')
      .then(setUsuario)
      .catch(() => setUsuario(null))
  }, [])

  async function iniciarSesion(correo, password) {
    setUsuario(await api('/auth/login', { method: 'POST', cuerpo: { correo, password } }))
  }

  async function cerrarSesion() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}
