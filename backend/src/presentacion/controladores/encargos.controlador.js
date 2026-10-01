// Capa de presentación: recibe, delega en logica_negocio/encargos, responde.
import { Router } from 'express';
import { ErrorHttp } from '../../errores.js';
import * as encargosServicio from '../../logica_negocio/encargos/encargos.servicio.js';

const router = Router();

function leerId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ErrorHttp(404, 'Encargo no encontrado');
  return id;
}

// RF-13
router.get('/', async (req, res) => {
  res.json(await encargosServicio.listar({ estado: req.query.estado }));
});

router.get('/:id', async (req, res) => {
  res.json(await encargosServicio.obtener(leerId(req)));
});

// RF-11
router.post('/', async (req, res) => {
  res.status(201).json(await encargosServicio.crear(req.body));
});

// RF-14 + RF-15
router.post('/:id/estado', async (req, res) => {
  res.json(await encargosServicio.cambiarEstado(leerId(req), req.body?.accion));
});

// RF-16
router.delete('/:id', async (req, res) => {
  await encargosServicio.eliminar(leerId(req));
  res.status(204).end();
});

export default router;
