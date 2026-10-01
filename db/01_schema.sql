-- RODE · Esquema de base de datos (MariaDB 11.8)
-- Se ejecuta en Sequel Ace sobre la base Rode (con R mayúscula).
-- Es seguro repetirlo: CREATE TABLE IF NOT EXISTS no borra nada.

-- Tabla 1: usuario (RF-01, RF-02, RNF-01)
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  correo         VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  creado_en      DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uk_usuario_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla 2: ingrediente (RF-03 a RF-06)
-- stock y umbral_critico se guardan SIEMPRE en unidad base (gr, ml o und).
-- unidad_medida es solo la unidad con que la usuaria compra y ve el ingrediente.
-- Sin creado_en/actualizado_en: el historial real de cambios de stock vive en
-- movimiento_stock, que ya tiene su propia fecha por cada movimiento.
CREATE TABLE IF NOT EXISTS ingrediente (
  id_ingrediente  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(120) NOT NULL,
  unidad_medida   ENUM('gr','kg','ml','l','und') NOT NULL,
  stock           DECIMAL(12,3) NOT NULL DEFAULT 0,
  umbral_critico  DECIMAL(12,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (id_ingrediente),
  UNIQUE KEY uk_ingrediente_nombre (nombre),
  CONSTRAINT ck_ingrediente_stock  CHECK (stock >= 0),
  CONSTRAINT ck_ingrediente_umbral CHECK (umbral_critico >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla 3: producto (RF-07 a RF-10)
-- cantidad_base = cuántas unidades rinde la receta (ej. 10 galletas).
-- "Eliminar" un producto = activo 0: sale del catálogo pero se conserva el
-- historial de encargos.
CREATE TABLE IF NOT EXISTS producto (
  id_producto    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(120) NOT NULL,
  cantidad_base  DECIMAL(12,3) NOT NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id_producto),
  UNIQUE KEY uk_producto_nombre (nombre),
  CONSTRAINT ck_producto_base CHECK (cantidad_base > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla 4: producto_ingrediente = la receta (RF-07, RF-09)
-- cantidad_necesaria es para cantidad_base unidades del producto, en la unidad
-- de esta línea (puede diferir de la del ingrediente, pero de la misma familia).
CREATE TABLE IF NOT EXISTS producto_ingrediente (
  id_producto         INT UNSIGNED NOT NULL,
  id_ingrediente      INT UNSIGNED NOT NULL,
  cantidad_necesaria  DECIMAL(12,3) NOT NULL,
  unidad              ENUM('gr','kg','ml','l','und') NOT NULL,
  PRIMARY KEY (id_producto, id_ingrediente),
  CONSTRAINT fk_pi_producto    FOREIGN KEY (id_producto)    REFERENCES producto (id_producto)       ON DELETE CASCADE,
  CONSTRAINT fk_pi_ingrediente FOREIGN KEY (id_ingrediente) REFERENCES ingrediente (id_ingrediente) ON DELETE RESTRICT,
  CONSTRAINT ck_pi_cantidad CHECK (cantidad_necesaria > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla 5: encargo (RF-11, RF-13, RF-14, RF-16)
-- Un producto por encargo. fecha_entrega es solo el día (sin zona horaria).
CREATE TABLE IF NOT EXISTS encargo (
  id_encargo       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre_cliente   VARCHAR(120) NOT NULL,
  id_producto      INT UNSIGNED NOT NULL,
  cantidad_pedida  DECIMAL(12,3) NOT NULL,
  fecha_entrega    DATE NOT NULL,
  estado           ENUM('pendiente','preparando','entregado') NOT NULL DEFAULT 'pendiente',
  creado_en        DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id_encargo),
  KEY ix_encargo_estado_fecha (estado, fecha_entrega),
  CONSTRAINT fk_encargo_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto) ON DELETE RESTRICT,
  CONSTRAINT ck_encargo_cantidad CHECK (cantidad_pedida > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla 6: movimiento_stock (RF-05, RF-14, RF-15)
-- Registro de entradas y salidas. Permite revertir "preparando" deshaciendo
-- exactamente lo que se descontó, aunque la receta haya cambiado.
-- cantidad en unidad base, con signo (descuento negativo; compra/reversión positivo).
CREATE TABLE IF NOT EXISTS movimiento_stock (
  id_movimiento   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_ingrediente  INT UNSIGNED NOT NULL,
  id_encargo      INT UNSIGNED NULL,
  tipo            ENUM('compra','ajuste','descuento','reversion') NOT NULL,
  cantidad        DECIMAL(12,3) NOT NULL,
  creado_en       DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id_movimiento),
  KEY ix_mov_ingrediente (id_ingrediente, creado_en),
  KEY ix_mov_encargo (id_encargo),
  CONSTRAINT fk_mov_ingrediente FOREIGN KEY (id_ingrediente) REFERENCES ingrediente (id_ingrediente) ON DELETE RESTRICT,
  CONSTRAINT fk_mov_encargo     FOREIGN KEY (id_encargo)     REFERENCES encargo (id_encargo)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla 7: sesion (RF-01, RF-02, RNF-01)
-- Una fila por dispositivo con sesión abierta. El JWT lleva id_sesion; el backend
-- verifica que la fila exista. Cerrar sesión = borrar la fila. No hay vencimiento:
-- la sesión dura hasta que la usuaria la cierre (estilo Instagram).
CREATE TABLE IF NOT EXISTS sesion (
  id_sesion   CHAR(36) NOT NULL,
  id_usuario  INT UNSIGNED NOT NULL,
  creado_en   DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  ultimo_uso  DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id_sesion),
  KEY ix_sesion_usuario (id_usuario),
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
