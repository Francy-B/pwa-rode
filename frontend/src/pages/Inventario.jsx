import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useNotificaciones } from '../NotificacionesContext.jsx'
import Icono from '../components/Iconos.jsx'
import { formatear, textoCantidad } from '../unidades.js'

const FILTROS = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'critico', texto: 'Crítico' },
  { valor: 'ok', texto: 'OK' },
]

// Largo de la barra: llena a la mitad cuando el stock iguala el mínimo.
function porcentaje(i) {
  if (i.umbral_critico <= 0) return i.stock > 0 ? 100 : 0
  return Math.min(100, (i.stock / (i.umbral_critico * 2)) * 100)
}

export default function Inventario() {
  const { refrescar: refrescarAvisos } = useNotificaciones()
  const [items, setItems] = useState(null) // null = cargando
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('todos')
  const [error, setError] = useState('')
  const [recargar, setRecargar] = useState(0)
  const [aBorrar, setABorrar] = useState(null)
  const [errorBorrar, setErrorBorrar] = useState(null)

  // Consulta al escribir en el buscador (con una pequeña pausa) o al cambiar el filtro.
  useEffect(() => {
    let cancelado = false
    const espera = setTimeout(
      () => {
        const params = new URLSearchParams({ estado })
        if (q.trim()) params.set('q', q.trim())
        api(`/ingredientes?${params}`)
          .then((d) => {
            if (cancelado) return
            setItems(d)
            setError('')
          })
          .catch((e) => !cancelado && setError(e.message))
      },
      q ? 250 : 0
    )
    return () => {
      cancelado = true
      clearTimeout(espera)
    }
  }, [q, estado, recargar])

  async function eliminar() {
    try {
      await api(`/ingredientes/${aBorrar.id}`, { method: 'DELETE' })
      setABorrar(null)
      setRecargar((n) => n + 1)
      refrescarAvisos()
    } catch (e) {
      // RF-06: si está en una receta, el backend dice en cuáles.
      setErrorBorrar({ mensaje: e.message, recetas: e.datos?.recetas ?? [] })
    }
  }

  function cerrarModal() {
    setABorrar(null)
    setErrorBorrar(null)
  }

  const sinFiltros = !q.trim() && estado === 'todos'

  return (
    <>
      <div className="buscador">
        <Icono nombre="buscar" />
        <input
          type="search"
          placeholder="Buscar ingrediente..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar ingrediente"
        />
      </div>

      <div className="lista-encabezado">
        <h2>TODOS LOS INGREDIENTES</h2>
        {items && (
          <span className="pildora">
            {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
          </span>
        )}
      </div>

      <div className="chips" role="group" aria-label="Filtrar por estado del stock">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            className={`chip ${estado === f.valor ? 'chip-activo' : ''}`}
            aria-pressed={estado === f.valor}
            onClick={() => setEstado(f.valor)}
          >
            {f.texto}
          </button>
        ))}
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {items && items.length === 0 && (
        <p className="vacio">
          {sinFiltros
            ? 'Aún no tienes ingredientes. Pulsa el botón + para crear el primero.'
            : 'No hay ingredientes que coincidan con la búsqueda.'}
        </p>
      )}

      <div className="lista">
        {items?.map((i) => (
          <article key={i.id} className={`ing ${i.critico ? 'ing-critico' : ''}`}>
            <div className="ing-info">
              <h3>{i.nombre}</h3>
              <p>
                {textoCantidad(i.stock, i.unidad_medida)} disponibles · Mínimo: {formatear(i.umbral_critico)}
              </p>
              <div className="progreso" aria-hidden="true">
                <i style={{ width: `${porcentaje(i)}%` }} />
              </div>
            </div>
            <span className={`etiqueta ${i.critico ? 'etiqueta-critico' : 'etiqueta-ok'}`}>
              <Icono nombre={i.critico ? 'alerta' : 'check'} tamano={14} /> {i.critico ? 'Crítico' : 'OK'}
            </span>
            <Link to={`/inventario/${i.id}/editar`} className="icono-boton" aria-label={`Editar ${i.nombre}`}>
              <Icono nombre="editar" tamano={22} />
            </Link>
            <button className="icono-boton" aria-label={`Eliminar ${i.nombre}`} onClick={() => setABorrar(i)}>
              <Icono nombre="basura" tamano={22} />
            </button>
          </article>
        ))}
      </div>

      <Link to="/inventario/nuevo" className="fab" aria-label="Nuevo ingrediente">
        <Icono nombre="mas" tamano={30} />
      </Link>

      {aBorrar && (
        <div className="modal-fondo" onClick={cerrarModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>¿Eliminar {aBorrar.nombre}?</h2>
            {errorBorrar ? (
              <>
                <p className="error">{errorBorrar.mensaje}</p>
                {errorBorrar.recetas.length > 0 && (
                  <ul>
                    {errorBorrar.recetas.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p>Esta acción no se puede deshacer.</p>
            )}
            <div className="modal-botones">
              <button className="boton-texto" onClick={cerrarModal}>
                {errorBorrar ? 'Cerrar' : 'Cancelar'}
              </button>
              {!errorBorrar && (
                <button className="boton-peligro" onClick={eliminar}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
