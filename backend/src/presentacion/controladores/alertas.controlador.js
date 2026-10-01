// Capa de presentación: recibe, delega en logica_negocio/alertas, responde.
// RF-17 (lista de compras) y RF-18 (el punto de notificación) viven en el mismo
// módulo de negocio porque son el mismo cálculo, solo se muestran distinto.
import { Router } from 'express';
import * as alertasServicio from '../../logica_negocio/alertas/alertas.servicio.js';

export const comprasRouter = Router();
comprasRouter.get('/', async (_req, res) => {
  res.json(await alertasServicio.listaCompras());
});

export const notificacionesRouter = Router();
notificacionesRouter.get('/resumen', async (_req, res) => {
  res.json(await alertasServicio.resumen());
});
