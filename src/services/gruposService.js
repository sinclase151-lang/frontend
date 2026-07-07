export const GRUPOS_API_BASE = "/api";
export const GRUPOS_LIST_LIMIT = 1000;
export const GRUPOS_LIST_URL = `${GRUPOS_API_BASE}/groups?limit=${GRUPOS_LIST_LIMIT}`;

export const ESTADOS_GRUPO = [
  { value: "EN_FORMACION", label: "En formacion", className: "activo", priority: 0 },
  { value: "PRACTICAS", label: "Practicas", className: "suspendido", priority: 1 },
  { value: "FINALIZADO", label: "Finalizado", className: "cerrado", priority: 2 },
];

const ESTADOS_LEGACY = {
  ACTIVO: "EN_FORMACION",
  SUSPENDIDO: "PRACTICAS",
  CERRADO: "FINALIZADO",
};

export function normalizarEstadoGrupo(estado) {
  const valor = String(estado || "EN_FORMACION").trim().toUpperCase();
  return ESTADOS_LEGACY[valor] || valor;
}

export function obtenerMetaEstadoGrupo(estado) {
  const estadoNormalizado = normalizarEstadoGrupo(estado);
  return (
    ESTADOS_GRUPO.find((item) => item.value === estadoNormalizado) ||
    { value: estadoNormalizado, label: estadoNormalizado || "Sin estado", className: "activo", priority: 99 }
  );
}

export function etiquetaEstadoGrupo(estado) {
  return obtenerMetaEstadoGrupo(estado).label;
}

export function claseEstadoGrupo(estado) {
  return obtenerMetaEstadoGrupo(estado).className;
}

export function prioridadEstadoGrupo(estado) {
  return obtenerMetaEstadoGrupo(estado).priority;
}
