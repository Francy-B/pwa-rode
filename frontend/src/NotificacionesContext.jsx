import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

// RF-18: cuántos ingredientes están en su stock mínimo o por debajo, ahora mismo.
// El punto en "Lista de compras" refleja esto en vivo: se enciende y se apaga solo
// con los cambios reales de stock, sin ningún estado de "visto" que mantener.
const NotificacionesContext = createContext(null)
export const useNotificaciones = () => useContext(NotificacionesContext)

export function NotificacionesProvider({ children }) {
  const [criticos, setCriticos] = useState(0)

  const refrescar = useCallback(() => {
    api('/notificaciones/resumen')
      .then((d) => setCriticos(d.criticos))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refrescar()
  }, [refrescar])

  return (
    <NotificacionesContext.Provider value={{ criticos, refrescar }}>
      {children}
    </NotificacionesContext.Provider>
  )
}
