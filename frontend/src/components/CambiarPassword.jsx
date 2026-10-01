import { useState } from 'react'
import { api } from '../api.js'
import Icono from './Iconos.jsx'

// Cambiar contraseña estando logueada: la usuaria pone su contraseña actual (para
// confirmar que es ella) y la nueva. Solo ella la conoce; el backend guarda un
// hash, nunca el texto (ver backend/src/routes/auth.js).
export default function CambiarPassword({ onCerrar }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [lista, setLista] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (nueva.length < 8) return setError('La contraseña nueva debe tener al menos 8 caracteres')
    if (nueva !== confirmar) return setError('Las dos contraseñas nuevas no coinciden')

    setEnviando(true)
    try {
      await api('/auth/password', { method: 'POST', cuerpo: { actual, nueva } })
      setLista(true)
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {lista ? (
          <>
            <h2>Contraseña actualizada</h2>
            <p>La próxima vez que inicies sesión en otro dispositivo, usa la nueva contraseña.</p>
            <div className="modal-botones">
              <button className="boton-principal boton-corto" onClick={onCerrar}>
                Listo
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={guardar} noValidate>
            <h2>Cambiar contraseña</h2>

            <label htmlFor="cp-actual">Contraseña actual</label>
            <div className="campo-password">
              <span className="campo-icono"><Icono nombre="candado" tamano={20} /></span>
              <input
                id="cp-actual"
                type="password"
                autoComplete="current-password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                required
              />
            </div>

            <label htmlFor="cp-nueva">Contraseña nueva</label>
            <div className="campo-password">
              <span className="campo-icono"><Icono nombre="candado" tamano={20} /></span>
              <input
                id="cp-nueva"
                type="password"
                autoComplete="new-password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
              />
            </div>

            <label htmlFor="cp-confirmar">Repetir contraseña nueva</label>
            <div className="campo-password">
              <span className="campo-icono"><Icono nombre="candado" tamano={20} /></span>
              <input
                id="cp-confirmar"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
              />
            </div>

            {error && <p className="error" role="alert">{error}</p>}

            <div className="modal-botones">
              <button type="button" className="boton-texto" onClick={onCerrar}>
                Cancelar
              </button>
              <button type="submit" className="boton-principal boton-corto" disabled={enviando}>
                {enviando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
