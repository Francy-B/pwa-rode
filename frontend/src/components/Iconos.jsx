// Íconos provisionales (línea fina). Para usar los definitivos de la marca basta
// con reemplazar el contenido de `rutas`; el resto de la app no cambia.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const rutas = {
  inicio: <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />,
  inventario: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 11h14M9 7v2M9 14v3" /></>,
  recetas: <path d="M3 18c0-4 4-9 9-9s9 5 9 9M8 10l-1 8M12 9v9M16 10l1 8" />,
  encargos: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11h6M9 15h6" /></>,
  compras: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 016 0v2" /></>,
  usuario: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" /></>,
  salir: <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 8l-4 4 4 4M6 12h10" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  editar: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  basura: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>,
  buscar: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  atras: <path d="M19 12H5M11 6l-6 6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  alerta: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.5v.01" /></>,
  instalar: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v6M9.5 11.5L12 14l2.5-2.5" /></>,
  candado: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
}

export default function Icono({ nombre, tamano = 24 }) {
  return (
    <svg {...base} width={tamano} height={tamano}>
      {rutas[nombre]}
    </svg>
  )
}
