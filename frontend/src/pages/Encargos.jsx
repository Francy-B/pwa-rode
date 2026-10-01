import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useNotificaciones } from '../NotificacionesContext.jsx'
import Icono from '../components/Iconos.jsx'
import { formatear } from '../unidades.js'

const FILTROS = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'preparando', texto: 'Preparando' },
  { valor: 'entregado', texto: 'Entregados' },
  { valor: 'todos', texto: 'Todos' },
]

// 'YYYY-MM-DD' -> "15 ago, 2026". Se arma la fecha con sus partes locales (no con
// `new Date(texto)`) para que no se corra un día por la zona horaria.
function formatearFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y, m - 1, d)
  )
}

export default function Encargos() {
  const { refrescar: refrescarAvisos } = useNotificaciones()
  const [estado, setEstado] = useState('pendiente')
  const [items, setItems] = useState(null) // null = cargando
  const [error, setError] = useState('')
  const [recargar, setRecargar] = useState(0)
  const [ocupado, setOcupado] = useState(null) // id del encargo con una acción en curso
  const [aBorrar, setABorrar] = useState(null)
  const [errorBorrar, setErrorBorrar] = useState('')
  const [avisoBloqueo, setAvisoBloqueo] = useState(null) // { encargo, mensaje, faltantes }

  useEffect(() => {
    api(`/encargos?estado=${estado}`)
      .then((d) => {
        setItems(d)
        setError('')
      })
      .catch((e) => setError(e.message))
  }, [estado, recargar])

  async function cambiarEstado(encargo, accion) {
    setOcupado(encargo.id)
    try {
      await api(`/encargos/${encargo.id}/estado`, { method: 'POST', cuerpo: { accion } })
      setRecargar((n) => n + 1)
      refrescarAvisos()
    } catch (e) {
      // RF-15: si no alcanza el stock para pasar a "preparando", dice qué falta.
      setAvisoBloqueo({ encargo, mensaje: e.message, faltantes: e.datos?.faltantes ?? [] })
    } finally {
      setOcupado(null)
    }
  }

  function cerrarModalEliminar() {
    setABorrar(null)
    setErrorBorrar('')
  }

  async function eliminar() {
    try {
      await api(`/encargos/${aBorrar.id}`, { method: 'DELETE' })
      setABorrar(null)
      setRecargar((n) => n + 1)
      refrescarAvisos()
    } catch (e) {
      setErrorBorrar(e.message)
    }
  }

  return (
    <>
      <div className="lista-encabezado">
        <h2>PANEL DE PEDIDOS</h2>
        {items && (
          <span className="pildora">
            {items.length} {items.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        )}
      </div>

      <div className="chips" role="group" aria-label="Filtrar por estado del pedido">
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

      {items && items.length === 0 && <p className="vacio">No hay encargos en este estado.</p>}

      <div className="lista">
        {items?.map((enc) => (
          <article key={enc.id} className="encargo">
            <div className="encargo-cabecera">
              <div>
                <h3>{enc.nombre_cliente}</h3>
                <p>
                  {enc.producto.nombre} · {formatear(enc.cantidad_pedida)} unidades
                </p>
                <p className="encargo-fecha">Entrega: {formatearFecha(enc.fecha_entrega)}</p>
              </div>
              <span className={`etiqueta ${enc.completo ? 'etiqueta-ok' : 'etiqueta-critico'}`}>
                <Icono nombre={enc.completo ? 'check' : 'alerta'} tamano={14} />{' '}
                {enc.completo ? 'Completo' : 'Insuficiente'}
              </span>
            </div>

            {!enc.completo && enc.faltantes.length > 0 && (
              <ul className="encargo-faltantes">
                {enc.faltantes.map((f) => (
                  <li key={f.id_ingrediente}>
                    Faltan {formatear(f.faltante)} {f.unidad_medida} de {f.nombre}
                  </li>
                ))}
              </ul>
            )}

            <div className="encargo-acciones">
              {enc.estado === 'pendiente' && (
                <>
                  <button
                    className="boton-secundario-chico"
                    disabled={ocupado === enc.id}
                    onClick={() => cambiarEstado(enc, 'preparando')}
                  >
                    Preparar
                  </button>
                  <button
                    className="icono-boton"
                    aria-label={`Eliminar encargo de ${enc.nombre_cliente}`}
                    onClick={() => setABorrar(enc)}
                  >
                    <Icono nombre="basura" tamano={20} />
                  </button>
                </>
              )}
              {enc.estado === 'preparando' && (
                <>
                  <button
                    className="boton-secundario-chico"
                    disabled={ocupado === enc.id}
                    onClick={() => cambiarEstado(enc, 'entregado')}
                  >
                    Marcar entregado
                  </button>
                  <button
                    className="boton-texto"
                    disabled={ocupado === enc.id}
                    onClick={() => cambiarEstado(enc, 'revertir')}
                  >
                    Revertir
                  </button>
                </>
              )}
              {enc.estado === 'entregado' && <span className="encargo-entregado">Entregado</span>}
            </div>
          </article>
        ))}
      </div>

      <Link to="/encargos/nuevo" className="fab" aria-label="Nuevo encargo">
        <Icono nombre="mas" tamano={30} />
      </Link>

      {aBorrar && (
        <div className="modal-fondo" onClick={cerrarModalEliminar}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>¿Eliminar el pedido de {aBorrar.nombre_cliente}?</h2>
            {errorBorrar ? <p className="error">{errorBorrar}</p> : <p>Esta acción no se puede deshacer.</p>}
            <div className="modal-botones">
              <button className="boton-texto" onClick={cerrarModalEliminar}>
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

      {avisoBloqueo && (
        <div className="modal-fondo" onClick={() => setAvisoBloqueo(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>No se puede preparar todavía</h2>
            <p className="error">{avisoBloqueo.mensaje}</p>
            {avisoBloqueo.faltantes.length > 0 && (
              <ul>
                {avisoBloqueo.faltantes.map((f) => (
                  <li key={f.id_ingrediente}>
                    Faltan {formatear(f.faltante)} {f.unidad_medida} de {f.nombre}
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-botones">
              <button className="boton-texto" onClick={() => setAvisoBloqueo(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
