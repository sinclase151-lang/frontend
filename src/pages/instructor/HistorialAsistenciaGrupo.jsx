import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, MoreVertical, UserRound } from "lucide-react";
import {
  listarSesionesGrupo,
  obtenerAprendicesPorGrupo,
  obtenerAsistenciasSesion
} from "./asistencia/asistencia.service";
import {
  combinarAprendicesConAsistencias,
  obtenerIdSesion,
  prepararAsistenciaSesion
} from "./asistencia/asistencia.utils";
import "../coordinador/coordinador.css";
import "../fichas/fichas.css";
import "./instructor.css";
import "./historial-asistencia.css";

const RESUMEN_ASISTENCIA = [
  { key: "PRESENTE", label: "Presente", color: "#55A83B", backgroundColor: "#EAF6E6" },
  { key: "INASISTENTE", label: "Ausente", color: "#EE6666", backgroundColor: "#FDECEC" },
  { key: "TARDE", label: "Tarde", color: "#E9AC24", backgroundColor: "#FFF5D9" },
  { key: "JUSTIFICAD", label: "Justificado", color: "#0B2442", backgroundColor: "#EAF0F6" },
];

const DIAS_CALENDARIO = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MESES_CALENDARIO = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function obtenerCodigo(grupo) {
  return (
    grupo?.numero_ficha ||
    grupo?.numero_grupo ||
    grupo?.codigo ||
    grupo?.ficha ||
    grupo?.id_grupo ||
    grupo?.id ||
    "Sin ficha"
  );
}

function obtenerPrograma(grupo) {
  return (
    grupo?.programa_formacion?.nombre_programa ||
    grupo?.programa?.nombre_programa ||
    grupo?.nombre_programa ||
    grupo?.programa ||
    "Programa de formacion"
  );
}

function obtenerIdGrupo(grupo) {
  return grupo?.id_grupo || grupo?.id || grupo?.codigo || grupo?.numero_ficha || "";
}

function obtenerGrupoGuardado(idGrupo) {
  try {
    const guardado = sessionStorage.getItem(`sima_grupo_detalle_${idGrupo}`);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

function obtenerNombreCompetenciaSesion(sesion) {
  return sesion?.competencia?.nombre_competencia || sesion?.competencia?.nombre || "Sin competencia";
}

function obtenerNumeroTrimestreSesion(sesion) {
  return sesion?.grupo_trimestre?.numero_trimestre || sesion?.numero_trimestre || "";
}

function obtenerHorarioSesion(sesion) {
  const inicio = sesion?.hora_inicio_programada || sesion?.bloque_jornada?.hora_inicio || "";
  const fin = sesion?.hora_fin_programada || sesion?.bloque_jornada?.hora_fin || "";
  return inicio && fin ? `${String(inicio).slice(0, 5)} - ${String(fin).slice(0, 5)}` : "Sin horario";
}

function normalizarEstadoHistorial(estado) {
  const valor = String(estado || "").trim().toUpperCase();

  if (!valor || valor === "SIN_ESTADO" || valor === "SIN-ESTADO" || valor === "PENDIENTE") {
    return "INASISTENTE";
  }

  if (["RETARDADO", "RETRASO", "RETARDO"].includes(valor)) {
    return "TARDE";
  }

  if (valor === "INASISTENCIA" || valor === "AUSENTE") {
    return "INASISTENTE";
  }

  if (valor === "JUSTIFICADO") {
    return "JUSTIFICADA";
  }

  return valor;
}

function prepararRegistrosHistorial(asistencias) {
  return asistencias.map((asistencia) => {
    const registro = prepararAsistenciaSesion(asistencia);
    return {
      ...registro,
      estado: normalizarEstadoHistorial(registro.estado),
    };
  });
}

function obtenerEstadoSesion(sesion) {
  return String(sesion?.estado || "SIN_ESTADO").toUpperCase();
}

function obtenerFechaSesion(sesion) {
  return String(sesion?.fecha_clase || "").slice(0, 10);
}

function crearFechaLocal(fechaISO) {
  return new Date(`${fechaISO}T12:00:00`);
}

function formatearFechaISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function construirDiasMes(fechaBase) {
  const anio = fechaBase.getFullYear();
  const mes = fechaBase.getMonth();
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const dias = [];

  for (let dia = 1; dia <= ultimoDia; dia += 1) {
    const fecha = new Date(anio, mes, dia, 12);
    const diaSemana = fecha.getDay();

    if (!dias.length) {
      const espacios = diaSemana === 0 ? 6 : diaSemana - 1;
      for (let index = 0; index < espacios; index += 1) {
        dias.push(null);
      }
    }

    dias.push({
      dia,
      fechaISO: formatearFechaISO(fecha),
    });
  }

  return dias;
}

function etiquetaEstadoSesion(estado) {
  const etiquetas = {
    PROGRAMADA: "Programada",
    ABIERTA: "Abierta",
    CERRADA: "Cerrada",
    CANCELADA: "Cancelada",
    SIN_ESTADO: "Sin estado",
  };
  return etiquetas[estado] || estado;
}

function obtenerIniciales(nombre) {
  const partes = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return `${partes[0]?.[0] || "A"}${partes[1]?.[0] || ""}`.toUpperCase();
}

function construirGradienteResumen(items, total) {
  if (!total) return "#e5edf6";

  let inicio = 0;
  const segmentos = items
    .filter((item) => item.valor > 0)
    .map((item) => {
      const fin = inicio + (item.valor / total) * 100;
      const segmento = `${item.color} ${inicio}% ${fin}%`;
      inicio = fin;
      return segmento;
    });

  return `conic-gradient(${segmentos.join(", ")})`;
}

export default function HistorialAsistenciaGrupo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const grupo = location.state?.grupo || obtenerGrupoGuardado(id) || { id_grupo: id };
  const idGrupo = obtenerIdGrupo(grupo) || id;
  const grupoConsulta = grupo || idGrupo;
  const [sesiones, setSesiones] = useState([]);
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [registros, setRegistros] = useState([]);
  const [estadoResumenSeleccionado, setEstadoResumenSeleccionado] = useState("");
  const [sesionResumenSeleccionada, setSesionResumenSeleccionada] = useState("");
  const [sesionExpandida, setSesionExpandida] = useState("");
  const [cargandoSesiones, setCargandoSesiones] = useState(false);
  const [cargandoAsistencias, setCargandoAsistencias] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const sesionesPorFecha = useMemo(() => {
    return sesiones.reduce((mapa, sesion) => {
      const fecha = obtenerFechaSesion(sesion);
      if (!fecha) return mapa;
      const lista = mapa.get(fecha) || [];
      lista.push(sesion);
      mapa.set(fecha, lista);
      return mapa;
    }, new Map());
  }, [sesiones]);
  const diasCalendario = useMemo(() => construirDiasMes(mesCalendario), [mesCalendario]);
  const sesionesFechaSeleccionada = fechaSeleccionada ? sesionesPorFecha.get(fechaSeleccionada) || [] : [];
  const estadoSeleccionado = RESUMEN_ASISTENCIA.find((item) => item.key === estadoResumenSeleccionado);
  const sesionSeleccionadaParaTabla = sesionesFechaSeleccionada.find((sesion) => String(obtenerIdSesion(sesion)) === String(sesionResumenSeleccionada));
  const aprendicesSeleccionados = useMemo(() => {
    if (!sesionResumenSeleccionada) return [];

    return registros.filter((registro) => {
      const coincideSesion = String(registro.idSesion) === String(sesionResumenSeleccionada);
      const coincideEstado = estadoResumenSeleccionado ? registro.estado === estadoResumenSeleccionado : true;
      return coincideSesion && coincideEstado;
    });
  }, [estadoResumenSeleccionado, registros, sesionResumenSeleccionada]);
  const resumenesPorSesion = useMemo(() => {
    return sesionesFechaSeleccionada.map((sesion) => {
      const idSesion = obtenerIdSesion(sesion);
      const registrosSesion = registros.filter((registro) => String(registro.idSesion) === String(idSesion));
      const items = RESUMEN_ASISTENCIA.map((item) => ({
        ...item,
        valor: registrosSesion.filter((registro) => registro.estado === item.key).length,
      }));
      const total = items.reduce((suma, item) => suma + item.valor, 0);

      return {
        idSesion,
        sesion,
        items,
        aprendicesFiltrados: registrosSesion.filter((registro) => (
          String(sesionResumenSeleccionada) === String(idSesion) && estadoResumenSeleccionado
            ? registro.estado === estadoResumenSeleccionado
            : false
        )),
        total,
        gradiente: construirGradienteResumen(items, total),
      };
    });
  }, [registros, sesionesFechaSeleccionada]);
  const etiquetaMesCalendario = `${MESES_CALENDARIO[mesCalendario.getMonth()]} ${mesCalendario.getFullYear()}`;

  function alternarFiltroResumen(idSesion, estado = "") {
    const mismoFiltro = String(sesionResumenSeleccionada) === String(idSesion) && estadoResumenSeleccionado === estado;
    setSesionExpandida(String(idSesion));
    setSesionResumenSeleccionada(mismoFiltro ? "" : idSesion);
    setEstadoResumenSeleccionado(mismoFiltro ? "" : estado);
  }

  async function cargarRegistrosSesionesDia(sesionesDia, activo = true, opciones = {}) {
    const { silencioso = false, mantenerSeleccion = false } = opciones;
    const sesionesValidas = sesionesDia.filter((sesion) => obtenerIdSesion(sesion));
    if (!sesionesValidas.length) return;

    if (!mantenerSeleccion) {
      setSesionSeleccionada(sesionesValidas[0]);
      setRegistros([]);
      setEstadoResumenSeleccionado("");
      setSesionResumenSeleccionada("");
      setSesionExpandida("");
    }
    if (!silencioso) setCargandoAsistencias(true);
    setMensaje("");

    try {
      const aprendicesGrupo = await obtenerAprendicesPorGrupo(grupoConsulta).catch(() => []);
      const detalles = await Promise.all(
        sesionesValidas.map(async (sesion) => {
          const idSesion = obtenerIdSesion(sesion);
          const detalle = await obtenerAsistenciasSesion(idSesion);
          const registrosSesion = aprendicesGrupo.length
            ? combinarAprendicesConAsistencias(aprendicesGrupo, detalle.asistencias)
            : prepararRegistrosHistorial(detalle.asistencias);

          return {
            sesion: detalle.sesion || sesion,
            registros: registrosSesion.map((registro) => ({
              ...registro,
              estado: normalizarEstadoHistorial(registro.estado),
              id: `${idSesion}-${registro.id}`,
              idSesion,
            })),
          };
        })
      );
      if (!activo) return;
      const primeraSesion = detalles[0]?.sesion || sesionesValidas[0];
      const primerIdSesion = obtenerIdSesion(primeraSesion);
      const sesionActual = sesionesValidas.find((sesion) => String(obtenerIdSesion(sesion)) === String(sesionResumenSeleccionada));
      const idSesionActual = sesionActual ? obtenerIdSesion(sesionActual) : "";
      const idSesionParaMostrar = mantenerSeleccion && idSesionActual ? idSesionActual : primerIdSesion;

      setSesionSeleccionada(mantenerSeleccion && sesionActual ? sesionActual : primeraSesion);
      setRegistros(detalles.flatMap((detalle) => detalle.registros));
      setSesionExpandida(String(idSesionParaMostrar || ""));
      setSesionResumenSeleccionada(idSesionParaMostrar || "");
      setEstadoResumenSeleccionado(mantenerSeleccion ? estadoResumenSeleccionado : "PRESENTE");
    } catch (error) {
      console.error("Error cargando asistencias de seccion:", error);
      if (activo) setMensaje(error.message || "No fue posible cargar la asistencia de este dia.");
    } finally {
      if (activo && !silencioso) setCargandoAsistencias(false);
    }
  }

  function recargarDiaSeleccionado({ silencioso = true } = {}) {
    if (!fechaSeleccionada) return;
    const sesionesDia = sesionesPorFecha.get(fechaSeleccionada) || [];
    if (!sesionesDia.length) return;
    cargarRegistrosSesionesDia(sesionesDia, true, { silencioso, mantenerSeleccion: true });
  }

  async function cargarSesionesHistorial(activo = true) {
    if (!idGrupo) return;
    setCargandoSesiones(true);
    setMensaje("");
    setSesionSeleccionada(null);
    setRegistros([]);
    setEstadoResumenSeleccionado("");
    setSesionResumenSeleccionada("");
    setSesionExpandida("");

    try {
      const respuesta = await listarSesionesGrupo({
        idGrupo: grupoConsulta,
        soloResponsable: false,
        limit: 100,
      });

      if (!activo) return;
      const sesionesFiltradas = respuesta.sesiones;
      setSesiones(sesionesFiltradas);
      const fechaActualValida = fechaSeleccionada && sesionesFiltradas.some((sesion) => obtenerFechaSesion(sesion) === fechaSeleccionada);
      const fechaHoy = formatearFechaISO(new Date());
      const fechaParaMostrar = fechaActualValida ? fechaSeleccionada : fechaHoy;
      const sesionesIniciales = sesionesFiltradas.filter((sesion) => obtenerFechaSesion(sesion) === fechaParaMostrar);
      setFechaSeleccionada(fechaParaMostrar);
      setMesCalendario(crearFechaLocal(fechaParaMostrar));
      setMensaje(sesionesFiltradas.length ? "" : "No hay secciones con esos filtros.");
      if (sesionesIniciales.length) await cargarRegistrosSesionesDia(sesionesIniciales, activo);
    } catch (error) {
      console.error("Error cargando secciones de asistencia:", error);
      if (activo) {
        setSesiones([]);
        setMensaje(error.message || "No fue posible consultar las secciones de asistencia.");
      }
    } finally {
      if (activo) setCargandoSesiones(false);
    }
  }

  useEffect(() => {
    let activo = true;

    const timeout = window.setTimeout(() => cargarSesionesHistorial(activo), 0);

    return () => {
      activo = false;
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idGrupo]);

  useEffect(() => {
    if (!fechaSeleccionada) return undefined;

    const manejarActualizacionAsistencia = (evento) => {
      const detalle = evento.detail || {};
      const coincideGrupo = !detalle.idGrupo || String(detalle.idGrupo) === String(idGrupo);
      const coincideFecha = !detalle.fecha || detalle.fecha === fechaSeleccionada;
      if (coincideGrupo && coincideFecha) recargarDiaSeleccionado({ silencioso: true });
    };

    const manejarFoco = () => {
      if (!document.hidden) recargarDiaSeleccionado({ silencioso: true });
    };

    const intervalo = window.setInterval(() => {
      if (!document.hidden) recargarDiaSeleccionado({ silencioso: true });
    }, 10000);

    window.addEventListener("sima:asistencia-actualizada", manejarActualizacionAsistencia);
    window.addEventListener("focus", manejarFoco);
    document.addEventListener("visibilitychange", manejarFoco);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("sima:asistencia-actualizada", manejarActualizacionAsistencia);
      window.removeEventListener("focus", manejarFoco);
      document.removeEventListener("visibilitychange", manejarFoco);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada, idGrupo, sesionesPorFecha]);

  async function seleccionarDiaCalendario(fechaISO) {
    setFechaSeleccionada(fechaISO);
    const sesionesDia = sesionesPorFecha.get(fechaISO) || [];
    if (sesionesDia.length) {
      await cargarRegistrosSesionesDia(sesionesDia);
      return;
    }

    setSesionSeleccionada(null);
    setRegistros([]);
    setEstadoResumenSeleccionado("");
    setSesionResumenSeleccionada("");
    setSesionExpandida("");
    setMensaje("");
  }

  function cambiarMesCalendario(direccion) {
    setMesCalendario((actual) => new Date(actual.getFullYear(), actual.getMonth() + direccion, 1, 12));
  }

  return (
    <div className="grupos-page mis-grupos-page asistencia-historial-page" translate="no">
      <header className="grupos-header asistencia-historial-page-header">
        <div>
          <span className="grupos-eyebrow">Asistencia de grupo</span>
          <h1>Historial de asistencia</h1>
          <p>Ficha {obtenerCodigo(grupo)} - {obtenerPrograma(grupo)}</p>
        </div>
        <button type="button" className="ghost asistencia-historial-back" onClick={() => navigate("/instructor/grupos")}>
          <ArrowLeft size={17} />
          Volver a mis grupos
        </button>
      </header>

      <section className="coordinador-card asistencia-historial-panel" aria-label="Historial de asistencia del grupo">
        {mensaje && <div className="grupos-alert info asistencia-historial-message">{mensaje}</div>}

        <div className="asistencia-historial-body">
          <aside className="asistencia-historial-sesiones">
            <section className="coordinador-card asistencia-historial-calendar-card">
              <div className="asistencia-historial-section-head">
                <div>
                  <h3>Calendario</h3>
                  <p>Selecciona un dia</p>
                </div>
                <span>{sesiones.length}</span>
              </div>

              <div className="asistencia-historial-calendar">
                <div className="asistencia-historial-calendar-head">
                  <button type="button" onClick={() => cambiarMesCalendario(-1)} aria-label="Mes anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <strong>{etiquetaMesCalendario}</strong>
                  <button type="button" onClick={() => cambiarMesCalendario(1)} aria-label="Mes siguiente">
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="asistencia-historial-weekdays">
                  {DIAS_CALENDARIO.map((dia) => (
                    <span key={dia}>{dia}</span>
                  ))}
                </div>

                <div className="asistencia-historial-calendar-grid">
                  {diasCalendario.map((dia, index) => {
                    if (!dia) return <span className="asistencia-historial-calendar-gap" key={`gap-${index}`} />;
                    const sesionesDia = sesionesPorFecha.get(dia.fechaISO) || [];
                    const activo = fechaSeleccionada === dia.fechaISO;
                    return (
                      <button
                        type="button"
                        className={`asistencia-historial-day ${activo ? "active" : ""} ${sesionesDia.length ? "has-session" : ""}`}
                        key={dia.fechaISO}
                        onClick={() => seleccionarDiaCalendario(dia.fechaISO)}
                      >
                        <strong>{dia.dia}</strong>
                        {sesionesDia.length ? <span>{sesionesDia.length}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </aside>

          <section className="asistencia-historial-detalle" aria-label="Asistencia del dia seleccionado" key={obtenerIdSesion(sesionSeleccionada) || fechaSeleccionada || "sin-sesion"}>
            {sesionSeleccionada ? (
              <>
                <div className="asistencia-historial-detalle-head">
                  <h2>Sesiones del dia</h2>
                </div>

                <div className="asistencia-historial-session-cards">
                  {resumenesPorSesion.map((resumenSesion, index) => {
                    const abierta = String(sesionExpandida) === String(resumenSesion.idSesion);
                    const seleccionada = String(sesionResumenSeleccionada) === String(resumenSesion.idSesion);
                    const aprendicesTabla = seleccionada ? aprendicesSeleccionados : [];
                    const estadoChip = seleccionada ? estadoSeleccionado : null;

                    return (
                      <article className={`asistencia-historial-session-card ${abierta ? "expanded" : ""}`} key={resumenSesion.idSesion}>
                        <div className="asistencia-historial-session-index">{index + 1}</div>
                        <div className="asistencia-historial-session-main">
                          <h3>Seccion {index + 1} - Sesion #{resumenSesion.idSesion}</h3>
                          <div className="asistencia-historial-session-time">
                            <Clock size={17} />
                            <span>{obtenerHorarioSesion(resumenSesion.sesion)}</span>
                          </div>
                          <p>
                            <UserRound size={16} />
                            Instructor: {resumenSesion.sesion?.instructor?.nombre || resumenSesion.sesion?.instructor_nombre || "Sin asignar"}
                          </p>
                          <p>
                            <BookOpen size={16} />
                            Competencia: {obtenerNombreCompetenciaSesion(resumenSesion.sesion)}
                          </p>
                        </div>

                        <div className="asistencia-historial-session-meta">
                          <strong className={`asistencia-historial-session-status ${obtenerEstadoSesion(resumenSesion.sesion).toLowerCase()}`}>
                            <CalendarDays size={14} />
                            {etiquetaEstadoSesion(obtenerEstadoSesion(resumenSesion.sesion))}
                          </strong>
                          {obtenerEstadoSesion(resumenSesion.sesion) === "CANCELADA" && resumenSesion.sesion?.motivo_cancelacion && (
                            <div className="asistencia-historial-motivo-cancelacion">
                              <span className="asistencia-historial-motivo-label">
                                <Ban size={13} />
                                Motivo de cancelacion
                              </span>
                              <p className="asistencia-historial-motivo-texto">
                                {resumenSesion.sesion.motivo_cancelacion}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="asistencia-historial-session-summary">
                          <button
                            type="button"
                            className={`asistencia-historial-donut ${seleccionada && !estadoResumenSeleccionado ? "active" : ""}`}
                            style={{ background: resumenSesion.gradiente }}
                            onClick={() => alternarFiltroResumen(resumenSesion.idSesion)}
                            aria-label={`Ver aprendices de la seccion ${index + 1}`}
                          >
                            <div>
                              <strong>{resumenSesion.items.find((item) => item.key === "PRESENTE")?.valor || 0}/{resumenSesion.total}</strong>
                              <span>asistieron</span>
                            </div>
                          </button>
                          <div className="asistencia-historial-legend">
                            {resumenSesion.items.map((item) => {
                              const activa = seleccionada && estadoResumenSeleccionado === item.key;
                              return (
                                <button
                                  type="button"
                                  className={activa ? "active" : ""}
                                  key={item.key}
                                  aria-pressed={activa}
                                  onClick={() => alternarFiltroResumen(resumenSesion.idSesion, item.key)}
                                >
                                  <i style={{ background: item.color }} />
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="asistencia-historial-session-toggle"
                          onClick={() => setSesionExpandida(abierta ? "" : String(resumenSesion.idSesion))}
                          aria-label={abierta ? "Cerrar detalle de aprendices" : "Abrir detalle de aprendices"}
                        >
                          {abierta ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                        </button>

                        {abierta && (
                          <div className="asistencia-historial-session-apprentices">
                            <div className="asistencia-historial-apprentices-head">
                              <h3>Aprendices</h3>
                              {estadoChip && (
                                <span
                                  className="asistencia-historial-selected-chip"
                                  style={{ "--estado-color": estadoChip.color, "--estado-bg": estadoChip.backgroundColor }}
                                >
                                  <CheckCircle2 size={15} />
                                  {estadoChip.label} ({aprendicesTabla.length})
                                </span>
                              )}
                            </div>

                            <div className="asistencia-historial-selected-table-wrap">
                              <table className="asistencia-historial-selected-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Estudiante</th>
                                    <th>Estado</th>
                                    <th>Hora de registro</th>
                                    <th aria-label="Acciones" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {cargandoAsistencias ? (
                                    <tr>
                                      <td colSpan="5" className="grupos-empty">Cargando aprendices...</td>
                                    </tr>
                                  ) : aprendicesTabla.length ? (
                                    aprendicesTabla.map((aprendiz, aprendizIndex) => {
                                      const estado = RESUMEN_ASISTENCIA.find((item) => item.key === aprendiz.estado);
                                      return (
                                        <tr key={aprendiz.id}>
                                          <td>{aprendizIndex + 1}</td>
                                          <td>
                                            <div className="asistencia-historial-student-cell">
                                              <span>{obtenerIniciales(aprendiz.nombre)}</span>
                                              <strong>{aprendiz.nombre}</strong>
                                            </div>
                                          </td>
                                          <td>
                                            <span
                                              className="asistencia-historial-selected-status"
                                              style={{
                                                "--estado-color": estado?.color || "#64809F",
                                                "--estado-bg": estado?.backgroundColor || "#EAF0F6",
                                              }}
                                            >
                                              <CheckCircle2 size={15} />
                                              {estado?.label || "Sin estado"}
                                            </span>
                                          </td>
                                          <td>{aprendiz.hora || "-"}</td>
                                          <td>
                                            <button type="button" className="asistencia-historial-row-action" aria-label={`Ver opciones de ${aprendiz.nombre}`}>
                                              <MoreVertical size={16} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan="5" className="grupos-empty">
                                        {sesionSeleccionadaParaTabla ? "No hay aprendices para ese estado." : "Selecciona una metrica para ver aprendices."}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="asistencia-historial-placeholder">
                Selecciona un dia con secciones para ver la asistencia.
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

// jngjh//
