import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import InstalarPWA from '../components/InstalarPWA.jsx'
import logoRode from '../assets/logo-rode.webp'

const Candado = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /><circle cx="12" cy="15.5" r="1" fill="currentColor" />
  </svg>
)
const Ojo = ({ tachado }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {tachado && <path d="M4 4l16 16" />}
  </svg>
)
const Entrar = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 8l4 4-4 4M14 12H4" />
  </svg>
)

export default function Login() {
  const { iniciarSesion } = useAuth()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await iniciarSesion(correo, password)
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <main className="pantalla login">
      <header className="login-marca">
        <img src={logoRode} alt="RODE Patisserie — hecho con amor, para ti" className="login-logo" />
      </header>

      <form onSubmit={enviar} noValidate>
        <label htmlFor="correo">Correo</label>
        <input
          id="correo"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="ejemplo@rodepatisserie.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />

        <label htmlFor="password">Contraseña de Acceso</label>
        <div className="campo-password">
          <span className="campo-icono"><Candado /></span>
          <input
            id="password"
            type={verPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="campo-ojo"
            onClick={() => setVerPassword((v) => !v)}
            aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ojo tachado={verPassword} />
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="boton-principal" disabled={enviando || !correo || !password}>
          <Entrar /> {enviando ? 'Ingresando…' : 'Iniciar Sesión'}
        </button>
      </form>

      <InstalarPWA />
    </main>
  )
}
