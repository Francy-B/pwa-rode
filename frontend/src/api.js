// Cliente mínimo para hablar con el backend. La cookie de sesión viaja sola
// (mismo origen), por eso no hay que manejar ningún token aquí.
export async function api(ruta, { method = 'GET', cuerpo } = {}) {
  const res = await fetch(`/api${ruta}`, {
    method,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const datos = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(datos?.error ?? 'Ocurrió un error, intenta de nuevo')
    error.status = res.status
    error.datos = datos // datos extra del backend, ej. las recetas que usan un ingrediente
    throw error
  }
  return datos
}
