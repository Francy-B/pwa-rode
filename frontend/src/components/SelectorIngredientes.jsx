import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import Icono from './Iconos.jsx'

// Panel para elegir VARIOS ingredientes de una vez: se marcan con casillas y se
// agregan todos juntos a la receta con un solo botón. Los que ya están en la
// receta no se pueden volver a elegir. Se puede reabrir tantas veces como haga
// falta para completar la lista, sin perder lo ya agregado.
export default function SelectorIngredientes({ yaAgregados, onAgregar, onCerrar }) {
  const [todos, setTodos] = useState(null)
  const [q, setQ] = useState('')
  const [elegidos, setElegidos] = useState(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    api('/ingredientes')
      .then(setTodos)
      .catch((e) => setError(e.message))
  }, [])

  const disponibles = useMemo(() => {
    const usados = new Set(yaAgregados)
    const texto = q.trim().toLowerCase()
    return (todos ?? [])
      .filter((i) => !usados.has(i.id))
      .filter((i) => !texto || i.nombre.toLowerCase().includes(texto))
  }, [todos, yaAgregados, q])

  function alternar(id) {
    setElegidos((prev) => {
      const copia = new Set(prev)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  function confirmar() {
    onAgregar(disponibles.filter((i) => elegidos.has(i.id)))
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-selector" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Agregar ingredientes</h2>

        <div className="buscador buscador-modal">
          <Icono nombre="buscar" tamano={20} />
          <input
            type="search"
            placeholder="Buscar ingrediente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            aria-label="Buscar ingrediente"
          />
        </div>

        {error && <p className="error">{error}</p>}

        {todos && disponibles.length === 0 && (
          <p className="vacio vacio-modal">
            {todos.length === 0
              ? 'Aún no tienes ingredientes creados. Ve a Inventario y crea el primero.'
              : 'Ya agregaste todos los que coinciden con la búsqueda.'}
          </p>
        )}

        <ul className="selector-lista">
          {disponibles.map((i) => (
            <li key={i.id}>
              <label className="selector-fila">
                <input type="checkbox" checked={elegidos.has(i.id)} onChange={() => alternar(i.id)} />
                <span>{i.nombre}</span>
                <small>{i.unidad_medida}</small>
              </label>
            </li>
          ))}
        </ul>

        <div className="modal-botones">
          <button type="button" className="boton-texto" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className="boton-principal boton-corto" disabled={elegidos.size === 0} onClick={confirmar}>
            Agregar {elegidos.size > 0 ? `(${elegidos.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
