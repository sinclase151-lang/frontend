import './badges.css';

// Paleta de colores determinística (azul oscuro, verde azulado, morado, azul medio)
const PALETA = [
  '#0B2442', // azul oscuro
  '#1a6b6b', // verde azulado
  '#6B3FA0', // morado suave
  '#0b2442', // azul medio
  '#0b2442', // azul acero
  '#2d7a5f', // verde bosque
  '#0b2442', // violeta
  '#0b2442'  // azul rey
];

/**
 * Genera un índice de color determinístico a partir del nombre.
 * El mismo nombre siempre producirá el mismo color.
 */
function colorDesdNombre(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETA[Math.abs(hash) % PALETA.length];
}

/**
 * Extrae las iniciales del nombre completo.
 * Toma la 1ª letra del primer y segundo token (ignorando partículas cortas).
 */
function iniciales(nombre) {
  if (!nombre) return '?';
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1); // ignora partículas tipo "de", "la"
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

const SIZES = {
  sm: { width: 28, height: 28, fontSize: 11 },
  md: { width: 36, height: 36, fontSize: 14 },
  lg: { width: 48, height: 48, fontSize: 18 }
};

export default function AvatarAprendiz({ nombre = '', size = 'md' }) {
  const texto = iniciales(nombre);
  const bg    = colorDesdNombre(nombre);
  const dim   = SIZES[size] ?? SIZES.md;

  return (
    <span
      className="avatar-aprendiz"
      style={{
        width:           dim.width,
        height:          dim.height,
        fontSize:        dim.fontSize,
        backgroundColor: bg
      }}
      title={nombre}
      aria-label={`Avatar de ${nombre}`}
    >
      {texto}
    </span>
  );
}

