// Módulo "Gestión de recetas" (RF-07 a RF-10, Figura X). Concentra las reglas de
// producto y receta. Para validar ingredientes no consulta la tabla `ingrediente`:
// se lo pide al módulo de Inventario, a través de su interfaz.
import { conTransaccion, pool } from '../../db.js';
import { ErrorHttp } from '../../errores.js';
import { aBase, desdeBase, esUnidad, mismaFamilia, familiaDe } from '../../unidades.js';
import * as recetasRepo from '../../persistencia/recetas.repositorio.js';
import * as inventarioServicio from '../inventario/inventario.servicio.js';
import * as encargosServicio from '../encargos/encargos.servicio.js';

function numero(valor, etiqueta) {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').trim().replace(',', '.'));
  if (valor === '' || valor == null || !Number.isFinite(n) || n < 0 || n > 999999) {
    throw new ErrorHttp(400, `${etiqueta} debe ser un número mayor a 0`);
  }
  return n;
}

const duplicado = (err) =>
  err.code === 'ER_DUP_ENTRY' ? new ErrorHttp(409, 'Ya existe un producto con ese nombre') : err;

// Valida la lista de ingredientes de la receta: existencia y unidad de compra se
// piden a Inventario (su interfaz), nunca a la tabla `ingrediente` directamente.
async function validarLineas(conexion, input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ErrorHttp(400, 'La receta debe tener al menos un ingrediente');
  }
  const ids = input.map((l) => Number(l?.id_ingrediente));
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new ErrorHttp(400, 'Hay un ingrediente inválido en la receta');
  }
  if (new Set(ids).size !== ids.length) {
    throw new ErrorHttp(400, 'La receta no puede tener el mismo ingrediente dos veces');
  }

  const filas = await inventarioServicio.obtenerVarios(ids, conexion);
  const unidadDe = new Map(filas.map((f) => [f.id_ingrediente, f.unidad_medida]));

  return input.map((linea, i) => {
    const idIngrediente = ids[i];
    const unidadIngrediente = unidadDe.get(idIngrediente);
    if (!unidadIngrediente) throw new ErrorHttp(400, 'Uno de los ingredientes de la receta ya no existe');

    if (!esUnidad(linea?.unidad)) throw new ErrorHttp(400, 'La unidad de un ingrediente de la receta no es válida');
    if (!mismaFamilia(linea.unidad, unidadIngrediente)) {
      throw new ErrorHttp(
        400,
        `Ese ingrediente se compra por ${familiaDe(unidadIngrediente)}; usa una unidad de esa misma familia en la receta`
      );
    }
    const cantidad = numero(linea?.cantidad, 'La cantidad de un ingrediente de la receta');
    if (cantidad <= 0) throw new ErrorHttp(400, 'La cantidad de cada ingrediente debe ser mayor a 0');
    return { idIngrediente, unidad: linea.unidad, cantidadBase: aBase(cantidad, linea.unidad) };
  });
}

async function detalle(id, conexion = pool) {
  const p = await recetasRepo.obtenerPorId(id, conexion);
  if (!p) throw new ErrorHttp(404, 'Producto no encontrado');
  const lineas = await recetasRepo.obtenerLineas(id, conexion);
  return {
    id: p.id_producto,
    nombre: p.nombre,
    cantidad_base: Number(p.cantidad_base),
    activo: Boolean(p.activo),
    ingredientes: lineas.map((l) => ({
      id_ingrediente: l.id_ingrediente,
      nombre: l.nombre,
      unidad_ingrediente: l.unidad_ingrediente,
      cantidad: desdeBase(Number(l.cantidad_necesaria), l.unidad),
      unidad: l.unidad,
    })),
  };
}

function leerNombreYBase(b = {}) {
  const nombre = String(b.nombre ?? '').trim();
  if (!nombre) throw new ErrorHttp(400, 'El nombre del producto es obligatorio');
  if (nombre.length > 120) throw new ErrorHttp(400, 'El nombre es demasiado largo');
  const cantidadBase = numero(b.cantidad_base, 'La base de la receta');
  if (cantidadBase <= 0) throw new ErrorHttp(400, 'La base de la receta debe ser mayor a 0');
  return { nombre, cantidadBase };
}

// ---------- RF-08: catálogo (solo productos activos) ----------
export async function listar({ q } = {}) {
  const filas = await recetasRepo.listar({ q });
  return filas.map((f) => ({ id: f.id_producto, nombre: f.nombre, cantidad_base: Number(f.cantidad_base) }));
}

export async function obtener(id) {
  return detalle(id);
}

// ---------- RF-07: crear producto y receta en un solo paso ----------
// Si el nombre ya lo tenía un producto ELIMINADO, se reactiva ese mismo producto
// (con los datos nuevos) en vez de fallar por nombre duplicado. Así conserva su id,
// y cualquier encargo antiguo que ya lo referenciaba vuelve a quedar consistente,
// en lugar de quedar huérfano apuntando a un producto que ya nadie ve.
export async function crear(datos) {
  const { nombre, cantidadBase } = leerNombreYBase(datos);
  const id = await conTransaccion(async (c) => {
    const lineas = await validarLineas(c, datos?.ingredientes);
    const existente = await recetasRepo.obtenerPorNombreBloqueando(nombre, c);

    let idProducto;
    if (existente && !existente.activo) {
      idProducto = existente.id_producto;
      await recetasRepo.reactivar(idProducto, { cantidadBase }, c);
    } else {
      try {
        idProducto = await recetasRepo.crear({ nombre, cantidadBase }, c);
      } catch (err) {
        throw duplicado(err); // nombre ya usado por un producto activo: sigue siendo error
      }
    }
    await recetasRepo.reemplazarLineas(idProducto, lineas, c);
    return idProducto;
  });
  return detalle(id);
}

// ---------- RF-09: editar producto y receta ----------
// Reemplaza la receta completa: cubre añadir, quitar o cambiar cantidades en un
// solo paso, sin calcular la diferencia línea por línea.
export async function actualizar(id, datos) {
  const { nombre, cantidadBase } = leerNombreYBase(datos);
  await conTransaccion(async (c) => {
    const actual = await recetasRepo.obtenerPorIdBloqueando(id, c);
    if (!actual) throw new ErrorHttp(404, 'Producto no encontrado');

    const lineas = await validarLineas(c, datos?.ingredientes);
    try {
      await recetasRepo.actualizar(id, { nombre, cantidadBase }, c);
    } catch (err) {
      throw duplicado(err);
    }
    await recetasRepo.reemplazarLineas(id, lineas, c);
  });
  return detalle(id);
}

// ---------- RF-10: eliminar producto ----------
// "Eliminar" = activo 0: sale del catálogo pero la receta y el historial de
// encargos que ya lo usaron se conservan intactos (ver db/01_schema.sql).
// Antes de eliminar, se le pregunta a Encargos si hay pedidos pendientes o en
// preparación: si los hay, se bloquea hasta que se entreguen o se eliminen (RF-10).
export async function eliminar(id) {
  const clientes = await encargosServicio.clientesConEncargoActivo(id);
  if (clientes.length > 0) {
    throw new ErrorHttp(409, 'No se puede eliminar: el producto tiene encargos pendientes o en preparación', {
      encargos: clientes,
    });
  }

  const desactivado = await recetasRepo.desactivar(id);
  if (!desactivado) {
    const existeAlgo = await recetasRepo.existe(id);
    throw new ErrorHttp(
      existeAlgo ? 409 : 404,
      existeAlgo ? 'Ese producto ya estaba eliminado' : 'Producto no encontrado'
    );
  }
}

// ---------- Interfaz para los otros módulos (Inventario, Encargos, Alertas) ----------

// Receta cruda (sin nombres) para escalarla a una cantidad pedida: la usan
// Encargos (RF-12, RF-15) y Alertas (RF-17).
export async function obtenerCantidadBaseYLineas(idProducto, conexion = pool) {
  const p = await recetasRepo.obtenerPorId(idProducto, conexion);
  if (!p) return null;
  const lineas = await recetasRepo.obtenerLineasCrudas(idProducto, conexion);
  return { cantidadBase: Number(p.cantidad_base), activo: Boolean(p.activo), lineas };
}

// Para que Encargos valide que el producto exista y siga activo al registrar un pedido.
export async function nombreYActivo(idProducto, conexion = pool) {
  const p = await recetasRepo.obtenerPorId(idProducto, conexion);
  return p ? { nombre: p.nombre, activo: Boolean(p.activo) } : null;
}

// RF-06: para que Inventario bloquee la eliminación de un ingrediente en uso.
export async function productosQueUsanIngrediente(idIngrediente, conexion = pool) {
  return recetasRepo.nombresQueUsanIngrediente(idIngrediente, conexion);
}

export async function limpiarLineasHuerfanas(idIngrediente, conexion = pool) {
  return recetasRepo.borrarLineasDeIngredienteInactivo(idIngrediente, conexion);
}
