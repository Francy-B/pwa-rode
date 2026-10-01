// Parte de la "capa de presentación" (Figura X): verifica que quien hace la
// petición tenga una sesión activa. No contiene reglas de negocio.
import jwt from 'jsonwebtoken';
import * as usuarioRepo from '../persistencia/usuario.repositorio.js';

if (!process.env.JWT_SECRET) {
  throw new Error('Falta JWT_SECRET en el archivo .env');
}

export const COOKIE = 'rode_token';

// httpOnly: JavaScript de la página no puede leer la cookie (protege contra robo por XSS).
// maxAge 400 días: el máximo que aceptan los navegadores. Se renueva en cada uso,
// así la sesión dura hasta que la usuaria cierre sesión.
export const opcionesCookie = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 400 * 24 * 60 * 60 * 1000,
  path: '/',
};

// El token NO tiene fecha de vencimiento: es válido mientras exista su fila en `sesion`.
export function firmarToken(idUsuario, idSesion) {
  return jwt.sign({ sub: idUsuario, sid: idSesion }, process.env.JWT_SECRET);
}

// Filtro para las rutas privadas.
export async function requiereSesion(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.clearCookie(COOKIE, { path: '/' });
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  // La sesión debe seguir existiendo (se borra al cerrar sesión).
  const viva = await usuarioRepo.renovarUso(payload.sid, payload.sub);
  if (!viva) {
    res.clearCookie(COOKIE, { path: '/' });
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  req.usuario = { id: payload.sub };
  req.idSesion = payload.sid;
  res.cookie(COOKIE, token, opcionesCookie); // renueva la duración
  next();
}
