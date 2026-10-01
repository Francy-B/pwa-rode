// Módulo "Gestión de encargos" (RF-11 a RF-16, Figura X). Para saber la receta de
// un producto o tocar el stock de un ingrediente, llama a los módulos de Recetas
// e Inventario por su interfaz — nunca consulta `producto_ingrediente` ni
// `ingrediente` directamente.
import { conTransaccion, pool } from '../../db.js';
import { ErrorHttp } from '../../errores.js';
import { desdeBase } from '../../unidades.js';
import * as encargosRepo from '../../persistencia/encargos.repositorio.js';
import * as recetasServicio from '../recetas/recetas.servicio.js';
import * as inventarioServicio from '../inventario/inventario.servicio.js';

const ESTADOS = ['pendiente', 'preparando', 'entregado'];

function numero(valor, etiqueta) {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').trim().replace(',', '.'));
  if (valor === '' || valor == null || !Number.isFinite(n) || n < 0 || n > 999999) {
    throw new ErrorHttp(400, `${etiqueta} debe ser un número mayor a 0`);
  }
  return n;
}

// El "día de hoy" de la usuaria, no el del servidor (RF-11). Se compara como texto
// porque fecha_entrega es DATE y viaja como 'YYYY-MM-DD' (ver dateStrings en db.js).
function hoyBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function leerCuerpo(b = {}) {
  const nombreCliente = String(b.nombre_cliente ?? '').trim();
  if (!nombreCliente) throw new ErrorHttp(400, 'El nombre del cliente es obligatorio');
  if (nombreCliente.length > 120) throw new ErrorHttp(400, 'El nombre del cliente es demasiado largo');

  const idProducto = Number(b.id_producto);
  if (!Number.isInteger(idProducto) || idProducto < 1) throw new ErrorHttp(400, 'Selecciona un producto');

  const cantidadPedida = numero(b.cantidad_pedida, 'La cantidad pedida');
  if (cantidadPedida <= 0) throw new ErrorHttp(400, 'La cantidad pedida debe ser mayor a 0');

  const fechaEntrega = String(b.fecha_entrega ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega)) throw new ErrorHttp(400, 'La fecha de entrega no es válida');
  if (fechaEntrega < hoyBogota()) throw new ErrorHttp(400, 'La fecha de entrega no puede ser anterior a hoy');

  return { nombreCliente, idProducto, cantidadPedida, fechaEntrega };
}

// RF-12: compara lo que pide un encargo con el inventario real, combinando la
// receta (Recetas) con el stock (Inventario). Solo informa, no descuenta nada.
export async function verificarDisponibilidad(conexion = pool, idProducto, cantidadPedida) {
  const receta = await recetasServicio.obtenerCantidadBaseYLineas(idProducto, conexion);
  if (!receta) return null;

  const factor = cantidadPedida / receta.cantidadBase;
  const ids = receta.lineas.map((l) => l.id_ingrediente);
  const infoPorId = new Map((await inventarioServicio.obtenerVarios(ids, conexion)).map((i) => [i.id_ingrediente, i]));

  const ingredientes = receta.lineas.map((l) => {
    const info = infoPorId.get(l.id_ingrediente);
    const requeridoBase = Number(l.cantidad_necesaria) * factor;
    const stockBase = Number(info.stock);
    const faltanteBase = Math.max(0, Math.round((requeridoBase - stockBase) * 1000) / 1000);
    return {
      id_ingrediente: l.id_ingrediente,
      nombre: info.nombre,
      unidad_medida: info.unidad_medida,
      requerido: desdeBase(requeridoBase, info.unidad_medida),
      disponible: desdeBase(stockBase, info.unidad_medida),
      faltante: desdeBase(faltanteBase, info.unidad_medida),
    };
  });

  return { completo: ingredientes.every((l) => l.faltante === 0), ingredientes };
}

// RF-15: descuenta lo que exige la receta escalada. Todo o nada: si algo no
// alcanza, no se descuenta nada. Deja registrado cada movimiento (vía Inventario)
// para poder revertirlo con exactitud después, aunque la receta cambie.
async function descontarIngredientes(conexion, idEncargo, idProducto, cantidadPedida) {
  const receta = await recetasServicio.obtenerCantidadBaseYLineas(idProducto, conexion);
  const factor = cantidadPedida / receta.cantidadBase;
  const ids = receta.lineas.map((l) => l.id_ingrediente);

  // Bloquea las filas de Inventario mientras se decide (dos encargos no pueden
  // leer el mismo stock "libre" al mismo tiempo).
  const infoPorId = new Map(
    (await inventarioServicio.bloquearYObtenerVarios(ids, conexion)).map((i) => [i.id_ingrediente, i])
  );

  const calculadas = receta.lineas.map((l) => {
    const info = infoPorId.get(l.id_ingrediente);
    return {
      id_ingrediente: l.id_ingrediente,
      nombre: info.nombre,
      unidad_medida: info.unidad_medida,
      stockActual: Number(info.stock),
      requeridoBase: Math.round(Number(l.cantidad_necesaria) * factor * 1000) / 1000,
    };
  });

  const faltantes = calculadas
    .filter((l) => l.requeridoBase > l.stockActual)
    .map((l) => ({
      id_ingrediente: l.id_ingrediente,
      nombre: l.nombre,
      unidad_medida: l.unidad_medida,
      faltante: desdeBase(Math.round((l.requeridoBase - l.stockActual) * 1000) / 1000, l.unidad_medida),
    }));

  if (faltantes.length > 0) {
    throw new ErrorHttp(409, 'No hay stock suficiente para preparar este pedido', { faltantes });
  }

  for (const l of calculadas) {
    await inventarioServicio.aplicarMovimiento(conexion, l.id_ingrediente, -l.requeridoBase, 'descuento', idEncargo);
  }
}

// RF-14: revierte exactamente lo que se descontó la ÚLTIMA vez que este encargo
// pasó a "preparando" (no recalcula con la receta actual, que pudo cambiar desde
// entonces). Le pide a Inventario cuáles son esos movimientos sin revertir.
async function revertirDescuento(conexion, idEncargo) {
  const movimientos = await inventarioServicio.descuentosSinRevertir(conexion, idEncargo);
  for (const m of movimientos) {
    const cantidad = Math.abs(Number(m.cantidad));
    await inventarioServicio.aplicarMovimiento(conexion, m.id_ingrediente, cantidad, 'reversion', idEncargo);
  }
}

// RF-12/RF-13: cada encargo lleva pegado si el inventario le alcanza ahora mismo,
// la receta ya escalada ("porciones exactas", RF-13) y el detalle de lo que falta.
// Solo un pedido "pendiente" puede estar corto de inventario: uno ya en
// "preparando" o "entregado" ya descontó sus ingredientes con éxito (todo o
// nada, RF-15), así que no puede "faltarle" nada después aunque el stock
// general baje por otros motivos.
async function aApi(conexion, fila) {
  const disponibilidad = await verificarDisponibilidad(conexion, fila.id_producto, Number(fila.cantidad_pedida));
  const pendienteDeStock = fila.estado === 'pendiente';
  return {
    id: fila.id_encargo,
    nombre_cliente: fila.nombre_cliente,
    producto: { id: fila.id_producto, nombre: fila.producto_nombre },
    cantidad_pedida: Number(fila.cantidad_pedida),
    fecha_entrega: fila.fecha_entrega,
    estado: fila.estado,
    completo: pendienteDeStock ? disponibilidad?.completo ?? true : true,
    receta: disponibilidad?.ingredientes ?? [],
    faltantes: pendienteDeStock && disponibilidad ? disponibilidad.ingredientes.filter((i) => i.faltante > 0) : [],
  };
}

async function leerFila(id, conexion = pool) {
  const fila = await encargosRepo.obtenerPorId(id, conexion);
  if (!fila) throw new ErrorHttp(404, 'Encargo no encontrado');
  return fila;
}

// ---------- RF-13: consultar (panel por estado) ----------
export async function listar({ estado = 'todos' } = {}) {
  if (estado !== 'todos' && !ESTADOS.includes(estado)) {
    throw new ErrorHttp(400, 'El filtro de estado no es válido');
  }
  const filas = await encargosRepo.listar({ estado });
  return Promise.all(filas.map((f) => aApi(pool, f)));
}

export async function obtener(id) {
  return aApi(pool, await leerFila(id));
}

// ---------- RF-11: registrar encargo ----------
// Se guarda aunque falten ingredientes: queda "pendiente" con la alerta calculada
// al vuelo (RF-12). El bloqueo por falta de stock ocurre después, al pasar a
// "preparando" (RF-15).
export async function crear(datos) {
  const d = leerCuerpo(datos);
  const id = await conTransaccion(async (c) => {
    // El producto debe existir y seguir en el catálogo (se le pregunta a Recetas).
    const producto = await recetasServicio.nombreYActivo(d.idProducto, c);
    if (!producto) throw new ErrorHttp(400, 'El producto seleccionado no existe');
    if (!producto.activo) throw new ErrorHttp(400, 'Ese producto ya no está disponible en el catálogo');
    return encargosRepo.crear(d, c);
  });
  return obtener(id);
}

// ---------- RF-14 + RF-15: cambiar de estado ----------
export async function cambiarEstado(id, accion) {
  if (!['preparando', 'entregado', 'revertir'].includes(accion)) {
    throw new ErrorHttp(400, 'La acción no es válida');
  }

  await conTransaccion(async (c) => {
    const enc = await encargosRepo.obtenerParaCambiarEstado(id, c);
    if (!enc) throw new ErrorHttp(404, 'Encargo no encontrado');

    if (enc.estado === 'entregado') {
      throw new ErrorHttp(409, 'Este pedido ya fue entregado y no se puede modificar');
    }

    if (accion === 'preparando') {
      if (enc.estado !== 'pendiente') throw new ErrorHttp(409, 'Solo un pedido pendiente puede pasar a preparando');
      await descontarIngredientes(c, id, enc.id_producto, Number(enc.cantidad_pedida));
      await encargosRepo.cambiarEstado(id, 'preparando', c);
    } else if (accion === 'entregado') {
      if (enc.estado !== 'preparando') {
        throw new ErrorHttp(409, 'Solo un pedido en preparación puede marcarse como entregado');
      }
      await encargosRepo.cambiarEstado(id, 'entregado', c);
    } else {
      if (enc.estado !== 'preparando') {
        throw new ErrorHttp(409, 'Solo se puede revertir un pedido que está en preparación');
      }
      await revertirDescuento(c, id);
      await encargosRepo.cambiarEstado(id, 'pendiente', c);
    }
  });

  return obtener(id);
}

// ---------- RF-16: eliminar (solo si está pendiente) ----------
export async function eliminar(id) {
  const eliminado = await encargosRepo.eliminarSiPendiente(id);
  if (!eliminado) {
    const estado = await encargosRepo.obtenerEstado(id);
    if (!estado) throw new ErrorHttp(404, 'Encargo no encontrado');
    throw new ErrorHttp(409, `No se puede eliminar: el pedido está en estado "${estado}"`);
  }
}

// ---------- Interfaz para el módulo de Alertas (RF-17) ----------
export async function pendientesCrudo(conexion) {
  return encargosRepo.obtenerPendientes(conexion);
}

// ---------- Interfaz para el módulo de Recetas (RF-10) ----------
// Clientes con un encargo de este producto todavía pendiente o en preparación
// (ni entregado ni eliminado). Si la lista viene vacía, Recetas puede eliminarlo.
export async function clientesConEncargoActivo(idProducto, conexion) {
  return encargosRepo.activosDeProducto(idProducto, conexion);
}
