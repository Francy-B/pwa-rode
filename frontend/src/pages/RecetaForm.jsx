import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import Icono from '../components/Iconos.jsx'
import SelectorIngredientes from '../components/SelectorIngredientes.jsx'
import { UNIDADES, familiaDe } from '../unidades.js'

const aNumero = (v) => Number(String(v).trim().replace(',', '.')) || 0

export default function RecetaForm() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()

  const [nombre, setNombre] = useState('')
  const [cantidadBase, setCantidadBase] = useState('')
  // Cada línea: { id_ingrediente, nombre, unidad_ingrediente, cantidad, unidad }
  const [lineas, setLineas] = useState([])
  const [mostrarSelector, setMostrarSelector] = useState(false)
  const [cargando, setCargando] = useState(editando)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!editando) return
    api(`/productos/${id}`)
      .then((p) => {
        setNombre(p.nombre)
        setCantidadBase(String(p.cantidad_base))
        setLineas(
          p.ingredientes.map((l) => ({
            id_ingrediente: l.id_ingrediente,
            nombre: l.nombre,
            unidad_ingrediente: l.unidad_ingrediente,
            cantidad: String(l.cantidad),
            unidad: l.unidad,
          }))
        )
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [id, editando])

  // Los recién elegidos entran con cantidad vacía y la unidad propia del ingrediente,
  // para que solo falte escribir cuánto se necesita.
  function agregarLineas(nuevos) {
    setLineas((prev) => [
      ...prev,
      ...nuevos.map((i) => ({
        id_ingrediente: i.id,
        nombre: i.nombre,
        unidad_ingrediente: i.unidad_medida,
        cantidad: '',
        unidad: i.unidad_medida,
      })),
    ])
  }

  const quitarLinea = (idIngrediente) =>
    setLineas((prev) => prev.filter((l) => l.id_ingrediente !== idIngrediente))

  const cambiarLinea = (idIngrediente, campo) => (valor) =>
    setLineas((prev) => prev.map((l) => (l.id_ingrediente === idIngrediente ? { ...l, [campo]: valor } : l)))

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) return setError('El nombre del producto es obligatorio')
    if (aNumero(cantidadBase) <= 0) return setError('La base de la receta debe ser mayor a 0')
    if (lineas.length === 0) return setError('Agrega al menos un ingrediente a la receta')
    for (const l of lineas) {
      if (aNumero(l.cantidad) <= 0) return setError(`Falta la cantidad de ${l.nombre}`)
    }

    setEnviando(true)
    try {
      const cuerpo = {
        nombre,
        cantidad_base: aNumero(cantidadBase),
        ingredientes: lineas.map((l) => ({
          id_ingrediente: l.id_ingrediente,
          cantidad: aNumero(l.cantidad),
          unidad: l.unidad,
        })),
      }
      await api(editando ? `/productos/${id}` : '/productos', {
        method: editando ? 'PUT' : 'POST',
        cuerpo,
      })
      navigate('/recetas')
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  if (cargando) return <div className="cargando" aria-busy="true" />

  return (
    <>
      <Link to="/recetas" className="volver">
        <Icono nombre="atras" tamano={20} /> Volver a recetas
      </Link>
      <h2 className="titulo-pagina">{editando ? 'Editar producto' : 'Nuevo producto'}</h2>

      <form onSubmit={guardar} noValidate className="formulario">
        <section className="tarjeta bloque">
          <label htmlFor="nombre">Nombre del producto</label>
          <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} autoComplete="off" />
        </section>

        <section className="tarjeta bloque">
          <label htmlFor="base">Unidad base de la receta</label>
          <p>¿Para cuántas unidades rinde? Ej: 10 galletas.</p>
          <input
            id="base"
            inputMode="decimal"
            value={cantidadBase}
            onChange={(e) => setCantidadBase(e.target.value)}
            placeholder="10"
          />
        </section>

        <section className="tarjeta bloque">
          <div className="bloque-encabezado">
            <div>
              <h3>Ingredientes de la receta</h3>
              <p>Selecciona todos los que necesites de una vez.</p>
            </div>
            <button type="button" className="boton-secundario-chico" onClick={() => setMostrarSelector(true)}>
              <Icono nombre="mas" tamano={18} /> Agregar
            </button>
          </div>

          {lineas.length === 0 && <p className="vacio vacio-bloque">Todavía no has agregado ingredientes.</p>}

          <div className="lineas-receta">
            {lineas.map((l) => (
              <div key={l.id_ingrediente} className="linea-receta">
                <span className="linea-nombre">{l.nombre}</span>
                <input
                  className="linea-cantidad"
                  inputMode="decimal"
                  value={l.cantidad}
                  onChange={(e) => cambiarLinea(l.id_ingrediente, 'cantidad')(e.target.value)}
                  placeholder="0"
                  aria-label={`Cantidad de ${l.nombre}`}
                />
                <select
                  className="linea-unidad"
                  value={l.unidad}
                  onChange={(e) => cambiarLinea(l.id_ingrediente, 'unidad')(e.target.value)}
                  aria-label={`Unidad de ${l.nombre}`}
                >
                  {UNIDADES.filter((u) => familiaDe(u.valor) === familiaDe(l.unidad_ingrediente)).map((u) => (
                    <option key={u.valor} value={u.valor}>
                      {u.corto}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icono-boton"
                  aria-label={`Quitar ${l.nombre}`}
                  onClick={() => quitarLinea(l.id_ingrediente)}
                >
                  <Icono nombre="basura" tamano={20} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="boton-principal" disabled={enviando}>
          {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar producto'}
        </button>
        <Link to="/recetas" className="boton-texto boton-cancelar">
          Cancelar
        </Link>
      </form>

      {mostrarSelector && (
        <SelectorIngredientes
          yaAgregados={lineas.map((l) => l.id_ingrediente)}
          onAgregar={agregarLineas}
          onCerrar={() => setMostrarSelector(false)}
        />
      )}
    </>
  )
}
