import { useEffect, useState } from 'react'
import Icono from './Iconos.jsx'

const CLAVE_DESCARTADA = 'rode_pwa_descartada'

// Chrome/Android avisan con este evento cuando la PWA cumple lo necesario para
// instalarse (manifest + service worker). Safari/iOS nunca lo dispara: ahí la
// única forma es Compartir -> Agregar a inicio, sin botón posible desde la web.
export default function InstalarPWA() {
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    const yaInstalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    let yaDescartada = false
    try {
      yaDescartada = localStorage.getItem(CLAVE_DESCARTADA) === '1'
    } catch {
      // Sin acceso a localStorage (ventana privada, etc.): se muestra igual, sin recordar el cierre.
    }
    if (yaInstalada || yaDescartada) return

    function alDisponible(e) {
      e.preventDefault()
      setPrompt(e)
    }
    function alInstalar() {
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', alDisponible)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alDisponible)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  async function instalar() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  function descartar() {
    try {
      localStorage.setItem(CLAVE_DESCARTADA, '1')
    } catch {
      // Sin acceso a localStorage: se descarta solo por esta visita.
    }
    setPrompt(null)
  }

  if (!prompt) return null

  return (
    <div className="pwa-banner">
      <span className="pwa-banner-icono">
        <Icono nombre="instalar" tamano={22} />
      </span>
      <div className="pwa-banner-texto">
        <strong>PWA instalable disponible</strong>
        <span>Añadir a pantalla de inicio</span>
      </div>
      <button type="button" className="pwa-banner-boton" onClick={instalar}>
        Instalar
      </button>
      <button type="button" className="pwa-banner-cerrar" onClick={descartar} aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  )
}
