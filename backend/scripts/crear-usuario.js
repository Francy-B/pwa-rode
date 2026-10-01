import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

// Pregunta por la terminal. Con oculto=true no muestra lo que se escribe.
function preguntar(texto, oculto = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(texto, (respuesta) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolve(respuesta.trim());
    });
    // El texto de la pregunta ya se imprimió; desde aquí no se muestra lo que se teclea.
    if (oculto) rl._writeToOutput = () => {};
  });
}

const correo = (await preguntar('Correo: ')).toLowerCase();
const password = await preguntar('Contraseña (mínimo 8 caracteres): ', true);
const repetida = await preguntar('Repite la contraseña: ', true);

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
  console.error('El correo no tiene un formato válido.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}
if (password !== repetida) {
  console.error('Las contraseñas no coinciden.');
  process.exit(1);
}

try {
  // 12 = costo del hash: más alto es más lento de descifrar por fuerza bruta.
  const hash = await bcrypt.hash(password, 12);
  await pool.query('INSERT INTO usuario (correo, password_hash) VALUES (?, ?)', [correo, hash]);
  console.log(`Usuario creado: ${correo}`);
} catch (err) {
  if (err.code === 'ER_DUP_ENTRY') console.error('Ya existe un usuario con ese correo.');
  else console.error('No se pudo crear el usuario:', err.code || err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
