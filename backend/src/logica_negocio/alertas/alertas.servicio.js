// Módulo "Generación de alertas" (RF-17, RF-18, Figura X). Es el único módulo que
// necesita observar el estado combinado de los otros tres — para eso llama a sus
// interfaces (Encargos, Recetas, Inventario), nunca les hace SQL directo.
import { pool } from '../../db.js';
import { desdeBase } from '../../unidades.js';
import * as inventarioServicio from '../inventario/inventario.servicio.js';
import * as recetasServicio from '../recetas/recetas.servicio.js';
import * as encargosServicio from '../encargos/encargos.servicio.js';

// RF-17: no es la suma de los faltantes de cada encargo por separado (eso podría
// contar de más o de menos si varios pedidos comparten un ingrediente); primero se
// suma cuánto exigen JUNTOS todos los encargos pendientes, y esa única cifra se
// compara contra el stock real. También incluye lo que ya está en su stock mínimo
// aunque no haya ningún pedido de por medio (RF-18).
export async function listaCompras() {
  const pendientes = await encargosServicio.pendientesCrudo(pool);

  const requeridoPorIngrediente = new Map();
  for (const enc of pendientes) {
    const receta = await recetasServicio.obtenerCantidadBaseYLineas(enc.id_producto, pool);
    if (!receta) continue; // producto eliminado por completo entre tanto; no debería pasar
    const factor = Number(enc.cantidad_pedida) / receta.cantidadBase;
    for (const l of receta.lineas) {
      const requerido = Number(l.cantidad_necesaria) * factor;
      requeridoPorIngrediente.set(l.id_ingrediente, (requeridoPorIngrediente.get(l.id_ingrediente) ?? 0) + requerido);
    }
  }

  const ingredientes = await inventarioServicio.todos(pool);

  return ingredientes
    .map((ing) => {
      const requeridoBase = requeridoPorIngrediente.get(ing.id_ingrediente) ?? 0;
      const stockBase = Number(ing.stock);
      const umbralBase = Number(ing.umbral_critico);
      // Comprar al menos lo que cubra los pedidos pendientes Y lo que saque del
      // mínimo, lo que sea mayor.
      const objetivo = Math.max(umbralBase, requeridoBase);
      const faltanteBase = Math.round(Math.max(0, objetivo - stockBase) * 1000) / 1000;
      if (faltanteBase <= 0) return null;
      return {
        id_ingrediente: ing.id_ingrediente,
        nombre: ing.nombre,
        unidad_medida: ing.unidad_medida,
        disponible: desdeBase(stockBase, ing.unidad_medida),
        stock_critico: stockBase <= umbralBase,
        cantidad_a_comprar: desdeBase(faltanteBase, ing.unidad_medida),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// RF-18: el punto de "Lista de compras" — la misma cuenta que llena esa pantalla,
// para que nunca puedan desincronizarse entre sí.
export async function resumen() {
  const items = await listaCompras();
  return { criticos: items.length };
}
