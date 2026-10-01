// Error "esperado" que las rutas lanzan con el código HTTP y el mensaje para la usuaria.
export class ErrorHttp extends Error {
  constructor(status, mensaje, extra = {}) {
    super(mensaje);
    this.status = status;
    this.extra = extra;
  }
}

// Middleware final: convierte cualquier error en una respuesta JSON.
export function manejarErrores(err, _req, res, _next) {
  if (err instanceof ErrorHttp) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  }
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Ocurrió un error, intenta de nuevo' });
}
