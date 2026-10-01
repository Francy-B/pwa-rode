import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatear } from '../unidades.js'

// RF-17: solo muestra lo que hace falta, ya sumado. La compra en sí se registra
// donde ya existe ese formulario (editar el ingrediente en Inventario, RF-05):
// aquí cada fila lleva directo a eso, para no duplicar esa pantalla.
export default function ListaCompras() {
  const [items, setItems] = useState(null) // null = cargando
  const [error, setError] = useState('')

  useEffect(() => {
    api('/compras')
      .then((d) => {
        setItems(d)
        setError('')
      })
      .catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <div className="lista-encabezado">
        <h2>LISTA DE COMPRAS</h2>
        {items && (
          <span className="pildora">
            {items.length} {items.length === 1 ? 'ingrediente' : 'ingredientes'}
          </span>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {items && items.length === 0 && (
        <p className="vacio">
          No hay nada que comprar por ahora: el inventario alcanza para los encargos pendientes.
        </p>
      )}

      <div className="lista">
        {items?.map((i) => (
          <Link key={i.id_ingrediente} to={`/inventario/${i.id_ingrediente}/editar`} className="compra">
            <div className="compra-info">
              <h3>{i.nombre}</h3>
              <p>Stock actual: {formatear(i.disponible)}</p>
            </div>
            <span className="etiqueta etiqueta-critico">
              Comprar mínimo {formatear(i.cantidad_a_comprar)} {i.unidad_medida}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
