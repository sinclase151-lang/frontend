import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  PencilLine,
  UsersRound
} from "lucide-react";
import "../coordinador/coordinador.css";
import "./instructor.css";
import SesionActivaModal from "./asistencia/components/SesionActivaModal";
import HorarioSemanalInstructor from "./HorarioSemanalInstructor";
import {
  combinarSesionesCalendario,
  finSemanaActual,
  formatearFechaISO,
  inicioSemanaActual,
  normalizarDiaSemana,
  normalizarHorarioComoSesion,
  obtenerDiaSemanaSesion,
  obtenerFechaSesion
} from "./horarioSemanal.utils";

const obtenerNumero = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") return Number.parseFloat(valor.replace("%", "")) || 0;
  return 0;
};

const calcularProgreso = (valor, maximo) => {
  const numero = obtenerNumero(valor);
  if (!numero || !maximo) return 0;
  return Math.min(100, Math.max(0, Math.round((numero / maximo) * 100)));
};

const coloresBarras = ["verde", "azul", "morado"];
const coloresRiesgo = ["#ef4444", "#f5b400", "#f5b400"];

const nombresRiesgo = {
  INASISTENCIA: "Inasistencia",
  ASISTENCIAL: "Asistencial",
  OBSERVACIONES_RECURRENTES: "Observaciones recurrentes",
  CONVIVENCIAL: "Convivencial",
  MANUAL: "Manual"
};

const inicioMesActual = (fechaBase = new Date()) => {
  const fecha = new Date(fechaBase);
  return formatearFechaISO(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
};

const finMesActual = (fechaBase = new Date()) => {
  const fecha = new Date(fechaBase);
  return formatearFechaISO(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0));
};

const getHeaders = () => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "undefined") headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || "No fue posible cargar la informacion");
  return data?.data ?? data;
}

const extraerGrupos = (data) => {
  const grupos = data?.grupos || data?.fichas || data?.results || data;
  return Array.isArray(grupos) ? grupos : [];
};

const extraerAlertas = (data) => {
  const alertas = data?.alerts || data?.alertas || data?.data || data?.results || data;
  return Array.isArray(alertas) ? alertas : [];
};

const extraerSesiones = (data) => {
  const sesiones = data?.sesiones || data?.data?.sesiones || data?.results || data;
  return Array.isArray(sesiones) ? sesiones : [];
};

const extraerHorarios = (data) => {
  const horarios =
    data?.horarios ||
    data?.horario ||
    data?.schedule ||
    data?.schedules ||
    data?.sesiones ||
    data?.results ||
    data;
  return Array.isArray(horarios) ? horarios : [];
};

const extraerAsignacionesInstructor = (data) => {
  const asignaciones = data?.data || data?.instructores || data?.items || data?.results || data;
  return Array.isArray(asignaciones) ? asignaciones : [];
};

const extraerAsistencias = (data) => {
  const asistencias = data?.asistencias || data?.data?.asistencias || data?.results || data;
  return Array.isArray(asistencias) ? asistencias : [];
};

const obtenerPrograma = (grupo) => grupo.programa_formacion?.nombre_programa || grupo.programa || "Sin programa";
const obtenerCodigo = (grupo) => grupo.numero_ficha || grupo.numero_grupo || grupo.codigo || "Sin ficha";
const obtenerIdSesion = (sesion) => sesion.id_sesion_formacion || sesion.id;
const obtenerIdGrupoSesion = (sesion) => sesion.id_grupo || sesion.grupo?.id_grupo;
const agregarValor = (set, valor) => {
  if (valor !== null && valor !== undefined && valor !== "") set.add(String(valor));
};
const leerUsuarioActual = () => {
  try {
    return JSON.parse(localStorage.getItem("user_data") || "{}") || {};
  } catch {
    return {};
  }
};
const obtenerIdentidadInstructorActual = () => {
  const usuario = leerUsuarioActual();
  const persona = usuario.persona || {};
  const instructor = usuario.instructor || usuario.informacion_rol?.instructor || {};
  const idsInstructor = new Set();
  const idsUsuario = new Set();
  const documentos = new Set();
  const emails = new Set();

  [
    localStorage.getItem("id_instructor"),
    usuario.id_instructor,
    instructor.id_instructor,
    usuario.informacion_rol?.id_instructor
  ].forEach((valor) => agregarValor(idsInstructor, valor));

  [usuario.id_usuario, usuario.id, instructor.usuario?.id_usuario].forEach((valor) => agregarValor(idsUsuario, valor));
  [persona.numero_documento, usuario.numero_documento, localStorage.getItem("user_documento")].forEach((valor) => agregarValor(documentos, valor));
  [usuario.email, instructor.usuario?.email, localStorage.getItem("user_email")].forEach((valor) => agregarValor(emails, valor));

  return { idsInstructor, idsUsuario, documentos, emails };
};
const itemPerteneceInstructorActual = (item, identidad = obtenerIdentidadInstructorActual()) => {
  const persona = item?.usuario?.persona || item?.persona || item?.instructor?.usuario?.persona || item?.instructor_grupo?.instructor?.usuario?.persona || {};
  const idsInstructor = [
    item?.id_instructor,
    item?.instructor?.id_instructor,
    item?.instructor_grupo?.id_instructor,
    item?.instructor_grupo?.instructor?.id_instructor
  ].filter(Boolean).map(String);
  const idsUsuario = [
    item?.id_usuario,
    item?.usuario?.id_usuario,
    item?.instructor?.usuario?.id_usuario,
    item?.instructor_grupo?.instructor?.usuario?.id_usuario
  ].filter(Boolean).map(String);
  const documentos = [
    item?.numero_documento,
    persona?.numero_documento
  ].filter(Boolean).map(String);
  const emails = [
    item?.email,
    item?.usuario?.email,
    item?.instructor?.usuario?.email,
    item?.instructor_grupo?.instructor?.usuario?.email
  ].filter(Boolean).map(String);

  return (
    idsInstructor.some((valor) => identidad.idsInstructor.has(valor)) ||
    idsUsuario.some((valor) => identidad.idsUsuario.has(valor)) ||
    documentos.some((valor) => identidad.documentos.has(valor)) ||
    emails.some((valor) => identidad.emails.has(valor))
  );
};
const obtenerIdsAsignacionInstructorActual = (asignaciones = [], identidad = obtenerIdentidadInstructorActual()) => {
  return new Set(
    asignaciones
      .filter((item) => itemPerteneceInstructorActual(item, identidad))
      .map((item) => item.id_instructor_grupo)
      .filter(Boolean)
      .map(String)
  );
};
const horarioPerteneceInstructorActual = (horario, idsAsignacionActual, identidad = obtenerIdentidadInstructorActual()) => {
  const idAsignacion = horario.id_instructor_grupo || horario.instructor_grupo?.id_instructor_grupo;
  if (idAsignacion && idsAsignacionActual.has(String(idAsignacion))) return true;

  const tieneInstructor =
    horario.id_instructor ||
    horario.instructor?.id_instructor ||
    horario.instructor_grupo?.id_instructor ||
    horario.instructor_grupo?.instructor?.id_instructor ||
    horario.usuario?.id_usuario ||
    horario.instructor?.usuario?.id_usuario;

  return tieneInstructor ? itemPerteneceInstructorActual(horario, identidad) : false;
};
const combinarGrupos = (...listas) => {
  const grupos = new Map();
  listas.flat().forEach((grupo) => {
    if (!grupo?.id_grupo) return;
    grupos.set(String(grupo.id_grupo), grupo);
  });
  return [...grupos.values()];
};

const estadoCuentaComoAsistencia = (estado) => (
  ["PRESENTE", "TARDE", "JUSTIFICADO", "JUSTIFICADA"].includes(String(estado || "").toUpperCase())
);

export default function PanelInstructor() {
  const [grupos, setGrupos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [sesionesSemana, setSesionesSemana] = useState([]);
  const [asistenciaPromedioMes, setAsistenciaPromedioMes] = useState(null);
  const [asistenciaPorGrupo, setAsistenciaPorGrupo] = useState({});
  const [totalObservacionesMes, setTotalObservacionesMes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => new Date());
  const [jornadaHorario, setJornadaHorario] = useState("MANANA");
  const [revisionDatos, setRevisionDatos] = useState(0);
  const [modalRevisado, setModalRevisado] = useState(false);
  const [sesionModalManual, setSesionModalManual] = useState(null);
  const semanaReferencia = formatearFechaISO(ahora);
  const inicioSemana = useMemo(() => inicioSemanaActual(semanaReferencia), [semanaReferencia]);
  const finSemana = useMemo(() => finSemanaActual(semanaReferencia), [semanaReferencia]);
  const confirmarRevisionModal = useCallback(() => setModalRevisado(true), []);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(new Date());
    }, 30000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const actualizarSesiones = (evento) => {
      const sesionesActualizadas = Array.isArray(evento?.detail?.sesiones)
        ? evento.detail.sesiones
        : [evento?.detail?.sesion].filter(Boolean);
      const sesionesConId = sesionesActualizadas.filter((sesion) => obtenerIdSesion(sesion));
      if (sesionesConId.length) {
        setSesionesSemana((actuales) => {
          const actualizadasPorId = new Map(sesionesConId.map((sesion) => [String(obtenerIdSesion(sesion)), sesion]));
          const idsReemplazados = new Set();
          const siguientes = actuales.map((sesion) => {
            const idSesion = String(obtenerIdSesion(sesion));
            const actualizada = actualizadasPorId.get(idSesion);
            if (!actualizada) return sesion;
            idsReemplazados.add(idSesion);
            return { ...sesion, ...actualizada };
          });
          const nuevas = sesionesConId.filter((sesion) => !idsReemplazados.has(String(obtenerIdSesion(sesion))));
          return nuevas.length ? [...siguientes, ...nuevas] : siguientes;
        });
      }
      setRevisionDatos((valor) => valor + 1);
    };
    window.addEventListener("sima:sesiones-actualizadas", actualizarSesiones);
    return () => window.removeEventListener("sima:sesiones-actualizadas", actualizarSesiones);
  }, []);

  useEffect(() => {
    if (!modalRevisado) return undefined;
    let activo = true;

    async function cargarDashboard() {
      try {
        setCargando(true);
        const resumen = await fetchJson("/api/dashboard/instructor/resumen");

        if (!activo) return;

        const gruposInstructor = combinarGrupos(
          extraerGrupos(resumen?.grupos_liderados),
          extraerGrupos(resumen?.grupos_asignados)
        );

        setGrupos(gruposInstructor);
        setTotalObservacionesMes(Number(resumen?.kpis?.total_observaciones_abiertas) || 0);
        setError("");
        setCargando(false);

        const [alertasResultado, sesionesSemanaResultado] = await Promise.all([
          fetchJson("/api/alerts?estado=ABIERTA&limit=50").catch(() => ({ alertas: [] })),
          fetchJson(`/api/educational-sessions?fecha_desde=${inicioSemana}&fecha_hasta=${finSemana}&solo_responsable=true&limit=100`).catch(() => ({ sesiones: [] }))
        ]);
        if (!activo) return;

        setAlertas(extraerAlertas(alertasResultado));
        let sesionesSemanaData = extraerSesiones(sesionesSemanaResultado);
        setSesionesSemana(sesionesSemanaData);

        const identidadInstructor = obtenerIdentidadInstructorActual();
        const horariosPorGrupo = await Promise.allSettled(
          gruposInstructor.map(async (grupo) => {
            const idGrupoSeguro = encodeURIComponent(grupo.id_grupo);
            const [horariosData, asignacionesData] = await Promise.all([
              fetchJson(`/api/educational-schedules/group/${idGrupoSeguro}`).catch(() => []),
              fetchJson(`/api/instructor-groups/grupo/${idGrupoSeguro}`).catch(() => [])
            ]);
            const idsAsignacionActual = obtenerIdsAsignacionInstructorActual(
              extraerAsignacionesInstructor(asignacionesData),
              identidadInstructor
            );

            return extraerHorarios(horariosData)
              .filter((horario) => horarioPerteneceInstructorActual(horario, idsAsignacionActual, identidadInstructor))
              .map((horario) => normalizarHorarioComoSesion(horario, grupo));
          })
        );
        if (!activo) return;

        const horariosInstructor = horariosPorGrupo.flatMap((result) =>
          result.status === "fulfilled" ? result.value : []
        );
        const numeroDiaHoy = new Date(`${semanaReferencia}T12:00:00`).getDay();
        const diaHoy = normalizarDiaSemana(["", "lunes", "martes", "miercoles", "jueves", "viernes"][numeroDiaHoy]);
        const idsHorariosHoy = new Set(
          sesionesSemanaData
            .filter((sesion) => obtenerFechaSesion(sesion) === semanaReferencia)
            .map((sesion) => sesion.id_horario)
            .filter(Boolean)
            .map(String)
        );
        const trimestresSinSesionHoy = new Set(
          horariosInstructor
            .filter((horario) =>
              obtenerDiaSemanaSesion(horario) === diaHoy &&
              horario.id_horario &&
              horario.id_grupo_trimestre &&
              !idsHorariosHoy.has(String(horario.id_horario))
            )
            .map((horario) => String(horario.id_grupo_trimestre))
        );

        if (trimestresSinSesionHoy.size) {
          await Promise.allSettled(
            [...trimestresSinSesionHoy].map((idGrupoTrimestre) =>
              fetchJson("/api/educational-sessions/generate", {
                method: "POST",
                body: JSON.stringify({
                  id_grupo_trimestre: Number(idGrupoTrimestre),
                  fecha_desde: semanaReferencia,
                  fecha_hasta: semanaReferencia
                })
              })
            )
          );
          const sesionesHoyGeneradas = await fetchJson(
            `/api/educational-sessions?fecha=${semanaReferencia}&solo_responsable=true&limit=100`
          ).catch(() => ({ sesiones: [] }));
          sesionesSemanaData = combinarSesionesCalendario(
            sesionesSemanaData,
            extraerSesiones(sesionesHoyGeneradas)
          );
          setSesionesSemana(sesionesSemanaData);
        }

        const sesionesCalendario = horariosInstructor.length
          ? combinarSesionesCalendario(sesionesSemanaData, horariosInstructor)
          : sesionesSemanaData;
        setSesionesSemana(sesionesCalendario);

        const asistenciasSemanaResultado = await Promise.allSettled(
          sesionesCalendario
            .filter((sesion) => obtenerIdSesion(sesion))
            .map((sesion) =>
              fetchJson(`/api/educational-sessions/${obtenerIdSesion(sesion)}/attendances`)
                .then((data) => ({
                  idSesion: String(obtenerIdSesion(sesion)),
                  asistencias: extraerAsistencias(data)
                }))
            )
        );
        if (!activo) return;

        const totalAsistenciasPorSesion = new Map(
          asistenciasSemanaResultado
            .filter((result) => result.status === "fulfilled")
            .map((result) => [result.value.idSesion, result.value.asistencias.length])
        );
        if (totalAsistenciasPorSesion.size) {
          setSesionesSemana((actual) =>
            actual.map((sesion) => {
              const idSesion = String(obtenerIdSesion(sesion) || "");
              if (!totalAsistenciasPorSesion.has(idSesion)) return sesion;
              return {
                ...sesion,
                total_asistencias: totalAsistenciasPorSesion.get(idSesion)
              };
            })
          );
        }

        const sesionesMesResultado = await fetchJson(`/api/educational-sessions?fecha_desde=${inicioMesActual()}&fecha_hasta=${finMesActual()}&solo_responsable=true&limit=100`).catch(() => ({ sesiones: [] }));
        if (!activo) return;

        const sesionesMes = extraerSesiones(sesionesMesResultado);
        const asistenciasPorSesion = await Promise.allSettled(
          sesionesMes.map((sesion) =>
            fetchJson(`/api/educational-sessions/${obtenerIdSesion(sesion)}/attendances`)
              .then((data) => ({ sesion, asistencias: extraerAsistencias(data) }))
          )
        );

        if (!activo) return;

        const acumuladoAsistencia = asistenciasPorSesion.reduce((acc, result) => {
          if (result.status !== "fulfilled") return acc;
          const { sesion, asistencias } = result.value;
          const idGrupo = obtenerIdGrupoSesion(sesion);
          asistencias.forEach((asistencia) => {
            const estado = asistencia.estado_ep05 || asistencia.estado_asistencia || asistencia.estado;
            acc.total += 1;
            if (estadoCuentaComoAsistencia(estado)) acc.asisten += 1;

            if (idGrupo) {
              const clave = String(idGrupo);
              acc.porGrupo[clave] ||= { total: 0, asisten: 0 };
              acc.porGrupo[clave].total += 1;
              if (estadoCuentaComoAsistencia(estado)) acc.porGrupo[clave].asisten += 1;
            }
          });
          return acc;
        }, { total: 0, asisten: 0, porGrupo: {} });

        setAsistenciaPromedioMes(
          acumuladoAsistencia.total
            ? Math.round((acumuladoAsistencia.asisten / acumuladoAsistencia.total) * 100)
            : null
        );
        setAsistenciaPorGrupo(acumuladoAsistencia.porGrupo);
      } catch (err) {
        console.error("Error cargando dashboard del instructor:", err);
        if (activo) setError(err.message || "No fue posible cargar el dashboard del instructor");
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarDashboard();
    return () => {
      activo = false;
    };
  }, [finSemana, inicioSemana, modalRevisado, revisionDatos, semanaReferencia]);

  const alertasActivas = useMemo(
    () => alertas.filter((alerta) => String(alerta.estado || "").toUpperCase() === "ABIERTA"),
    [alertas]
  );

  const riesgos = useMemo(() => {
    const conteo = alertasActivas.reduce((acc, alerta) => {
      const tipo = alerta.tipo_alerta || alerta.tipoAlerta || "MANUAL";
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});
    const total = Math.max(alertasActivas.length, 1);

    return Object.entries(conteo).map(([tipo, valor], index) => ({
      nombre: nombresRiesgo[tipo] || tipo,
      valor,
      porcentaje: Math.round((valor / total) * 100),
      color: coloresRiesgo[index % coloresRiesgo.length]
    }));
  }, [alertasActivas]);

  const barras = useMemo(() => (
    grupos.slice(0, 3).map((grupo, index) => {
      const asistenciaGrupo = asistenciaPorGrupo[String(grupo.id_grupo)] || { total: 0, asisten: 0 };
      const porcentaje = asistenciaGrupo.total
        ? Math.round((asistenciaGrupo.asisten / asistenciaGrupo.total) * 100)
        : 0;

      return {
        grupo: obtenerCodigo(grupo),
        programa: obtenerPrograma(grupo),
        porcentaje,
        tieneDatos: asistenciaGrupo.total > 0,
        color: coloresBarras[index % coloresBarras.length]
      };
    })
  ), [asistenciaPorGrupo, grupos]);

  const resumenCards = useMemo(() => ([
    {
      titulo: "Mis grupos asignados",
      valor: grupos.length,
      detalle: "Grupos visibles para el instructor",
      meta: null,
      icono: UsersRound,
      tono: "amarillo"
    },
    {
      titulo: "Asistencia promedio (este mes)",
      valor: asistenciaPromedioMes === null ? "N/D" : `${asistenciaPromedioMes}%`,
      detalle: "Calculada desde sesiones del mes",
      meta: asistenciaPromedioMes === null ? "Sin sesiones con asistencia este mes" : "Sesiones del mes",
      icono: CheckCircle2,
      tono: "verde"
    },
    {
      titulo: "Alertas activas",
      valor: alertasActivas.length,
      detalle: "Con alertas activas o en seguimiento",
      meta: null,
      icono: AlertTriangle,
      tono: "rojo",
      alerta: alertasActivas.length > 0
    },
    {
      titulo: "Observaciones registradas",
      valor: totalObservacionesMes,
      detalle: "Abiertas",
      meta: "Resumen del backend",
      icono: PencilLine,
      tono: "cyan"
    }
  ]), [alertasActivas.length, asistenciaPromedioMes, grupos.length, totalObservacionesMes]);

  const maximoResumen = Math.max(
    ...resumenCards
      .filter((card) => !card.valor?.toString().includes("%"))
      .map((card) => obtenerNumero(card.valor)),
    1
  );
  const cardsConProgreso = resumenCards.map((card) => ({
    ...card,
    progreso: calcularProgreso(card.valor, card.valor?.toString().includes("%") ? 100 : maximoResumen)
  }));

  const sesionesHoyParaModal = useMemo(
    () => {
      const numeroDiaHoy = new Date(`${semanaReferencia}T12:00:00`).getDay();
      const diaHoy = normalizarDiaSemana(["", "lunes", "martes", "miercoles", "jueves", "viernes"][numeroDiaHoy]);
      return sesionesSemana.filter((sesion) => {
        const fechaSesion = obtenerFechaSesion(sesion);
        return fechaSesion === semanaReferencia || (!fechaSesion && obtenerDiaSemanaSesion(sesion) === diaHoy);
      });
    },
    [semanaReferencia, sesionesSemana]
  );

  if (cargando || !modalRevisado) {
    return (
      <div className="coordinador-panel instructor-panel-v2">
        <SesionActivaModal
          onRevisionCompleta={confirmarRevisionModal}
          sesionesAlternativas={sesionesHoyParaModal}
          sesionManual={sesionModalManual}
          onSesionManualAtendida={() => setSesionModalManual(null)}
        />
        <div className="grupos-alert info">Revisando sesiones programadas...</div>
      </div>
    );
  }

  return (
    <div className="coordinador-panel instructor-panel-v2">
      <SesionActivaModal
        onRevisionCompleta={confirmarRevisionModal}
        sesionesAlternativas={sesionesHoyParaModal}
        sesionManual={sesionModalManual}
        onSesionManualAtendida={() => setSesionModalManual(null)}
      />

      {error && <div className="grupos-alert danger">{error}</div>}

      <section className="dashboard-welcome">
        <section className="dashboard-role-welcome">
          <h1>Bienvenido instructor</h1>
        </section>
      </section>

      <section className="instructor-kpi-grid" aria-label="Resumen del instructor">
        {cardsConProgreso.map((card) => {
          const Icon = card.icono;

          return (
            <article className={`coordinador-kpi-card instructor-kpi-card tono-${card.tono}`} key={card.titulo}>
              <div className="coordinador-kpi-top">
                <span className="coordinador-kpi-icon">
                  <Icon size={29} strokeWidth={2.1} />
                </span>
                <span
                  className="coordinador-kpi-ring"
                  style={{ "--kpi-progress": `${card.progreso}%` }}
                  role="img"
                  aria-label={`${card.progreso}% de avance`}
                ></span>
              </div>
              <h2>{card.titulo}</h2>
              <strong>{card.valor}</strong>
              <p className={card.alerta ? "negativo" : ""}>{card.alerta ? "Atencion requerida" : "Dato actualizado"}</p>
              <small>{card.meta || card.detalle}</small>
            </article>
          );
        })}
      </section>

      <section className="instructor-overview-grid">
        <article className="coordinador-card instructor-risk-card">
          <div className="coordinador-card-header">
            <h2>Alertas activas por causa</h2>
          </div>

          <div className="instructor-risk-layout">
            <div
              className="instructor-risk-donut"
              style={{
                background: riesgos.length
                  ? `conic-gradient(${riesgos
                    .reduce((segmentos, item) => {
                      const inicio = segmentos.total;
                      const fin = inicio + item.porcentaje;
                      segmentos.partes.push(`${item.color} ${inicio}% ${fin}%`);
                      segmentos.total = fin;
                      return segmentos;
                    }, { total: 0, partes: [] }).partes.join(", ")})`
                  : "#e5e7eb"
              }}
            >
              <div className="instructor-risk-donut-inner">
                <strong>{alertasActivas.length}</strong>
                <span>Total</span>
              </div>
            </div>

            <div className="instructor-risk-list">
              {riesgos.length ? riesgos.map((item) => (
                <div className="instructor-risk-item" key={item.nombre}>
                  <span className="dot" style={{ background: item.color }}></span>
                  <p>{item.nombre}</p>
                  <strong>{item.valor} ({item.porcentaje}%)</strong>
                </div>
              )) : (
                <div className="instructor-risk-item">
                  <span className="dot" style={{ background: "#94a3b8" }}></span>
                  <p>Sin alertas activas</p>
                  <strong>0</strong>
                </div>
              )}
            </div>
          </div>
        </article>

        <HorarioSemanalInstructor
          sesionesSemana={sesionesSemana}
          inicioSemana={inicioSemana}
          finSemana={finSemana}
          ahora={ahora}
          jornada={jornadaHorario}
          onJornadaChange={setJornadaHorario}
          onAbrirSesionPendiente={setSesionModalManual}
        />
      </section>

      <section className="instructor-main-grid">
        <article className="coordinador-card instructor-chart-card">
          <div className="coordinador-card-header">
            <h2>Asistencia promedio por grupo (este mes)</h2>
          </div>

          <div className="instructor-group-chart">
            <div className="instructor-chart-scale">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            <div className="instructor-bars-wrap">
              {barras.map((item) => (
                <div className="instructor-group-bar-item" key={item.grupo}>
                  <span>{item.tieneDatos ? `${item.porcentaje}%` : "Sin datos"}</span>
                  <div className="instructor-group-bar-track">
                    <span
                      className={`instructor-group-bar-fill ${item.color}`}
                      style={{ height: `${item.porcentaje}%` }}
                    ></span>
                  </div>
                  <strong>Grupo {item.grupo}</strong>
                  <small>{item.programa}</small>
                </div>
              ))}
              {!barras.length && (
                <div className="instructor-attendance-empty">Sin grupos con datos de asistencia.</div>
              )}
            </div>
          </div>
        </article>

      </section>


    </div>
  );
}




