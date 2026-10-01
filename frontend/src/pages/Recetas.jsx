import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import Icono from '../components/Iconos.jsx'
import { formatear } from '../unidades.js'

export default function Recetas() {
  const [items, setItems] = useState(null) // null = cargando
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [recargar, setRecargar] = useState(0)
  const [aBorrar, setABorrar] = useState(null)
  const [errorBorrar, setErrorBorrar] = useState(null)

  useEffect(() => {
    let cancelado = false
    const espera = setTimeout(
      () => {
        const params = new URLSearchParams(q.trim() ? { q: q.trim() } : {})
        api(`/productos?${params}`)
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
  }, [q, recargar])

  async function eliminar() {
    try {
      await api(`/productos/${aBorrar.id}`, { method: 'DELETE' })
      setABorrar(null)
      setRecargar((n) => n + 1)
    } catch (e) {
      // RF-10: si tiene encargos pendientes o en preparación, el backend dice de quién.
      setErrorBorrar({ mensaje: e.message, encargos: e.datos?.encargos ?? [] })
    }
  }

  function cerrarModal() {
    setABorrar(null)
    setErrorBorrar(null)
  }

  return (
    <>
      <div className="buscador">
        <Icono nombre="buscar" />
        <input
          type="search"
          placeholder="Buscar producto..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar producto"
        />
      </div>

      <div className="lista-encabezado">
        <h2>TODOS LOS PRODUCTOS</h2>
        {items && (
          <span className="pildora">
            {items.length} {items.length === 1 ? 'receta' : 'recetas'}
          </span>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {items && items.length === 0 && (
        <p className="vacio">
          {q.trim()
            ? 'No hay productos que coincidan con la búsqueda.'
            : 'Aún no tienes productos. Pulsa el botón + para crear el primero.'}
        </p>
      )}

      <div className="lista">
        {items?.map((p) => (
          <article key={p.id} className="ing">
            <div className="ing-info">
              <h3>{p.nombre}</h3>
              <p>Receta base: {formatear(p.cantidad_base)} unidades</p>
            </div>
            <Link to={`/recetas/${p.id}/editar`} className="icono-boton" aria-label={`Editar ${p.nombre}`}>
              <Icono nombre="editar" tamano={22} />
            </Link>
            <button className="icono-boton" aria-label={`Eliminar ${p.nombre}`} onClick={() => setABorrar(p)}>
              <Icono nombre="basura" tamano={22} />
            </button>
          </article>
        ))}
      </div>

      <Link to="/recetas/nuevo" className="fab" aria-label="Nuevo producto">
        <Icono nombre="mas" tamano={30} />
      </Link>

      {aBorrar && (
        <div className="modal-fondo" onClick={cerrarModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>¿Eliminar {aBorrar.nombre}?</h2>
            {errorBorrar ? (
              <>
                <p className="error">{errorBorrar.mensaje}</p>
                {errorBorrar.encargos.length > 0 && (
                  <ul>
                    {errorBorrar.encargos.map((cliente, i) => (
                      <li key={i}>{cliente}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p>Ya no aparecerá en el catálogo. Los encargos ya entregados no se ven afectados.</p>
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
