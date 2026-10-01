// Capa de presentación: recibe, delega en logica_negocio/inventario, responde.
import { Router } from 'express';
import { ErrorHttp } from '../../errores.js';
import * as inventarioServicio from '../../logica_negocio/inventario/inventario.servicio.js';

const router = Router();

function leerId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ErrorHttp(404, 'Ingrediente no encontrado');
  return id;
}

// RF-04
router.get('/', async (req, res) => {
  res.json(await inventarioServicio.listar({ q: req.query.q, estado: req.query.estado }));
});

router.get('/:id', async (req, res) => {
  res.json(await inventarioServicio.obtener(leerId(req)));
});

// RF-03
router.post('/', async (req, res) => {
  res.status(201).json(await inventarioServicio.crear(req.body));
});

// RF-05
router.put('/:id', async (req, res) => {
  res.json(await inventarioServicio.actualizar(leerId(req), req.body));
});

// RF-06
router.delete('/:id', async (req, res) => {
  await inventarioServicio.eliminar(leerId(req));
  res.status(204).end();
});

export default router;
