import 'dotenv/config';
import mysql from 'mysql2/promise';

// Pool de conexiones: se reutilizan en vez de abrir una nueva por cada petición.
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // Convención del proyecto: todo se guarda y se lee en UTC.
  timezone: 'Z',
  // fecha_entrega (DATE) llega como texto 'YYYY-MM-DD', sin desfase de zona horaria.
  dateStrings: true,
});

// Ejecuta `fn(conexion)` dentro de una transacción: si algo falla, no queda nada a medias
// (ej. descontar varios ingredientes a la vez).
export async function conTransaccion(fn) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await fn(conexion);
    await conexion.commit();
    return resultado;
  } catch (err) {
    await conexion.rollback();
    throw err;
  } finally {
    conexion.release();
  }
}
