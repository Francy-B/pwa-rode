import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useNotificaciones } from '../NotificacionesContext.jsx'
import Icono from '../components/Iconos.jsx'
import SelectorProducto from '../components/SelectorProducto.jsx'
import { formatear, textoCantidad } from '../unidades.js'

const aNumero = (v) => Number(String(v).trim().replace(',', '.')) || 0
const hoy = () => new Date().toLocaleDateString('en-CA') // fecha local del dispositivo, formato AAAA-MM-DD

export default function EncargoForm() {
  const navigate = useNavigate()
  const { refrescar: refrescarAvisos } = useNotificaciones()

  const [nombreCliente, setNombreCliente] = useState('')
  const [producto, setProducto] = useState(null) // { id, nombre, cantidad_base }
  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [mostrarSelector, setMostrarSelector] = useState(false)

  const [disponibilidad, setDisponibilidad] = useState(null) // null = sin consultar aún
  const [consultando, setConsultando] = useState(false)

  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Al elegir un producto, se sugiere de entrada su base como cantidad (una tanda completa).
  function elegirProducto(p) {
    setProducto(p)
    setCantidad(String(p.cantidad_base))
  }

  // RF-12, vista previa: verifica en vivo sin guardar nada, como en el mockup.
  // Si no hay producto o cantidad válida, no se consulta nada; la sección que
  // muestra `disponibilidad` ya está oculta en ese caso (ver JSX más abajo).
  useEffect(() => {
    const cant = aNumero(cantidad)
    if (!producto || cant <= 0) return
    let cancelado = false
    const espera = setTimeout(() => {
      setConsultando(true)
      api(`/productos/${producto.id}/disponibilidad?cantidad=${cant}`)
        .then((d) => !cancelado && setDisponibilidad(d))
        .catch(() => !cancelado && setDisponibilidad(null))
        .finally(() => !cancelado && setConsultando(false))
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(espera)
    }
  }, [producto, cantidad])

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!nombreCliente.trim()) return setError('El nombre del cliente es obligatorio')
    if (!producto) return setError('Selecciona un producto')
    if (aNumero(cantidad) <= 0) return setError('La cantidad debe ser mayor a 0')
    if (!fecha) return setError('Elige una fecha de entrega')

    setEnviando(true)
    try {
      // RF-11: se registra igual aunque falten ingredientes; la alerta queda en el
      // listado de Encargos, no bloquea el guardado.
      await api('/encargos', {
        method: 'POST',
        cuerpo: {
          nombre_cliente: nombreCliente,
          id_producto: producto.id,
          cantidad_pedida: aNumero(cantidad),
          fecha_entrega: fecha,
        },
      })
      refrescarAvisos()
      navigate('/encargos')
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <>
      <Link to="/encargos" className="volver">
        <Icono nombre="atras" tamano={20} /> Volver a encargos
      </Link>
      <h2 className="titulo-pagina">Nuevo encargo</h2>

      <form onSubmit={guardar} noValidate className="formulario">
        <section className="tarjeta bloque">
          <label htmlFor="cliente">Nombre o referencia del cliente</label>
          <input
            id="cliente"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            maxLength={120}
            autoComplete="off"
          />
        </section>

        <section className="tarjeta bloque">
          <label>Producto</label>
          <button type="button" className="campo-seleccion" onClick={() => setMostrarSelector(true)}>
            {producto ? producto.nombre : 'Buscar y seleccionar del catálogo...'}
          </button>
        </section>

        <section className="tarjeta bloque">
          <label htmlFor="cantidad">Cantidad de unidades</label>
          {producto && <p>Receta base: {formatear(producto.cantidad_base)} unidades.</p>}
          <input
            id="cantidad"
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="0"
          />
        </section>

        <section className="tarjeta bloque">
          <label htmlFor="fecha">Fecha de entrega</label>
          <input id="fecha" type="date" min={hoy()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </section>

        {producto && aNumero(cantidad) > 0 && (
          <section className="tarjeta bloque">
            <h3>Verificación de ingredientes</h3>
            {consultando && !disponibilidad && <p>Calculando...</p>}
            {disponibilidad && (
              <ul className="verificacion-lista">
                {disponibilidad.ingredientes.map((i) => (
                  <li key={i.id_ingrediente} className="verificacion-fila">
                    <span>{i.nombre}</span>
                    <span>{textoCantidad(i.requerido, i.unidad_medida)}</span>
                    <span className={`etiqueta ${i.faltante > 0 ? 'etiqueta-critico' : 'etiqueta-ok'}`}>
                      <Icono nombre={i.faltante > 0 ? 'alerta' : 'check'} tamano={13} />{' '}
                      {i.faltante > 0 ? 'Falta' : 'OK'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="boton-principal" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Registrar encargo'}
        </button>
        <Link to="/encargos" className="boton-texto boton-cancelar">
          Cancelar
        </Link>
      </form>

      {mostrarSelector && <SelectorProducto onElegir={elegirProducto} onCerrar={() => setMostrarSelector(false)} />}
    </>
  )
}
