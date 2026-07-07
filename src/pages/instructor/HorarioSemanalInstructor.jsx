import { useMemo } from "react";
import { CalendarClock, Clock } from "lucide-react";
import {
  formatearFechaISO,
  normalizarDiaSemana,
  obtenerDiaSemanaSesion,
  obtenerFechaSesion
} from "./horarioSemanal.utils";

const obtenerIdSesion = (sesion) => sesion.id_sesion_formacion || sesion.id;
const obtenerIdGrupoSesion = (sesion) => sesion.id_grupo || sesion.grupo?.id_grupo;
const obtenerFichaSesion = (sesion) => sesion.grupo?.numero_ficha || sesion.numero_ficha || sesion.id_grupo || "Sin ficha";
const obtenerCompetenciaSesion = (sesion) =>
  sesion.competencia?.nombre_competencia ||
  sesion.competencia?.nombre ||
  sesion.clase_competencia?.competencia?.nombre_competencia ||
  sesion.clase_competencia?.nombre_competencia ||
  sesion.nombre_competencia ||
  sesion.bloque_jornada?.nombre_bloque ||
  "Sesion de formacion";
const obtenerHoraInicioSesion = (sesion) =>
  sesion.hora_inicio_programada || sesion.hora_inicio || sesion.horaInicio || sesion.inicio || sesion.bloque_jornada?.hora_inicio || "";
const obtenerHoraFinSesion = (sesion) =>
  sesion.hora_fin_programada || sesion.hora_fin || sesion.horaFin || sesion.fin || sesion.bloque_jornada?.hora_fin || "";
const normalizarHora = (valor) => String(valor || "").slice(0, 5) || "--:--";

const obtenerClaveSesionCalendario = (sesion) => [
  obtenerFechaSesion(sesion) || obtenerDiaSemanaSesion(sesion),
  obtenerHoraInicioSesion(sesion),
  obtenerHoraFinSesion(sesion),
  obtenerIdGrupoSesion(sesion) || sesion.id_grupo,
  obtenerCompetenciaSesion(sesion)
].join("|");

const JORNADAS_HORARIO = [
  { value: "MANANA", label: "Horario de la mañana" },
  { value: "TARDE", label: "Horario de la tarde" },
  { value: "NOCHE", label: "Horario de la noche" }
];
const BLOQUES_MANANA = [
  { inicio: "07:00", fin: "09:30" },
  { inicio: "10:00", fin: "12:30" }
];
const RANGOS_JORNADA = {
  MANANA: { inicio: 6, fin: 12 },
  TARDE: { inicio: 12, fin: 18 },
  NOCHE: { inicio: 18, fin: 24 }
};

const obtenerJornadaSesion = (sesion) => {
  const hora = Number.parseInt(normalizarHora(obtenerHoraInicioSesion(sesion)).slice(0, 2), 10);
  if (!Number.isFinite(hora)) return "MANANA";
  if (hora >= RANGOS_JORNADA.MANANA.inicio && hora < RANGOS_JORNADA.MANANA.fin) return "MANANA";
  if (hora >= RANGOS_JORNADA.TARDE.inicio && hora < RANGOS_JORNADA.TARDE.fin) return "TARDE";
  return "NOCHE";
};

const obtenerHorasBloque = (sesion, index, sesionesDia = []) => {
  const inicio = normalizarHora(obtenerHoraInicioSesion(sesion));
  const fin = normalizarHora(obtenerHoraFinSesion(sesion));
  const sesionesVisibles = sesionesDia.slice(0, 2);
  const horaBase = normalizarHora(obtenerHoraInicioSesion(sesionesVisibles[0]));
  const horasRepetidas = sesionesVisibles.length > 1 && horaBase !== "--:--" &&
    sesionesVisibles.every((item) => normalizarHora(obtenerHoraInicioSesion(item)) === horaBase);
  if (horasRepetidas && horaBase === "07:00" && index < BLOQUES_MANANA.length) return BLOQUES_MANANA[index];
  return { inicio, fin };
};

const claseEstadoSesion = (estado) => {
  const valor = String(estado || "").toUpperCase();
  if (["ABIERTA", "ACTIVA", "EN_CURSO"].includes(valor)) return "activa";
  if (valor === "PROGRAMADA") return "proxima";
  if (valor === "PENDIENTE") return "pendiente";
  if (["CERRADA", "CERRADO", "FINALIZADA"].includes(valor)) return "cerrada";
  if (["CANCELADA", "CANCELADO"].includes(valor)) return "cancelada";
  return "sin";
};

const etiquetaEstadoSesion = (estado) => {
  const clase = claseEstadoSesion(estado);
  if (clase === "activa") return "Activa";
  if (clase === "proxima") return "Proxima sesion";
  if (clase === "pendiente") return "Pendiente";
  if (clase === "cerrada") return "Cerrada";
  if (clase === "cancelada") return "Cancelada";
  return String(estado || "Proxima sesion");
};

const sesionFueAbiertaDesdeAsistencia = (sesion) => {
  if (typeof window === "undefined") return false;
  const idsSesion = [
    sesion.id_sesion_formacion,
    sesion.id
  ].filter(Boolean).map(String);
  const idsActivos = [
    window.localStorage.getItem("sima_asistencia_sesion_activa"),
    window.sessionStorage.getItem("sima_asistencia_sesion_activa"),
    window.localStorage.getItem("sima_asistencia_sesion_seleccionada"),
    window.sessionStorage.getItem("sima_asistencia_sesion_seleccionada")
  ].filter(Boolean).map(String);

  return idsSesion.some((id) => idsActivos.includes(id));
};

const obtenerEstadoSesion = (sesion, fechaISO, horas, ahora) => {
  const estado = String(sesion.estado || "").toUpperCase();
  if (["CANCELADA", "CANCELADO"].includes(estado)) return "CANCELADA";

  const hoyISO = formatearFechaISO(ahora);
  if (fechaISO > hoyISO) return "PROGRAMADA";
  if (fechaISO < hoyISO) return "CERRADA";

  const inicio = new Date(`${fechaISO}T${horas.inicio}:00`);
  const fin = new Date(`${fechaISO}T${horas.fin}:00`);
  const inicioValido = !Number.isNaN(inicio.getTime());
  const finValido = !Number.isNaN(fin.getTime());
  const antesInicio = inicioValido && ahora < inicio;
  const despuesFin = finValido && ahora > fin;
  if (sesionFueAbiertaDesdeAsistencia(sesion)) return despuesFin ? "CERRADA" : "ACTIVA";
  if (["ABIERTA", "ACTIVA", "EN_CURSO"].includes(estado)) return despuesFin ? "CERRADA" : "ACTIVA";
  if (["CERRADA", "CERRADO", "FINALIZADA"].includes(estado)) {
    if (antesInicio) return "PROGRAMADA";
    return despuesFin ? "CERRADA" : "PROGRAMADA";
  }
  if (antesInicio) return "PROGRAMADA";
  if (despuesFin) return "CERRADA";
  if (["PENDIENTE", "PROGRAMADA", ""].includes(estado)) return "PENDIENTE";

  return "PROGRAMADA";
};

const obtenerClaseDia = (sesiones) => {
  if (!sesiones.length) return "sin-sesiones";
  if (sesiones.some((sesion) => claseEstadoSesion(sesion.estadoCalendario) === "activa")) return "activa";
  if (sesiones.some((sesion) => claseEstadoSesion(sesion.estadoCalendario) === "cerrada")) return "cerrada";
  if (sesiones.some((sesion) => claseEstadoSesion(sesion.estadoCalendario) === "cancelada")) return "cancelada";
  if (sesiones.some((sesion) => claseEstadoSesion(sesion.estadoCalendario) === "pendiente")) return "pendiente";
  return "con-sesiones";//kjij//
};

const puedeAbrirSesion = (estado) => String(estado || "").toUpperCase() === "PENDIENTE";

const prioridadSesionCalendario = (sesion) => {
  const clase = claseEstadoSesion(sesion?.estadoCalendario || sesion?.estado);
  const prioridadEstado = {
    activa: 5,
    cancelada: 4,
    cerrada: 3,
    pendiente: 2,
    proxima: 1,
    sin: 0
  };
  return (sesion?.id_sesion_formacion ? 10 : 0) + (prioridadEstado[clase] || 0);
};

const formatearFechaCorta = (fechaISO) => new Date(`${fechaISO}T12:00:00`)
  .toLocaleDateString("es-CO", { day: "2-digit", month: "short" });

export default function HorarioSemanalInstructor({
  sesionesSemana,
  inicioSemana,
  finSemana,
  ahora,
  jornada,
  onJornadaChange,
  onAbrirSesionPendiente
}) {
  const calendario = useMemo(() => {
    const dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
    const inicio = new Date(`${inicioSemana}T12:00:00`);
    return dias.map((dia, index) => {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + index);
      const fechaISO = formatearFechaISO(fecha);
      const sesionesDia = sesionesSemana
        .filter((sesion) => obtenerFechaSesion(sesion) === fechaISO || (!obtenerFechaSesion(sesion) && obtenerDiaSemanaSesion(sesion) === normalizarDiaSemana(dia)))
        .sort((a, b) => String(obtenerHoraInicioSesion(a)).localeCompare(String(obtenerHoraInicioSesion(b))))
        .filter((sesion) => obtenerJornadaSesion(sesion) === jornada);
      const normalizadas = sesionesDia.map((sesion, posicion) => {
        const horas = obtenerHorasBloque(sesion, posicion, sesionesDia);
        return {
          ...sesion,
          fechaCalendario: fechaISO,
          horasDashboard: horas,
          estadoCalendario: obtenerEstadoSesion(sesion, fechaISO, horas, ahora)
        };
      });
      const unicas = [...normalizadas.reduce((mapa, sesion) => {
        const clave = `${obtenerIdGrupoSesion(sesion) || obtenerFichaSesion(sesion)}|${sesion.horasDashboard.inicio}|${sesion.horasDashboard.fin}`;
        const existente = mapa.get(clave);
        if (!existente || prioridadSesionCalendario(sesion) > prioridadSesionCalendario(existente)) {
          mapa.set(clave, sesion);
        }
        return mapa;
      }, new Map()).values()];
      return { dia, fecha: fechaISO, clase: obtenerClaseDia(unicas), sesiones: unicas };
    });
  }, [ahora, inicioSemana, jornada, sesionesSemana]);

  return (
    <article className="coordinador-card instructor-calendar-card instructor-calendar-card-dark">
      <div className="instructor-calendar-top">
        <div className="instructor-calendar-title-row">
          <h2>Horario semanal</h2>
          <span>{formatearFechaCorta(inicioSemana)} - {formatearFechaCorta(finSemana)}</span>
        </div>
        <div className="instructor-calendar-jornada-control">
          <select aria-label="Jornada del horario" value={jornada} onChange={(evento) => onJornadaChange(evento.target.value)}>
            {JORNADAS_HORARIO.map((opcion) => <option value={opcion.value} key={opcion.value}>{opcion.label}</option>)}
          </select>
        </div>
      </div>
      <div className="instructor-calendar-legend">
        <span><i className="activa"></i> Sesion activa</span>
        <span><i className="proxima"></i> Proxima seccion</span>
        <span><i className="pendiente"></i> Pendiente</span>
        <span><i className="cerrada"></i> Cerrada</span>
        <span><i className="cancelada"></i> Cancelada</span>
      </div>
      <div className="instructor-calendar-grid">
        {calendario.map((item) => (
          <div key={item.dia} className={`instructor-calendar-day ${item.clase}`}>
            <div className="instructor-calendar-head"><strong>{item.dia.slice(0, 3).toUpperCase()}</strong><span>{Number(item.fecha.slice(8, 10))}</span></div>
            {item.sesiones.length ? item.sesiones.map((sesion, index) => (
              <div
                className={`instructor-calendar-session ${claseEstadoSesion(sesion.estadoCalendario)} ${puedeAbrirSesion(sesion.estadoCalendario) ? "clickable" : ""}`}
                key={obtenerIdSesion(sesion) || `${item.dia}-${obtenerClaveSesionCalendario(sesion)}-${index}`}
                role={puedeAbrirSesion(sesion.estadoCalendario) ? "button" : undefined}
                tabIndex={puedeAbrirSesion(sesion.estadoCalendario) ? 0 : undefined}
                onClick={() => {
                  if (puedeAbrirSesion(sesion.estadoCalendario)) onAbrirSesionPendiente?.(sesion);
                }}
                onKeyDown={(evento) => {
                  if (!puedeAbrirSesion(sesion.estadoCalendario)) return;
                  if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    onAbrirSesionPendiente?.(sesion);
                  }
                }}
              >
                <span className="instructor-calendar-time"><Clock size={13} />{sesion.horasDashboard.inicio} - {sesion.horasDashboard.fin}</span>
                <strong>{obtenerCompetenciaSesion(sesion)}</strong>
                <small>Ficha {obtenerFichaSesion(sesion)}</small>
                <em>{etiquetaEstadoSesion(sesion.estadoCalendario)}</em>
              </div>
            )) : (
              <div className="instructor-calendar-empty"><CalendarClock size={18} /><p>Sin sesiones programadas</p></div>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
