// Capa de presentación: recibe la petición HTTP, valida la sesión cuando aplica,
// y entrega la respuesta. No contiene reglas de negocio (Figura X).
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import * as usuarioRepo from '../../persistencia/usuario.repositorio.js';
import { COOKIE, opcionesCookie, firmarToken, requiereSesion } from '../sesion.js';

const router = Router();

// Hash de mentira: si el correo no existe igual se compara contra este, para que
// la respuesta tarde lo mismo y no se pueda averiguar qué correos están registrados.
const HASH_FALSO = await bcrypt.hash('contraseña-inexistente', 12);

// RF-01: iniciar sesión
router.post('/login', async (req, res) => {
  const correo = String(req.body?.correo ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const usuario = await usuarioRepo.obtenerPorCorreo(correo);
  const coincide = await bcrypt.compare(password, usuario?.password_hash ?? HASH_FALSO);
  if (!usuario || !coincide) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }

  const idSesion = randomUUID();
  await usuarioRepo.crearSesion(idSesion, usuario.id_usuario);
  res.cookie(COOKIE, firmarToken(usuario.id_usuario, idSesion), opcionesCookie);
  res.json({ correo: usuario.correo });
});

// RF-02: cerrar sesión. Borra la fila: ese token deja de servir.
router.post('/logout', requiereSesion, async (req, res) => {
  await usuarioRepo.borrarSesion(req.idSesion);
  res.clearCookie(COOKIE, { path: '/' });
  res.status(204).end();
});

// Al abrir la app, el frontend pregunta aquí si ya hay sesión: si responde 200
// entra directo al panel; si responde 401 muestra el login.
router.get('/me', requiereSesion, async (req, res) => {
  const usuario = await usuarioRepo.obtenerPorId(req.usuario.id);
  res.json({ correo: usuario.correo });
});

// Cambiar contraseña estando logueada: pide la actual para confirmar que es
// realmente la usuaria, y exige la misma regla mínima que al crear el usuario.
router.post('/password', requiereSesion, async (req, res) => {
  const actual = String(req.body?.actual ?? '');
  const nueva = String(req.body?.nueva ?? '');

  if (nueva.length < 8) {
    return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres' });
  }

  const usuario = await usuarioRepo.obtenerPorId(req.usuario.id);
  const coincide = await bcrypt.compare(actual, usuario.password_hash);
  if (!coincide) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  }
  if (actual === nueva) {
    return res.status(400).json({ error: 'La contraseña nueva debe ser distinta a la actual' });
  }

  const hash = await bcrypt.hash(nueva, 12);
  await usuarioRepo.actualizarPassword(req.usuario.id, hash);
  // Por seguridad, cierra la sesión en cualquier OTRO dispositivo; este sigue activo.
  await usuarioRepo.borrarOtrasSesiones(req.usuario.id, req.idSesion);
  res.status(204).end();
});

export default router;
