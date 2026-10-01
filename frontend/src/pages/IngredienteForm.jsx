import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useNotificaciones } from '../NotificacionesContext.jsx'
import Icono from '../components/Iconos.jsx'
import { UNIDADES, PASO, familiaDe, corto, convertir } from '../unidades.js'

const aNumero = (v) => Number(String(v).trim().replace(',', '.')) || 0

// Campo numérico con botones − y +.
function Cantidad({ valor, onCambio, unidad, etiqueta }) {
  const sumar = (d) => onCambio(String(Math.max(0, Math.round((aNumero(valor) + d) * 1000) / 1000)))
  return (
    <div className="cantidad">
      <button type="button" onClick={() => sumar(-PASO[unidad])} aria-label={`Restar a ${etiqueta}`}>
        <Icono nombre="menos" />
      </button>
      <input
        inputMode="decimal"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-label={etiqueta}
      />
      <span>{corto(unidad)}</span>
      <button type="button" onClick={() => sumar(PASO[unidad])} aria-label={`Sumar a ${etiqueta}`}>
        <Icono nombre="mas" />
      </button>
    </div>
  )
}

export default function IngredienteForm() {
  const { id } = useParams()
  const editando = Boolean(id)
  const navigate = useNavigate()
  const { refrescar: refrescarAvisos } = useNotificaciones()

  const [form, setForm] = useState({ nombre: '', unidad_medida: 'gr', stock: '0', umbral_critico: '0' })
  const [familia, setFamilia] = useState(null) // al editar, la unidad solo cambia dentro de su familia
  const [cargando, setCargando] = useState(editando)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!editando) return
    api(`/ingredientes/${id}`)
      .then((i) => {
        setForm({
          nombre: i.nombre,
          unidad_medida: i.unidad_medida,
          stock: String(i.stock),
          umbral_critico: String(i.umbral_critico),
        })
        setFamilia(familiaDe(i.unidad_medida))
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [id, editando])

  const cambiar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  // Al EDITAR, la cantidad ya es real (viene guardada): si cambias de kg a gr se
  // convierte para no alterarla (2 kg -> 2000 g).
  // Al CREAR no hay todavía una cantidad "real" que proteger: cambiar la unidad solo
  // cambia la etiqueta y dejar el número tal cual evita interpretar mal lo ya escrito
  // (si no, escribir "2" en gramos y luego elegir "kg" lo convertiría a 0,002).
  function elegirUnidad(nueva) {
    setForm((f) => ({
      ...f,
      unidad_medida: nueva,
      ...(editando && {
        stock: String(convertir(aNumero(f.stock), f.unidad_medida, nueva)),
        umbral_critico: String(convertir(aNumero(f.umbral_critico), f.unidad_medida, nueva)),
      }),
    }))
  }

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    setEnviando(true)
    try {
      await api(editando ? `/ingredientes/${id}` : '/ingredientes', {
        method: editando ? 'PUT' : 'POST',
        cuerpo: form,
      })
      refrescarAvisos()
      navigate('/inventario')
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  if (cargando) return <div className="cargando" aria-busy="true" />

  return (
    <>
      <Link to="/inventario" className="volver">
        <Icono nombre="atras" tamano={20} /> Volver a inventario
      </Link>
      <h2 className="titulo-pagina">{editando ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h2>

      <form onSubmit={guardar} noValidate className="formulario">
        <section className="tarjeta bloque">
          <label htmlFor="nombre">Nombre del ingrediente</label>
          <input
            id="nombre"
            value={form.nombre}
            onChange={(e) => cambiar('nombre')(e.target.value)}
            maxLength={120}
            autoComplete="off"
          />
        </section>

        <section className="tarjeta bloque">
          <h3>Cantidad disponible (Stock)</h3>
          <p>Añade aquí la cantidad de tu compra.</p>
          <Cantidad
            valor={form.stock}
            onCambio={cambiar('stock')}
            unidad={form.unidad_medida}
            etiqueta="cantidad disponible"
          />
        </section>

        <section className="tarjeta bloque">
          <h3>Unidad de medida</h3>
          <div className="unidades" role="radiogroup" aria-label="Unidad de medida">
            {UNIDADES.map((u) => {
              const bloqueada = editando && familia && familiaDe(u.valor) !== familia
              return (
                <button
                  type="button"
                  key={u.valor}
                  role="radio"
                  aria-checked={form.unidad_medida === u.valor}
                  disabled={bloqueada}
                  title={bloqueada ? 'No se puede cambiar entre peso, volumen y unidades' : undefined}
                  className={`unidad ${form.unidad_medida === u.valor ? 'unidad-activa' : ''}`}
                  onClick={() => elegirUnidad(u.valor)}
                >
                  {u.nombre}
                  <small>{u.corto}</small>
                </button>
              )
            })}
          </div>
        </section>

        <section className="tarjeta bloque">
          <h3>Stock mínimo</h3>
          <p>Cuando la cantidad disponible llegue a este número, te avisamos para comprar.</p>
          <Cantidad
            valor={form.umbral_critico}
            onCambio={cambiar('umbral_critico')}
            unidad={form.unidad_medida}
            etiqueta="stock mínimo"
          />
        </section>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="boton-principal" disabled={enviando}>
          {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar ingrediente'}
        </button>
        <Link to="/inventario" className="boton-texto boton-cancelar">
          Cancelar
        </Link>
      </form>
    </>
  )
}
