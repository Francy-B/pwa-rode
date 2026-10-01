# -*- coding: utf-8 -*-
"""Genera los diagramas de componentes y de despliegue de RODE en SVG."""

FONT = 'Helvetica, Arial, sans-serif'
INK = '#222222'
LINE = '#333333'


class Svg:
    def __init__(self, w, h, titulo):
        self.w, self.h = w, h
        self.p = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
                  'viewBox="0 0 %d %d" font-family="%s">' % (w, h, w, h, FONT),
                  '<rect width="%d" height="%d" fill="#ffffff"/>' % (w, h)]
        self.txt(w / 2, 34, titulo, 23, bold=True, anchor='middle')

    def add(self, s):
        self.p.append(s)

    def txt(self, x, y, s, size=13, bold=False, italic=False, anchor='start',
            fill=INK):
        s = (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
        self.add('<text x="%g" y="%g" font-size="%g"%s%s text-anchor="%s" '
                 'fill="%s">%s</text>'
                 % (x, y, size, ' font-weight="bold"' if bold else '',
                    ' font-style="italic"' if italic else '', anchor, fill, s))

    def rect(self, x, y, w, h, fill='#ffffff', stroke=LINE, sw=1.6, dash=None,
             r=0):
        # El trazo discontinuo se dibuja segmento a segmento: así se ve igual
        # en el SVG y en cualquier conversor a imagen.
        self.add('<rect x="%g" y="%g" width="%g" height="%g" rx="%g" fill="%s" '
                 'stroke="%s" stroke-width="%g"/>'
                 % (x, y, w, h, r, fill, 'none' if dash else stroke, sw))
        if dash:
            e = [(x, y, x + w, y), (x + w, y, x + w, y + h),
                 (x + w, y + h, x, y + h), (x, y + h, x, y)]
            for x1, y1, x2, y2 in e:
                self.line(x1, y1, x2, y2, sw=sw, dash=dash, stroke=stroke)

    def line(self, x1, y1, x2, y2, sw=1.6, dash=None, stroke=LINE):
        if dash:
            import math
            on, off = [float(v) for v in dash.split()]
            L = math.hypot(x2 - x1, y2 - y1)
            if L == 0:
                return
            ux, uy, pos = (x2 - x1) / L, (y2 - y1) / L, 0.0
            while pos < L:
                s = min(on, L - pos)
                self.line(x1 + ux * pos, y1 + uy * pos,
                          x1 + ux * (pos + s), y1 + uy * (pos + s),
                          sw=sw, stroke=stroke)
                pos += on + off
            return
        self.add('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" '
                 'stroke-width="%g"/>' % (x1, y1, x2, y2, stroke, sw))

    def poly(self, pts, fill='none', stroke=LINE, sw=1.6):
        s = ' '.join('%g,%g' % p for p in pts)
        self.add('<polygon points="%s" fill="%s" stroke="%s" stroke-width="%g"/>'
                 % (s, fill, stroke, sw))

    def circle(self, cx, cy, r, fill='#ffffff', stroke=LINE, sw=1.6):
        self.add('<circle cx="%g" cy="%g" r="%g" fill="%s" stroke="%s" '
                 'stroke-width="%g"/>' % (cx, cy, r, fill, stroke, sw))

    def arc_socket(self, cx, cy, r, sw=1.8):
        """Media circunferencia abierta hacia abajo (interfaz requerida)."""
        self.add('<path d="M %g %g A %g %g 0 0 1 %g %g" fill="none" '
                 'stroke="%s" stroke-width="%g"/>'
                 % (cx - r, cy, r, r, cx + r, cy, LINE, sw))

    # --- notacion UML -----------------------------------------------------
    def flecha(self, x1, y1, x2, y2, dash='6 4', abierta=True, sw=1.6):
        """Dependencia: linea punteada con punta abierta."""
        self.line(x1, y1, x2, y2, sw=sw, dash=dash)
        import math
        a = math.atan2(y2 - y1, x2 - x1)
        L, W = 12, 6
        p1 = (x2 - L * math.cos(a) + W * math.sin(a),
              y2 - L * math.sin(a) - W * math.cos(a))
        p2 = (x2 - L * math.cos(a) - W * math.sin(a),
              y2 - L * math.sin(a) + W * math.cos(a))
        if abierta:
            self.line(p1[0], p1[1], x2, y2, sw=sw)
            self.line(p2[0], p2[1], x2, y2, sw=sw)
        else:
            self.poly([p1, (x2, y2), p2], fill=LINE)

    def icono_componente(self, x, y):
        self.rect(x, y, 15, 12, sw=1.2)
        self.rect(x - 4, y + 2, 8, 3.2, sw=1.2)
        self.rect(x - 4, y + 7, 8, 3.2, sw=1.2)

    def icono_artefacto(self, x, y):
        self.poly([(x, y), (x + 8, y), (x + 12, y + 4), (x + 12, y + 15),
                   (x, y + 15)], fill='#ffffff', sw=1.2)
        self.poly([(x + 8, y), (x + 8, y + 4), (x + 12, y + 4)], fill='none',
                  sw=1.2)

    def componente(self, x, y, w, h, nombre, estereotipo='component',
                   fill='#ffffff', nota=None):
        self.rect(x, y, w, h, fill=fill)
        self.icono_componente(x + w - 22, y + 8)
        lineas = nombre if isinstance(nombre, list) else [nombre]
        if estereotipo:
            self.txt(x + w / 2, y + 19, '«%s»' % estereotipo, 10.5,
                     italic=True, anchor='middle', fill='#555')
        top = y + (26 if estereotipo else 10)
        bot = y + h - (20 if nota else 8)
        y0 = top + max((bot - top) - 16 * len(lineas), 0) / 2 + 13
        for i, l in enumerate(lineas):
            self.txt(x + w / 2, y0 + i * 16, l, 12.5, anchor='middle')
        if nota:
            self.txt(x + w / 2, y + h - 8, nota, 9.5, anchor='middle',
                     fill='#777')

    def artefacto(self, x, y, w, h, nombre, fill='#ffffff'):
        self.rect(x, y, w, h, fill=fill)
        self.icono_artefacto(x + w - 22, y + 8)
        lineas = nombre if isinstance(nombre, list) else [nombre]
        self.txt(x + 12, y + 19, '«artifact»', 10, italic=True, fill='#555')
        for i, l in enumerate(lineas):
            self.txt(x + 12, y + 35 + i * 14, l, 12.5)

    def paquete(self, x, y, w, h, titulo, fill='#ffffff'):
        self.rect(x, y - 22, 20 + 6.1 * len(titulo), 22, fill=fill)
        self.rect(x, y, w, h, fill=fill)
        self.txt(x + 10, y - 7, titulo, 11.5, italic=True, fill='#555')

    def nodo3d(self, x, y, w, h, d=14, fill='#ffffff'):
        self.rect(x, y, w, h, fill=fill, sw=1.8)
        self.poly([(x, y), (x + d, y - d), (x + w + d, y - d), (x + w, y)],
                  fill=fill, sw=1.8)
        self.poly([(x + w, y), (x + w + d, y - d), (x + w + d, y + h - d),
                   (x + w, y + h)], fill=fill, sw=1.8)

    def save(self, path):
        self.add('</svg>')
        open(path, 'w', encoding='utf-8').write('\n'.join(self.p))


# =========================================================================
# 1. DIAGRAMA DE COMPONENTES
# =========================================================================
AZUL, VERDE, CREMA, GRIS = '#eef3fb', '#eef7f0', '#fdf6e8', '#f4f4f6'

c = Svg(1120, 1080, 'Diagrama de componentes · Prototipo RODE')

# ---- Frontend -----------------------------------------------------------
c.paquete(60, 72, 1000, 232, '«subsistema» Frontend — Aplicación web progresiva (React)',
          fill='#fbfcfe')
front = [
    ('Autenticación', 'RF-01, RF-02'),
    ('Inventario de\ningredientes', 'RF-03 a RF-06'),
    ('Productos y\nrecetas', 'RF-07 a RF-10'),
    ('Encargos', 'RF-11 a RF-16'),
    ('Notificaciones\ny alertas', 'RF-18'),
    ('Lista de compras', 'RF-17'),
]
for i, (nom, rf) in enumerate(front):
    col, fil = i % 4, i // 4
    c.componente(96 + col * 238, 96 + fil * 100, 220, 84, nom.split('\n'),
                 fill=AZUL, nota=rf)

c.componente(96 + 2 * 238, 196, 220, 84, ['Cliente del API', '(HTTP / fetch)'],
             fill=GRIS)
c.componente(96 + 3 * 238, 196, 220, 84,
             ['Service Worker', 'caché y modo offline'], fill=GRIS)

# ---- Interfaz Frontend / Backend ---------------------------------------
c.line(560, 304, 560, 331)
c.arc_socket(560, 331, 15)
c.line(560, 350, 560, 355)
c.circle(560, 346, 8.5)
c.txt(585, 335, '«interface» API REST', 12)
c.txt(585, 350, 'HTTPS · JSON', 10.5, italic=True, fill='#666')

# ---- Backend ------------------------------------------------------------
c.paquete(60, 378, 1000, 472,
          '«subsistema» Backend monolítico — Node.js / Express', fill='#fcfcfd')

# capa de presentación
c.rect(88, 400, 944, 96, fill=CREMA, dash='7 5', sw=1.4)
c.txt(98, 416, 'Capa de presentación', 11, italic=True, fill='#8a6d1f')
c.componente(118, 424, 430, 58, 'Middleware de autenticación (JWT)',
             fill='#ffffff')
c.componente(584, 424, 430, 58, 'Controladores REST', fill='#ffffff')

# capa de negocio
c.rect(88, 512, 944, 208, fill=VERDE, dash='7 5', sw=1.4)
c.txt(98, 528, 'Capa de lógica de negocio', 11, italic=True, fill='#3f6b4a')
neg = [
    ['Servicio de autenticación', 'y sesiones'],
    ['Servicio de inventario', 'y movimientos de stock'],
    ['Servicio de productos', 'y recetas'],
    ['Servicio de alertas', 'y notificaciones'],
    ['Servicio de lista', 'de compras'],
    ['Servicio de encargos'],
]
for i, nom in enumerate(neg):
    c.componente(108 + (i % 3) * 308, 540 + (i // 3) * 78, 290, 68, nom,
                 fill='#ffffff')

# capa de persistencia
c.rect(88, 736, 944, 96, fill=GRIS, dash='7 5', sw=1.4)
c.txt(98, 752, 'Capa de persistencia', 11, italic=True, fill='#555')
c.componente(118, 760, 430, 58, 'Repositorios de datos (mysql2)', fill='#ffffff')
c.componente(584, 760, 430, 58, 'Gestor de transacciones', fill='#ffffff')

# dependencias entre capas
c.flecha(333, 482, 262, 540)   # middleware  -> servicio de autenticación
c.flecha(700, 482, 570, 540)   # controladores -> servicio de inventario
c.flecha(880, 482, 869, 540)   # controladores -> servicio de productos
c.flecha(253, 686, 305, 760)   # servicio de alertas -> repositorios
c.flecha(869, 686, 815, 760)   # servicio de encargos -> gestor de transacciones

# ---- Interfaz Backend / Base de datos -----------------------------------
c.line(560, 850, 560, 875)
c.arc_socket(560, 875, 15)
c.circle(560, 890, 8.5)
c.line(560, 899, 560, 912)
c.txt(585, 879, '«interface» SQL', 12)
c.txt(585, 894, 'red interna de Docker · usuario de permisos mínimos', 10.5,
      italic=True, fill='#666')

c.rect(360, 912, 420, 74, fill='#f7eef4')
c.txt(570, 934, '«base de datos»', 10.5, italic=True, anchor='middle', fill='#555')
c.txt(570, 956, 'MariaDB 11.8 — esquema Rode', 13.5, anchor='middle')
c.txt(570, 974, '8 tablas · InnoDB · utf8mb4', 10.5, anchor='middle', fill='#777')

# ---- Convenciones -------------------------------------------------------
c.rect(60, 900, 260, 132, fill='#fbfbfb', stroke='#bbb', sw=1.2)
c.txt(74, 922, 'Convenciones', 12, bold=True)
c.icono_componente(90, 936)
c.txt(118, 947, 'componente', 11)
c.circle(88, 972, 7)
c.line(88, 979, 88, 986)
c.txt(118, 977, 'interfaz provista', 11)
c.arc_socket(88, 1004, 11)
c.line(88, 1004, 88, 1012)
c.txt(118, 1008, 'interfaz requerida', 11)
c.flecha(230, 1004, 300, 1004)
c.txt(265, 996, 'dependencia', 10, anchor='middle', fill='#666')

c.save('/Users/lorena/RODE/docs/componentes_rode.svg')


# =========================================================================
# 2. DIAGRAMA DE DESPLIEGUE
# =========================================================================
d = Svg(1160, 800, 'Diagrama de despliegue · Prototipo RODE')

# ---- Dispositivo de la usuaria -----------------------------------------
d.nodo3d(60, 210, 330, 250, fill='#fbfcfe')
d.txt(225, 234, '«device»', 11, italic=True, anchor='middle', fill='#555')
d.txt(225, 254, 'Dispositivo de la emprendedora', 13, anchor='middle')
d.txt(225, 271, '(móvil o computador)', 10.5, anchor='middle', fill='#777')

d.rect(84, 284, 282, 158, fill=AZUL)
d.txt(225, 304, '«execution environment»', 10.5, italic=True, anchor='middle',
      fill='#555')
d.txt(225, 322, 'Navegador web', 12.5, anchor='middle')
d.artefacto(102, 334, 246, 48, 'PWA RODE (build de React)')
d.artefacto(102, 388, 246, 48, 'Service Worker · caché local')

# ---- Servidor -----------------------------------------------------------
d.nodo3d(560, 80, 540, 650, fill='#fcfcfd')
d.txt(830, 104, '«device»', 11, italic=True, anchor='middle', fill='#555')
d.txt(830, 124, 'Servidor VPS — Oracle Cloud (ARM)', 13.5, anchor='middle')
d.txt(830, 141, 'Ubuntu Server 24.04 LTS', 10.5, anchor='middle', fill='#777')

d.rect(582, 156, 496, 494, fill='#f8f9fb', stroke='#9aa0a6', sw=1.4)
d.txt(594, 174, '«execution environment» Docker Engine', 11, italic=True,
      fill='#555')

# contenedor proxy (pendiente)
d.rect(604, 186, 452, 96, fill='#ffffff', dash='5 4', sw=1.5)
d.txt(616, 206, '«execution environment»  Contenedor: Nginx (proxy inverso)',
      11, italic=True, fill='#555')
d.artefacto(620, 214, 420, 56, ['Certificado TLS · terminación HTTPS',
                                'pendiente de configuración'])

# contenedor backend
d.rect(604, 310, 452, 152, fill=VERDE)
d.txt(616, 330, '«execution environment»  Contenedor: Node.js / Express', 11,
      italic=True, fill='#555')
d.artefacto(620, 338, 420, 52, 'api-rode — API REST')
d.artefacto(620, 398, 420, 52, 'Build del frontend (archivos estáticos)')

# contenedor base de datos
d.rect(604, 492, 452, 126, fill='#f7eef4')
d.txt(616, 512, '«execution environment»  Contenedor: MariaDB 11.8', 11,
      italic=True, fill='#555')
d.artefacto(620, 520, 420, 52, 'Base de datos Rode (8 tablas · InnoDB)')
d.txt(620, 596, 'Volumen persistente de datos', 11, fill='#666')

# respaldos
d.rect(582, 664, 496, 50, fill=CREMA)
d.txt(594, 686, '«artifact» Respaldos automáticos', 11, italic=True, fill='#555')
d.txt(594, 703, 'diarios 03:00 (America/Bogotá) · retención 14 días', 11)

# ---- Enlaces ------------------------------------------------------------
d.flecha(404, 300, 600, 246, dash=None, abierta=False, sw=1.8)
d.txt(492, 206, '«protocolo» HTTPS', 11.5, anchor='middle')
d.txt(492, 222, 'descarga de la PWA', 10, anchor='middle', fill='#666')
d.txt(492, 236, 'y llamadas al API REST', 10, anchor='middle', fill='#666')

d.flecha(700, 282, 700, 310, dash=None, abierta=False, sw=1.8)
d.txt(714, 301, 'HTTP · red interna de Docker', 10.5, fill='#444')

d.flecha(700, 462, 700, 492, dash=None, abierta=False, sw=1.8)
d.txt(714, 470, '«protocolo» TCP/IP · red interna de Docker', 10.5, fill='#444')
d.txt(714, 483, 'driver mysql2 · usuario de permisos mínimos', 9.5, fill='#777')

d.flecha(700, 618, 700, 664, dash=None, abierta=False, sw=1.6)
d.txt(714, 646, 'volcado diario', 10.5, fill='#444')

# ---- Convenciones y notas ----------------------------------------------
d.rect(60, 500, 330, 118, fill='#fbfbfb', stroke='#bbb', sw=1.2)
d.txt(74, 522, 'Convenciones', 12, bold=True)
d.txt(74, 543, '«device»  nodo físico', 11)
d.txt(74, 561, '«execution environment»  entorno de ejecución', 11)
d.txt(74, 579, '«artifact»  artefacto desplegable', 11)
d.txt(74, 601, 'Borde punteado: previsto, aún no configurado', 11, fill='#8a6d1f')

d.rect(60, 634, 330, 80, fill='#fbfbfb', stroke='#bbb', sw=1.2)
d.txt(74, 656, 'Nota', 12, bold=True)
d.txt(74, 675, 'El acceso administrativo a la base de datos', 10.5, fill='#555')
d.txt(74, 690, 'durante el desarrollo (cliente de escritorio) es', 10.5, fill='#555')
d.txt(74, 705, 'temporal y no hace parte de esta arquitectura.', 10.5, fill='#555')

d.save('/Users/lorena/RODE/docs/despliegue_rode.svg')
print('svg listos')
