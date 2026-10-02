import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { NotificacionesProvider, useNotificaciones } from '../NotificacionesContext.jsx'
import Icono from './Iconos.jsx'
import CambiarPassword from './CambiarPassword.jsx'
import logoRode from '../assets/logo-rode.webp'

const SECCIONES = [
  { a: '/', texto: 'Inicio', icono: 'inicio', fin: true },
  { a: '/inventario', texto: 'Inventario', icono: 'inventario' },
  { a: '/recetas', texto: 'Recetas', icono: 'recetas' },
  { a: '/encargos', texto: 'Encargos', icono: 'encargos' },
  { a: '/compras', texto: 'Lista de compras', icono: 'compras' },
]

function Enlaces({ clase, conAviso }) {
  return SECCIONES.map((s) => (
    <NavLink key={s.a} to={s.a} end={s.fin} className={clase}>
      <Icono nombre={s.icono} />
      <span>{s.texto}</span>
      {/* RF-18: el punto refleja el inventario real, no un estado de "leído". */}
      {s.a === '/compras' && conAviso && <i className="punto" role="img" aria-label="Hay ingredientes en stock crítico" />}
    </NavLink>
  ))
}

function ContenidoLayout() {
  const { usuario, cerrarSesion } = useAuth()
  const { criticos } = useNotificaciones()
  const [menu, setMenu] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const contenedor = useRef(null)

  // Cierra el menú de la cuenta al tocar fuera de él.
  useEffect(() => {
    if (!menu) return
    const fuera = (e) => !contenedor.current?.contains(e.target) && setMenu(false)
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [menu])

  return (
    <div className="app">
      <aside className="lateral">
        <div className="lateral-marca">
          <img src={logoRode} alt="RODE Patisserie" className="lateral-logo" />
        </div>
        <nav className="lateral-nav">
          <Enlaces clase="enlace" conAviso={criticos > 0} />
        </nav>
      </aside>

      <div className="principal">
        <header className="barra">
          <h1 className="barra-titulo">RODE</h1>
          <div className="barra-acciones" ref={contenedor}>
            <button
              className="barra-usuario"
              aria-label="Cuenta"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
            >
              <Icono nombre="usuario" />
            </button>
            {menu && (
              <div className="menu-cuenta" role="menu">
                <p>{usuario.correo}</p>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMostrarPassword(true)
                    setMenu(false)
                  }}
                >
                  <Icono nombre="candado" tamano={20} /> Cambiar contraseña
                </button>
                <button role="menuitem" onClick={cerrarSesion}>
                  <Icono nombre="salir" tamano={20} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="contenido">
          <Outlet />
        </main>
      </div>

      <nav className="inferior" aria-label="Secciones">
        <Enlaces clase="inferior-enlace" conAviso={criticos > 0} />
      </nav>

      {mostrarPassword && <CambiarPassword onCerrar={() => setMostrarPassword(false)} />}
    </div>
  )
}

export default function Layout() {
  return (
    <NotificacionesProvider>
      <ContenidoLayout />
    </NotificacionesProvider>
  )
}
