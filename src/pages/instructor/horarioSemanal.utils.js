export const formatearFechaISO = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export const inicioSemanaActual = (fechaBase = new Date()) => {
  const fecha = new Date(fechaBase);
  const dia = fecha.getDay() || 7;
  fecha.setDate(fecha.getDate() - dia + 1);
  return formatearFechaISO(fecha);
};

export const finSemanaActual = (fechaBase = new Date()) => {
  const fecha = new Date(`${inicioSemanaActual(fechaBase)}T12:00:00`);
  fecha.setDate(fecha.getDate() + 4);
  return formatearFechaISO(fecha);
};

export const obtenerFechaSesion = (sesion) => {
  const valor = String(sesion.fecha_clase || sesion.fecha || sesion.fecha_sesion || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : "";
};

export const normalizarDiaSemana = (valor) => {
  const texto = String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const equivalencias = {
    "1": "lunes",
    "2": "martes",
    "3": "miercoles",
    "4": "jueves",
    "5": "viernes",
    lunes: "lunes",
    martes: "martes",
    miercoles: "miercoles",
    jueves: "jueves",
    viernes: "viernes"
  };
  return equivalencias[texto] || "";
};

export const obtenerDiaSemanaSesion = (sesion) => normalizarDiaSemana(
  sesion.dia_semana || sesion.nombre_dia || sesion.dia_nombre || sesion.dia || sesion.numero_dia ||
  sesion.bloque_jornada?.dia_semana || sesion.horario?.dia_semana || sesion.horario?.dia
);

const obtenerHoraInicio = (sesion) =>
  sesion.hora_inicio_programada || sesion.hora_inicio || sesion.horaInicio || sesion.inicio || sesion.bloque_jornada?.hora_inicio || "";
const obtenerHoraFin = (sesion) =>
  sesion.hora_fin_programada || sesion.hora_fin || sesion.horaFin || sesion.fin || sesion.bloque_jornada?.hora_fin || "";

export const normalizarHorarioComoSesion = (horario, grupo) => ({
  ...horario,
  id: horario.id_horario || horario.id_sesion_formacion || horario.id,
  id_grupo: horario.id_grupo || grupo?.id_grupo,
  grupo: horario.grupo || grupo,
  numero_ficha: horario.numero_ficha || grupo?.numero_ficha || grupo?.numero_grupo || grupo?.codigo,
  estado: obtenerFechaSesion(horario) ? (horario.estado || "PROGRAMADA") : "PROGRAMADA",
  dia_semana: horario.dia_semana || horario.dia || horario.nombre_dia || horario.day,
  hora_inicio_programada: obtenerHoraInicio(horario),
  hora_fin_programada: obtenerHoraFin(horario),
  competencia: horario.competencia || horario.clase_competencia?.competencia || horario.clase_competencia,
  ambiente: horario.ambiente || horario.bloque_jornada?.ambiente
});

const obtenerClaveSesion = (sesion) => [
  obtenerFechaSesion(sesion) || obtenerDiaSemanaSesion(sesion),
  obtenerHoraInicio(sesion),
  obtenerHoraFin(sesion),
  sesion.id_grupo || sesion.grupo?.id_grupo,
  sesion.competencia?.nombre_competencia || sesion.nombre_competencia || sesion.bloque_jornada?.nombre_bloque
].join("|");

export const combinarSesionesCalendario = (...listas) => {
  const sesiones = new Map();
  listas.flat().forEach((sesion) => {
    const clave = obtenerClaveSesion(sesion);
    if (!clave.replaceAll("|", "")) return;
    if (!sesiones.has(clave) || obtenerFechaSesion(sesion)) sesiones.set(clave, sesion);
  });
  return [...sesiones.values()];
};
