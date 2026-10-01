// Para cuando la usuaria olvida su contraseña y no puede entrar: le pones una
// nueva temporal desde aquí y se la dices para que vuelva a entrar. Una vez
// adentro, ella puede cambiarla por la suya desde "Cambiar contraseña" en el
// menú de la cuenta, sin que tú la sepas (backend/src/routes/auth.js).
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

function preguntar(texto, oculto = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(texto, (respuesta) => {
      rl.close();
      if (oculto) process.stdout.write('\n');
      resolve(respuesta.trim());
    });
    if (oculto) rl._writeToOutput = () => {};
  });
}

const correo = (await preguntar('Correo de la usuaria: ')).toLowerCase();
const password = await preguntar('Contraseña nueva (mínimo 8 caracteres): ', true);
const repetida = await preguntar('Repite la contraseña nueva: ', true);

if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}
if (password !== repetida) {
  console.error('Las contraseñas no coinciden.');
  process.exit(1);
}

try {
  const [[usuario]] = await pool.query('SELECT id_usuario FROM usuario WHERE correo = ?', [correo]);
  if (!usuario) {
    console.error('No existe ningún usuario con ese correo.');
    process.exitCode = 1;
  } else {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE usuario SET password_hash = ? WHERE id_usuario = ?', [hash, usuario.id_usuario]);
    // Por seguridad, cierra cualquier sesión vieja que tuviera abierta: con la
    // contraseña olvidada, no tiene sentido dejar sesiones antiguas activas.
    await pool.query('DELETE FROM sesion WHERE id_usuario = ?', [usuario.id_usuario]);
    console.log(`Contraseña actualizada para: ${correo}`);
  }
} catch (err) {
  console.error('No se pudo cambiar la contraseña:', err.code || err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
