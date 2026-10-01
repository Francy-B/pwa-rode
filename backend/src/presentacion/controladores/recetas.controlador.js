// Capa de presentación: recibe, delega en logica_negocio/recetas, responde.
import { Router } from 'express';
import { pool } from '../../db.js';
import { ErrorHttp } from '../../errores.js';
import * as recetasServicio from '../../logica_negocio/recetas/recetas.servicio.js';
import * as encargosServicio from '../../logica_negocio/encargos/encargos.servicio.js';

const router = Router();

function leerId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ErrorHttp(404, 'Producto no encontrado');
  return id;
}

function numero(valor, etiqueta) {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').trim().replace(',', '.'));
  if (valor === '' || valor == null || !Number.isFinite(n) || n <= 0) {
    throw new ErrorHttp(400, `${etiqueta} debe ser un número mayor a 0`);
  }
  return n;
}

// RF-08
router.get('/', async (req, res) => {
  res.json(await recetasServicio.listar({ q: req.query.q }));
});

router.get('/:id', async (req, res) => {
  res.json(await recetasServicio.obtener(leerId(req)));
});

// Vista previa para "Nuevo encargo" (RF-12): antes de guardar, muestra ingrediente
// por ingrediente si alcanza. Combina Recetas con Inventario, así que la orquesta
// el módulo de Encargos, dueño de esa regla.
router.get('/:id/disponibilidad', async (req, res) => {
  const id = leerId(req);
  const cantidad = numero(req.query.cantidad, 'La cantidad');
  const disponibilidad = await encargosServicio.verificarDisponibilidad(pool, id, cantidad);
  if (!disponibilidad) throw new ErrorHttp(404, 'Producto no encontrado');
  res.json(disponibilidad);
});

// RF-07
router.post('/', async (req, res) => {
  res.status(201).json(await recetasServicio.crear(req.body));
});

// RF-09
router.put('/:id', async (req, res) => {
  res.json(await recetasServicio.actualizar(leerId(req), req.body));
});

// RF-10
router.delete('/:id', async (req, res) => {
  await recetasServicio.eliminar(leerId(req));
  res.status(204).end();
});

export default router;
