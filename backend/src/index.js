import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';
import authControlador from './presentacion/controladores/auth.controlador.js';
import inventarioControlador from './presentacion/controladores/inventario.controlador.js';
import recetasControlador from './presentacion/controladores/recetas.controlador.js';
import encargosControlador from './presentacion/controladores/encargos.controlador.js';
import { comprasRouter, notificacionesRouter } from './presentacion/controladores/alertas.controlador.js';
import { requiereSesion } from './presentacion/sesion.js';
import { manejarErrores } from './errores.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authControlador);
// Todo lo que cuelga de aquí exige sesión iniciada.
app.use('/api/ingredientes', requiereSesion, inventarioControlador);
app.use('/api/productos', requiereSesion, recetasControlador);
app.use('/api/encargos', requiereSesion, encargosControlador);
app.use('/api/compras', requiereSesion, comprasRouter);
app.use('/api/notificaciones', requiereSesion, notificacionesRouter);

// Ruta de prueba: confirma que el servidor responde y que llega a la base de datos.
app.get('/api/salud', async (_req, res) => {
  try {
    const [[fila]] = await pool.query(
      'SELECT DATABASE() AS base, COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema = DATABASE()'
    );
    res.json({ ok: true, base: fila.base, tablas: fila.tablas });
  } catch (err) {
    console.error('Error de base de datos:', err.code, err.message);
    res.status(500).json({ ok: false, error: 'No se pudo conectar a la base de datos' });
  }
});

app.use(manejarErrores);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API de RODE escuchando en http://localhost:${port}`));
