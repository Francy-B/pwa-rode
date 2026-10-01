# Capítulo 3 — Diseño de la arquitectura y el modelo de datos

> **Cómo usar este documento.** Es una guía de contenido, no un texto para copiar. Cada
> sección dice qué debe afirmarse y con qué argumento; redáctalo con tus palabras y tu
> estilo. Todo está escrito en pasado y a nivel de diseño: no menciona archivos, funciones
> ni detalles que solo se conocieron al programar, porque eso pertenece al capítulo 4.

---

## Índice de figuras y cuadros de este capítulo

| Elemento | Nombre | Sección |
|---|---|---|
| Cuadro 1 | Comparación de estilos arquitectónicos | 3.1 |
| Figura 1 | Diagrama de componentes del prototipo RODE | 3.2 |
| Tabla 1 | Trazabilidad entre componentes y requerimientos funcionales | 3.2 |
| Figura 2 | Diagrama de secuencia: registro de un encargo | 3.2 |
| Cuadro 2 | Tecnologías seleccionadas y alternativas consideradas | 3.3 |
| Figura 3 | Diagrama de despliegue del prototipo RODE | 3.4 |
| Tabla 2 | Entidades identificadas a partir de los requerimientos | 3.5 |
| Figura 4 | Modelo entidad-relación de la base de datos Rode | 3.5 |
| Tabla 3 | Trazabilidad entre entidades y requerimientos funcionales | 3.5 |
| Figura 5 a 9 | Wireframes de las pantallas principales | 3.6 |
| Figura 10 | Mapa de navegación del prototipo | 3.6 |
| Tabla 4 | Cumplimiento de los compromisos de la Fase 2 | 3.7 |

Todas las figuras llevan **Fuente: Elaboración propia.**

---

## Párrafo de entrada

Contenido que debe cubrir, en un solo párrafo:

- Que esta fase parte de los 18 requerimientos funcionales y 5 no funcionales definidos en
  el capítulo anterior, y que ninguna decisión de diseño se tomó sin un requerimiento que
  la respaldara.
- Que el diseño abarcó cuatro frentes: el estilo arquitectónico y la organización interna
  del sistema, la selección de tecnologías, el modelo de datos y el diseño de la interfaz.
- Que el resultado es la base directa sobre la que se construyó el prototipo en el
  objetivo 3.

---

## 3.1 Selección del estilo arquitectónico

**Lo que ya tienes escrito sirve casi completo.** Conserva la definición de arquitectura, la
comparación conceptual entre monolítica y microservicios y la conclusión. Lo único que le
falta es hacer explícito el criterio de decisión.

### Argumento que debe quedar

La elección no se hizo por preferencia ni por tendencia, sino evaluando cada alternativa
frente a las características concretas de este proyecto: un prototipo, con una sola usuaria,
un solo desarrollador, un volumen de datos reducido y un servidor de recursos limitados.
Bajo esas condiciones, las ventajas de los microservicios —escalabilidad independiente y
despliegue autónomo de cada servicio— no resuelven ningún problema real de RODE, mientras
que sus costos —complejidad de comunicación entre servicios, despliegue distribuido y
operación— sí se pagarían completos.

### Cuadro 1. Comparación de estilos arquitectónicos

| Criterio de evaluación | Arquitectura monolítica | Microservicios |
|---|---|---|
| Alcance del sistema (prototipo, una usuaria) | Adecuada: las funcionalidades están relacionadas entre sí y se gestionan en una sola aplicación | Sobredimensionada: divide un sistema que no necesita división |
| Complejidad de desarrollo | Baja: una sola base de código | Alta: múltiples servicios, contratos entre ellos |
| Complejidad de despliegue | Baja: un solo artefacto desplegable | Alta: orquestación y despliegue independiente |
| Recursos del servidor disponible | Bajo consumo: un proceso de aplicación | Mayor consumo: un proceso por servicio |
| Tamaño del equipo (un desarrollador) | Viable | Inviable en el tiempo disponible |
| Rendimiento (RNF-03) | Llamadas internas, sin latencia de red entre módulos | Latencia adicional por comunicación entre servicios |
| Escalabilidad futura | Limitada a escalar la aplicación completa | Ventaja real, pero no requerida por el alcance |

### Cierre de la sección

Una o dos frases: se seleccionó una arquitectura monolítica **organizada internamente en
capas**, que concentra la lógica en una sola aplicación pero separa responsabilidades de
presentación, negocio y persistencia. Esa organización interna es la que permite que el
sistema siga siendo mantenible sin asumir el costo de una arquitectura distribuida. Añade
que la separación en capas deja abierta una eventual migración futura, porque la lógica de
negocio no queda mezclada con la de presentación.

---

## 3.2 Organización en capas y componentes

### Contenido

Describe las tres capas y qué responsabilidad tiene cada una. Es importante que las
describas por **responsabilidad**, no por tecnología:

**Capa de presentación.** Recibe las peticiones del cliente, valida que quien las hace tenga
una sesión activa y entrega las respuestas. No contiene reglas del negocio: solo decide
quién puede entrar y a dónde se dirige cada petición.

**Capa de lógica de negocio.** Implementa las reglas derivadas de los requerimientos: el
cálculo de cantidades de una receta según el tamaño del encargo, la verificación de
disponibilidad antes de comprometer un pedido, el descuento y la reversión de existencias, y
la generación de alertas por nivel crítico. Es la capa que da valor al sistema y la única que
conoce las reglas del negocio de repostería.

**Capa de persistencia.** Traduce las operaciones del negocio en consultas a la base de datos
y garantiza que las operaciones que modifican varias filas se ejecuten de forma consistente.
Aísla al resto del sistema del motor de base de datos concreto.

Añade que el frontend se organizó en módulos funcionales que corresponden uno a uno con los
grupos de requerimientos, y que la comunicación entre frontend y backend se definió mediante
una interfaz única —un API REST sobre HTTPS— de manera que ninguno de los dos dependa de los
detalles internos del otro.

### Figura 1. Diagrama de componentes del prototipo RODE

*(el diagrama de componentes en versión de diseño)*

### Tabla 1. Trazabilidad entre componentes y requerimientos funcionales

| Componente | Capa | Requerimientos atendidos |
|---|---|---|
| Autenticación (interfaz) | Frontend | RF-01, RF-02 |
| Inventario (interfaz) | Frontend | RF-03, RF-04, RF-05, RF-06 |
| Recetas (interfaz) | Frontend | RF-07, RF-08, RF-09, RF-10 |
| Encargos (interfaz) | Frontend | RF-11, RF-13, RF-14, RF-16 |
| Alertas y lista de compras (interfaz) | Frontend | RF-17, RF-18 |
| Controladores del API | Presentación | Todos los RF |
| Autenticación y control de sesión | Presentación | RF-01, RF-02, RNF-01 |
| Gestión de inventario | Negocio | RF-03 a RF-06, RF-15 |
| Gestión de recetas | Negocio | RF-07 a RF-10 |
| Gestión de encargos | Negocio | RF-11 a RF-14, RF-16 |
| Generación de alertas | Negocio | RF-12, RF-17, RF-18 |
| Acceso a datos | Persistencia | Todos los RF con persistencia |

**Esta tabla es el elemento más valioso de la sección.** Demuestra que los componentes salen
de los requerimientos y no del criterio del diseñador. Menciónalo explícitamente en el texto.

### Comportamiento: el flujo crítico

Explica que el diagrama de componentes es estático —muestra qué módulos existen, no cómo
colaboran— y que por eso se modeló el flujo más complejo del sistema: el registro de un
encargo, que es donde intervienen casi todos los módulos del negocio.

### Figura 2. Diagrama de secuencia: registro de un encargo

*(el diagrama de secuencia)*

Descripción que debe acompañarla:

Cuando la usuaria registra un encargo, la gestión de encargos no lo confirma de inmediato:
primero solicita a la gestión de inventario verificar la disponibilidad, que a su vez consulta
la receta del producto y el stock actual de cada ingrediente. Si todos los ingredientes
alcanzan, el descuento se aplica **dentro de una transacción**, de modo que o se descuentan
todos o no se descuenta ninguno. Si alguno no alcanza, no se modifica el inventario, el
encargo queda pendiente y se genera la alerta correspondiente.

Cierra señalando que esta interacción es la que justifica dos decisiones del modelo de datos:
el uso de transacciones y el registro histórico de movimientos.

---

## 3.3 Selección de tecnologías

### Estructura

Una subsección corta por frente. En cada una: qué se eligió, qué se consideró, y por qué se
descartó. **Sin alternativa descartada no es una justificación, es una descripción.**

### 3.3.1 Tipo de aplicación: aplicación web progresiva

Argumento: se evaluó una aplicación móvil nativa y una aplicación web progresiva. La nativa
exige publicación en tiendas de aplicaciones, procesos de aprobación, y desarrollo separado
por plataforma. La PWA se distribuye por un enlace, funciona en los navegadores actuales de
escritorio y móvil —lo que satisface directamente el **RNF-05**— y puede instalarse en el
dispositivo sin pasar por una tienda. Para un prototipo destinado a una sola usuaria, el
costo de una aplicación nativa no se justifica.

Aclara que la condición técnica de toda PWA es servirse sobre HTTPS, lo que condicionó el
diseño del despliegue (sección 3.4).

### 3.3.2 Frontend

Argumento: se seleccionó una biblioteca de componentes que permitiera construir una interfaz
por módulos reutilizables y mantener el estado de la sesión y las alertas de forma
centralizada. Se consideraron alternativas equivalentes; la decisión se apoyó en la
disponibilidad de documentación, la curva de aprendizaje frente al tiempo del proyecto y la
compatibilidad con los navegadores exigidos por el RNF-05.

### 3.3.3 Backend

Argumento: se eligió un entorno de ejecución de JavaScript del lado del servidor para usar un
solo lenguaje en todo el sistema, lo que reduce el costo de cambio de contexto para un
desarrollador único. Se consideraron otras plataformas; se descartaron porque habrían
introducido un segundo lenguaje sin aportar una ventaja funcional para el alcance definido.

### 3.3.4 Base de datos

Este es el argumento más importante del apartado, porque es el que más se puede cuestionar.

Se seleccionó un motor **relacional** y no uno documental porque los datos del sistema son
intrínsecamente relacionales: un producto se compone de varios ingredientes, un ingrediente
participa en varios productos, y un encargo depende de ambos. Además, el sistema requiere
garantías que un motor relacional ofrece de forma nativa:

- **Integridad referencial:** impedir que se elimine un ingrediente que forma parte de una
  receta activa.
- **Transacciones:** garantizar que el descuento de varios ingredientes se aplique completo o
  no se aplique.
- **Restricciones de dominio:** impedir valores negativos de existencias o estados inválidos.

Se seleccionó MariaDB entre los motores relacionales por ser de código abierto, por su bajo
consumo de recursos en el servidor disponible y por su compatibilidad con herramientas de
administración de escritorio.

### 3.3.5 Autenticación

Argumento: se seleccionó un esquema de tokens firmados (JWT) conforme al **RNF-01**. El
criterio del RNF-01 exige que la sesión se invalide **únicamente** con un cierre de sesión
explícito de la usuaria (RF-02). Un token firmado por sí solo no permite invalidarlo antes de
su vencimiento, por lo que se decidió **complementarlo con un registro de sesiones activas en
la base de datos**: el token identifica la sesión y el servidor verifica que siga vigente.
Esa decisión es la que da origen a la entidad `sesion` del modelo de datos.

### 3.3.6 Empaquetado y ejecución

Argumento: se decidió ejecutar la aplicación y la base de datos en contenedores, para aislar
sus dependencias, reproducir el mismo entorno en desarrollo y en el servidor, y permitir que
la comunicación entre ambos ocurra por una red interna sin exponer la base de datos a
internet.

### Cuadro 2. Tecnologías seleccionadas y alternativas consideradas

| Frente | Seleccionado | Alternativa considerada | Criterio de decisión | Requerimiento |
|---|---|---|---|---|
| Tipo de aplicación | Aplicación web progresiva | Aplicación móvil nativa | Sin tienda de aplicaciones, multiplataforma | RNF-05 |
| Frontend | Biblioteca de componentes (React) | Otros marcos equivalentes | Modularidad, documentación, tiempo | RNF-04, RNF-05 |
| Backend | Node.js con Express | Otras plataformas de servidor | Un solo lenguaje en todo el sistema | RNF-03 |
| Base de datos | MariaDB (relacional) | Motor documental | Integridad referencial y transacciones | RF-12, RF-15 |
| Autenticación | JWT + registro de sesiones | JWT con vencimiento fijo | Cierre de sesión explícito | RNF-01, RF-02 |
| Ejecución | Contenedores | Instalación directa en el servidor | Aislamiento y reproducibilidad | RNF-02 |

---

## 3.4 Diseño del despliegue

### Contenido

Describe el entorno físico donde se ejecuta el sistema y por qué se organizó así:

- La aplicación se ejecuta en un **servidor virtual privado**, no en el equipo de la usuaria,
  para que esté disponible desde cualquier dispositivo y no dependa de que un computador
  personal esté encendido (**RNF-02**).
- La aplicación y la base de datos se ejecutan en **contenedores separados** dentro del mismo
  servidor. El contenedor de la base de datos **no se expone a internet**: solo es alcanzable
  desde la red interna del servidor, y la aplicación se conecta a él con un usuario de
  permisos mínimos.
- El acceso de la usuaria ocurre **sobre HTTPS**. No es una opción de despliegue sino un
  requisito: los navegadores solo permiten instalar una aplicación web progresiva y registrar
  su service worker en un contexto seguro. Además protege las credenciales en tránsito
  (**RNF-01**).
- Se definió un **esquema de respaldos automáticos diarios** de la base de datos, con
  retención de catorce días, como medida de continuidad frente a pérdida de datos
  (**RNF-02**).

Agrega una aclaración de una frase: el acceso administrativo a la base de datos utilizado
durante el desarrollo es temporal y no forma parte de la arquitectura de despliegue del
sistema.

### Figura 3. Diagrama de despliegue del prototipo RODE

*(el diagrama de despliegue)*

---

## 3.5 Diseño del modelo de datos

Es la sección más extensa y la que más peso tiene. Va en cuatro pasos: identificación,
relaciones, normalización y decisiones justificadas.

### 3.5.1 Identificación de entidades

Explica el método: las entidades se obtuvieron analizando los sustantivos que aparecen de
forma recurrente en los requerimientos funcionales, y se conservaron solo aquellos que el
sistema necesita **almacenar y consultar en el tiempo**.

#### Tabla 2. Entidades identificadas a partir de los requerimientos

| Entidad | Qué representa | Requerimientos de origen |
|---|---|---|
| `usuario` | La persona autorizada para operar el sistema | RF-01, RF-02 |
| `sesion` | Una sesión activa en un dispositivo | RF-01, RF-02, RNF-01 |
| `ingrediente` | Un insumo del inventario, con su existencia actual | RF-03 a RF-06 |
| `producto` | Un producto de repostería que se elabora y se vende | RF-07 a RF-10 |
| `producto_ingrediente` | La receta: qué ingredientes y en qué cantidad lleva un producto | RF-07, RF-09 |
| `encargo` | Un pedido de un cliente, con producto, cantidad y fecha | RF-11, RF-13, RF-14, RF-16 |
| `movimiento_stock` | Cada entrada o salida de inventario, con su motivo | RF-05, RF-14, RF-15 |

### 3.5.2 Relaciones y cardinalidades

Describe cada relación en una frase:

- Un **usuario** puede tener varias **sesiones** abiertas (una por dispositivo); cada sesión
  pertenece a un solo usuario.
- Un **producto** se compone de varios **ingredientes** y un **ingrediente** participa en
  varios **productos**: es una relación de muchos a muchos, resuelta mediante la entidad
  intermedia `producto_ingrediente`.
- Un **producto** puede aparecer en varios **encargos**; cada encargo corresponde a un solo
  producto.
- Un **ingrediente** acumula varios **movimientos de stock**; cada movimiento afecta a un
  solo ingrediente.
- Un **encargo** puede originar varios **movimientos de stock**, pero un movimiento puede
  existir sin encargo asociado (por ejemplo, el registro de una compra), por lo que esa
  relación es opcional.

### 3.5.3 Normalización

Explica hasta dónde se normalizó y con qué efecto concreto:

- **Primera forma normal:** ningún atributo almacena listas. Por eso los ingredientes de una
  receta no se guardan como texto dentro del producto, sino como filas independientes.
- **Segunda forma normal:** en `producto_ingrediente`, cuya llave primaria es compuesta, el
  atributo `cantidad_necesaria` depende de la llave completa —del par producto-ingrediente— y
  no de una sola de sus partes. No pertenece ni al producto ni al ingrediente por separado.
- **Tercera forma normal:** no se almacenan datos derivables de otros. Es el motivo por el
  cual las alertas de stock crítico **no se guardan**: se obtienen comparando la existencia
  actual con el umbral definido.

### 3.5.4 Decisiones de diseño

Presenta cada una como problema → decisión → alternativa descartada. Son ocho:

**a) La receta como entidad propia.** La relación entre productos e ingredientes es de muchos
a muchos y además tiene un dato propio: la cantidad. Se descartó guardar los ingredientes
como una lista dentro del producto porque impide consultar en qué recetas participa un
ingrediente y hace imposible calcular cantidades.

**b) Registro histórico de movimientos.** La existencia actual de un ingrediente solo indica
cuánto hay hoy, no quién lo modificó ni por qué. El RF-14 exige poder devolver un encargo a
estado pendiente, y el RF-15 exige descontar al preparar. Si la receta cambia entre el
descuento y la reversión, devolver la cantidad "según la receta" restituiría un valor distinto
al que se descontó. Se decidió registrar cada movimiento con su cantidad y motivo, de modo que
revertir consista en deshacer exactamente lo registrado. Se descartó recalcular desde la
receta por la inconsistencia descrita.

**c) Alertas derivadas, no almacenadas.** Inicialmente se contempló una entidad para las
notificaciones, con un indicador de "vista". Se descartó: una alerta de stock crítico es una
consecuencia directa del estado actual del inventario, no un hecho independiente. Almacenarla
obligaría a mantenerla sincronizada con cada cambio de existencias y abriría la posibilidad de
que quedara desactualizada. Al calcularla en el momento de la consulta, la alerta aparece y
desaparece sola, sin requerir mantenimiento ni marcado manual.

> Esta decisión conviene contarla como lo que fue: una entidad que se eliminó del modelo tras
> analizarla. Muestra criterio de diseño, no improvisación.

**d) Sesiones persistidas.** Explicado en 3.3.5: el criterio del RNF-01 obliga a poder
invalidar una sesión en el momento del cierre explícito, lo que un token autocontenido no
permite. Se descartó confiar únicamente en el vencimiento del token.

**e) Representación de cantidades.** Las cantidades se definieron con tipo decimal de precisión
fija y no con punto flotante, porque el punto flotante introduce errores de redondeo que, al
acumularse en descuentos sucesivos, distorsionarían el inventario.

**f) Dominios cerrados.** Los atributos cuyos valores posibles son fijos y no los administra la
usuaria —la unidad de medida, el estado de un encargo, el tipo de movimiento— se definieron
como enumeraciones, de modo que la base de datos rechace cualquier valor inválido. Se descartó
una tabla de catálogo por valor: para conjuntos que solo cambian si cambia el proceso del
negocio, añadiría tablas y consultas adicionales sin aportar flexibilidad útil. Deja
constancia de la contrapartida: agregar un valor nuevo exige modificar la estructura de la
tabla, razón por la cual este mecanismo no se usó en ningún dato que la usuaria pueda crear.

**g) Unidad base de almacenamiento.** Las existencias se almacenan siempre en una unidad base
por familia de medida, independientemente de la unidad en que la usuaria compre el ingrediente.
Así, comparar la existencia con el umbral o descontar una receta no requiere convertir en cada
operación, y se elimina una fuente de error.

**h) Manejo del tiempo y borrado lógico.** Las marcas de tiempo se almacenan en UTC y se
presentan en la zona horaria de Bogotá, para que el dato no dependa de la configuración del
servidor. Y los productos no se eliminan físicamente sino que se marcan como inactivos
(RF-10), de modo que salgan del catálogo sin destruir el historial de encargos que los
referencian.

### Figura 4. Modelo entidad-relación de la base de datos Rode

*(el modelo entidad-relación de siete entidades)*

### Tabla 3. Trazabilidad entre entidades y requerimientos funcionales

| Entidad | Requerimientos que soporta |
|---|---|
| `usuario` | RF-01, RF-02 |
| `sesion` | RF-01, RF-02 |
| `ingrediente` | RF-03, RF-04, RF-05, RF-06, RF-17, RF-18 |
| `producto` | RF-07, RF-08, RF-09, RF-10 |
| `producto_ingrediente` | RF-07, RF-09, RF-12, RF-15 |
| `encargo` | RF-11, RF-13, RF-14, RF-16 |
| `movimiento_stock` | RF-05, RF-14, RF-15 |

### Diccionario de datos

Anuncia en una frase que la especificación completa de cada tabla —campos, tipos,
restricciones y descripción— se presenta en el **Anexo A**, y que el script de creación de la
base de datos se incluye en el **Anexo B**.

---

## 3.6 Diseño de la interfaz de usuario

### Criterios de diseño

Deriva cada criterio de un requerimiento, no de una preferencia estética:

- **Diseño primero para móvil.** La usuaria opera el emprendimiento desde su celular mientras
  produce; la interfaz se diseñó para pantalla pequeña y se adaptó después a escritorio.
- **Pocos pasos por acción (RNF-04).** Las acciones frecuentes —consultar existencias,
  registrar una compra, crear un encargo— quedaron accesibles desde la pantalla de inicio o
  desde la barra de navegación permanente.
- **Información crítica visible sin buscarla.** La pantalla de inicio muestra el número de
  ingredientes en estado crítico y de encargos pendientes, de modo que la usuaria conozca el
  estado del negocio al abrir la aplicación (RF-18).
- **Legibilidad (RNF-04).** Tipografía y contraste suficientes para lectura rápida, y estados
  diferenciados por color y por etiqueta, no solo por color.
- **Compatibilidad (RNF-05).** El diseño se resolvió con componentes estándar, sin depender de
  capacidades propias de un navegador.

### Figuras 5 a 9. Wireframes de las pantallas principales

*(las pantallas de `mockups.pdf`)*

**Importante:** aclara en el texto que las versiones de escritorio corresponden al **diseño
responsivo de las mismas nueve pantallas**, no a pantallas adicionales. Sin esa aclaración
parece que el sistema tiene diecinueve pantallas.

### Figura 10. Mapa de navegación del prototipo

*(el mapa de navegación)*

Descripción que debe acompañarla: el acceso al sistema ocurre por una única pantalla de inicio
de sesión; superada la autenticación, las cinco secciones principales quedan disponibles de
forma permanente en la barra de navegación inferior, y cada sección abre su propio formulario
del cual se regresa a la sección de origen. Se evitaron jerarquías profundas: ninguna función
queda a más de dos niveles de la pantalla de inicio, en atención al RNF-04.

---

## 3.7 Resultados del objetivo 2

Sección corta. Enuncia lo **producido**, no lo realizado, y cierra con la tabla de
cumplimiento.

Los productos obtenidos fueron: el estilo arquitectónico seleccionado y justificado; la
organización interna del sistema en tres capas con sus componentes trazados a los
requerimientos; el conjunto de tecnologías seleccionado con su justificación; el diseño del
entorno de despliegue; el modelo entidad-relación con siete entidades, acompañado de su
diccionario de datos; y el diseño de la interfaz con los wireframes de las pantallas
principales y su mapa de navegación.

### Tabla 4. Cumplimiento de los compromisos de la Fase 2

| Compromiso de la Fase 2 | Entregable obtenido | Ubicación |
|---|---|---|
| Diseñar la arquitectura del sistema | Estilo arquitectónico justificado y organización en capas | 3.1, 3.2 · Cuadro 1, Figura 1 |
| Definir entidades, relaciones y atributos | Modelo entidad-relación de siete entidades y diccionario de datos | 3.5 · Figura 4, Anexo A |
| Diseñar la interfaz de usuario | Wireframes de las pantallas principales y mapa de navegación | 3.6 · Figuras 5 a 10 |
| Seleccionar las tecnologías | Selección justificada con alternativas consideradas | 3.3 · Cuadro 2 |
| Obtener el modelo entidad-relación | Base de datos creada e implementada en MariaDB | 3.5 · Figura 4 |

---

## 3.8 Conclusión del objetivo 2

Debe hacer tres cosas y nada más. No repitas lo ya dicho.

**1. Afirmar el cumplimiento, con evidencia.** El diseño se construyó a partir de los
requerimientos del objetivo 1, y la trazabilidad entre componentes, entidades y
requerimientos (Tablas 1 y 3) permite verificar que cada elemento responde a una necesidad
identificada y no a una preferencia técnica.

**2. Explicar qué habilita.** El resultado es una estructura verificable —arquitectura,
modelo de datos e interfaz— que constituye la base directa para la construcción del prototipo
en el tercer objetivo. Puedes señalar que la separación en capas permitió construir los
módulos de forma progresiva, y que el modelo de datos normalizado garantiza la consistencia
del inventario en la operación más delicada del sistema: el descuento simultáneo de varios
ingredientes.

**3. Reconocer los límites.** El diseño se orientó a una única usuaria y a un volumen de datos
reducido, por lo que la gestión de múltiples roles y la escalabilidad horizontal no fueron
abordadas. Del mismo modo, el diseño no contempla operación sin conexión, ya que ninguno de
los requerimientos no funcionales la exige. Ambos aspectos se plantean como trabajo futuro.

> Reconocer una limitación no debilita el capítulo: lo fortalece. Un capítulo donde todo salió
> perfecto genera desconfianza.

---

## Recordatorios para todo el capítulo

1. **Tiempo verbal en pasado.** El capítulo de metodología está en futuro porque es un plan;
   este está en pasado porque ya ocurrió.
2. **Nivel de diseño, no de implementación.** No menciones archivos, funciones ni bibliotecas
   específicas al describir los componentes. Eso pertenece al capítulo 4.
3. **Ninguna decisión sin alternativa descartada.** Es el patrón que sostiene todo el capítulo.
4. **Numera todas las figuras y cuadros** y luego completa las listas de las páginas 7 a 10,
   que aún tienen el texto de la plantilla.
5. **Elimina las notas de trabajo** que quedaron en el documento: las URL sueltas, el
   "página 70 o 54" y el "Por ejemplo:".
