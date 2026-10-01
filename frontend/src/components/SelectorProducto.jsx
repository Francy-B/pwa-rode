import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import Icono from './Iconos.jsx'

// Elegir UN producto para el encargo. A diferencia de SelectorIngredientes (varios
// a la vez), aquí basta con tocar la fila: se elige y el panel se cierra solo.
export default function SelectorProducto({ onElegir, onCerrar }) {
  const [todos, setTodos] = useState(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/productos')
      .then(setTodos)
      .catch((e) => setError(e.message))
  }, [])

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase()
    return (todos ?? []).filter((p) => !texto || p.nombre.toLowerCase().includes(texto))
  }, [todos, q])

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-selector" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Elegir producto</h2>

        <div className="buscador buscador-modal">
          <Icono nombre="buscar" tamano={20} />
          <input
            type="search"
            placeholder="Buscar producto..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            aria-label="Buscar producto"
          />
        </div>

        {error && <p className="error">{error}</p>}

        {todos && filtrados.length === 0 && (
          <p className="vacio vacio-modal">
            {todos.length === 0
              ? 'Aún no tienes productos creados. Ve a Recetas y crea el primero.'
              : 'No hay productos que coincidan con la búsqueda.'}
          </p>
        )}

        <ul className="selector-lista">
          {filtrados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="selector-fila selector-fila-boton"
                onClick={() => {
                  onElegir(p)
                  onCerrar()
                }}
              >
                <span>{p.nombre}</span>
                <small>Base: {p.cantidad_base}</small>
              </button>
            </li>
          ))}
        </ul>

        <div className="modal-botones">
          <button type="button" className="boton-texto" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
