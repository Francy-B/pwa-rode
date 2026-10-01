import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Icono from '../components/Iconos.jsx'

// Accesos rápidos: cada uno lleva directo a la pantalla donde se hace la tarea.
// "Registrar encargo" abre el formulario de nuevo encargo (/encargos/nuevo).
// "Registrar compra" por ahora abre Inventario; más adelante irá directo al
// formulario de compra (RF-05).
const ACCIONES = [
  { a: '/inventario', emoji: '🧂', texto: 'Registrar compra' },
  { a: '/encargos/nuevo', emoji: '📝', texto: 'Registrar encargo' },
  { a: '/compras', emoji: '🛍️', texto: 'Lista de compras' },
]

export default function Inicio() {
  // null = cargando; se piden de nuevo cada vez que se entra a Inicio, así que
  // siempre reflejan lo último (no dependen de recordar cambios de otras pantallas).
  const [stockCritico, setStockCritico] = useState(null)
  const [encargosPendientes, setEncargosPendientes] = useState(null)

  useEffect(() => {
    api('/ingredientes?estado=critico')
      .then((d) => setStockCritico(d.length))
      .catch(() => setStockCritico(0))
    api('/encargos?estado=pendiente')
      .then((d) => setEncargosPendientes(d.length))
      .catch(() => setEncargosPendientes(0))
  }, [])

  return (
    <>
      {stockCritico > 0 && (
        <section className="aviso">
          <span className="aviso-icono"><Icono nombre="alerta" /></span>
          <div>
            <strong>{stockCritico} {stockCritico === 1 ? 'ingrediente' : 'ingredientes'} en stock crítico</strong>
            <p>Necesitan reabastecimiento</p>
          </div>
        </section>
      )}

      <div className="contadores">
        <div className="tarjeta contador">
          <strong>{stockCritico ?? '—'}</strong>
          <span>Stock crítico</span>
        </div>
        <div className="tarjeta contador">
          <strong>{encargosPendientes ?? '—'}</strong>
          <span>Encargos pendientes</span>
        </div>
      </div>

      <div className="acciones">
        {ACCIONES.map((x) => (
          <Link key={x.a} to={x.a} className="tarjeta accion">
            <span className="accion-emoji">{x.emoji}</span>
            {x.texto}
          </Link>
        ))}
      </div>
    </>
  )
}
