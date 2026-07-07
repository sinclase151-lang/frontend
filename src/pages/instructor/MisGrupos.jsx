import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ClipboardList, Eye, FilterX, Search, UserPlus, Info } from "lucide-react";
import { toast } from "react-toastify";
import SimaPagination from "../../components/common/SimaPagination";
import {
  ESTADOS_GRUPO,
  GRUPOS_LIST_URL,
  claseEstadoGrupo,
  etiquetaEstadoGrupo,
  normalizarEstadoGrupo,
  prioridadEstadoGrupo,
} from "../../services/gruposService";
import HorarioGrupoModal from "../fichas/HorarioGrupoModal";
import ModalAgregarInstructor from "./ModalAgregarInstructor";
import "../fichas/fichas.css";

const GRUPOS_POR_PAGINA = 5;
const FICHAS_OCULTAS = new Set(["2850312"]);
const JORNADAS_BASE = ["Manana", "Tarde", "Noche"];

function getHeaders() {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };

  if (token && token !== "undefined") headers.Authorization = `Bearer ${token}`;

  return headers;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function numeroPositivo(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function trimestresDesdeTexto(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return null;

  const coincidencia = texto.match(/\d+(?:[.,]\d+)?/);
  if (!coincidencia) return null;

  const numero = numeroPositivo(coincidencia[0]);
  if (!numero) return null;

  if (texto.includes("mes")) return Math.max(1, Math.ceil(numero / 3));
  if (texto.includes("ano") || texto.includes("año")) {
    return Math.max(1, Math.ceil((numero * 12) / 3));
  }

  return Math.round(numero);
}

function trimestresDesdeMeses(valor) {
  const meses = numeroPositivo(valor);
  return meses ? Math.max(1, Math.ceil(meses / 3)) : null;
}

function trimestresDesdeFechas(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return null;

  const inicio = new Date(`${String(fechaInicio).split("T")[0]}T00:00:00`);
  const fin = new Date(`${String(fechaFin).split("T")[0]}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) {
    return null;
  }

  const meses =
    (fin.getFullYear() - inicio.getFullYear()) * 12 +
    (fin.getMonth() - inicio.getMonth()) +
    (fin.getDate() >= inicio.getDate() ? 0 : -1);

  return meses > 0 ? Math.max(1, Math.ceil(meses / 3)) : null;
}

function obtenerTrimestres(grupo) {
  const candidatos = [
    grupo?.trimestres,
    grupo?.total_trimestres,
    grupo?.numero_trimestres,
    grupo?.cantidad_trimestres,
    grupo?.duracion_trimestres,
    grupo?.duracion_en_trimestres,
    grupo?.programa_formacion?.trimestres,
    grupo?.programa_formacion?.total_trimestres,
    grupo?.programa_formacion?.numero_trimestres,
    grupo?.programa_formacion?.cantidad_trimestres,
    grupo?.programa_formacion?.duracion_trimestres,
    grupo?.programa?.trimestres,
    grupo?.programa?.duracion_trimestres,
  ];

  for (const candidato of candidatos) {
    const valor = typeof candidato === "string"
      ? trimestresDesdeTexto(candidato)
      : numeroPositivo(candidato);
    if (valor) return Math.round(valor);
  }

  const meses = [
    grupo?.duracion_meses,
    grupo?.meses,
    grupo?.programa_formacion?.duracion_meses,
    grupo?.programa_formacion?.meses,
    grupo?.programa?.duracion_meses,
    grupo?.programa?.meses,
  ];

  for (const candidato of meses) {
    const valor = trimestresDesdeMeses(candidato);
    if (valor) return valor;
  }

  const duracionesTexto = [
    grupo?.duracion,
    grupo?.programa_formacion?.duracion,
    grupo?.programa?.duracion,
  ];

  for (const candidato of duracionesTexto) {
    const valor = trimestresDesdeTexto(candidato);
    if (valor) return valor;
  }

  return trimestresDesdeFechas(grupo?.fecha_inicio, grupo?.fecha_fin);
}

function formatearTrimestres(grupo) {
  return obtenerTrimestres(grupo) ?? "-";
}

function extraerListaGrupos(data) {
  const lista =
    data?.data?.grupos ||
    data?.data?.fichas ||
    data?.data?.items ||
    data?.data ||
    data?.results ||
    data?.grupos ||
    data?.items ||
    data;

  return Array.isArray(lista) ? lista : [];
}

function obtenerPrograma(grupo) {
  return (
    grupo.programa_formacion?.nombre_programa ||
    grupo.programa?.nombre_programa ||
    grupo.nombre_programa ||
    grupo.programa ||
    "Programa de formacion"
  );
}

function obtenerCodigo(grupo) {
  return (
    grupo.numero_ficha ||
    grupo.numero_grupo ||
    grupo.codigo ||
    grupo.ficha ||
    grupo.id_grupo ||
    grupo.id ||
    "Sin ficha"
  );
}

function obtenerEstado(grupo) {
  return normalizarEstadoGrupo(grupo.estado);
}

function obtenerEstadoClase(estado) {
  return claseEstadoGrupo(estado);
}

function obtenerIdGrupo(grupo, index = 0) {
  return grupo.id_grupo || grupo.id || grupo.codigo || grupo.numero_ficha || index;
}

function agregarValor(set, valor) {
  if (valor !== null && valor !== undefined && valor !== "") set.add(String(valor));
}

function leerUsuarioActual() {
  try {
    return JSON.parse(localStorage.getItem("user_data") || "{}") || {};
  } catch {
    return {};
  }
}

function obtenerIdsInstructorActual() {
  const usuario = leerUsuarioActual();
  const instructor = usuario.instructor || usuario.informacion_rol?.instructor || {};
  const ids = new Set();

  [
    localStorage.getItem("id_instructor"),
    usuario.id_instructor,
    instructor.id_instructor,
    usuario.informacion_rol?.id_instructor,
  ].forEach((valor) => agregarValor(ids, valor));

  return ids;
}

function esInstructorLiderGrupo(grupo) {
  const idsInstructor = obtenerIdsInstructorActual();
  const candidatos = [
    grupo?.id_instructor_lider,
    grupo?.instructor_lider?.id_instructor,
    grupo?.instructor?.id_instructor,
  ].filter(Boolean).map(String);

  return candidatos.some((id) => idsInstructor.has(id));
}

function prepararGrupoDetalle(grupo) {
  const trimestres = obtenerTrimestres(grupo);

  return {
    ...grupo,
    id_grupo: grupo.id_grupo || grupo.id || null,
    numero_ficha: obtenerCodigo(grupo),
    programa: obtenerPrograma(grupo),
    jornada: grupo.jornada || "",
    estado: obtenerEstado(grupo),
    fecha_inicio: grupo.fecha_inicio || "",
    fecha_fin: grupo.fecha_fin || "",
    trimestres: trimestres || "",
  };
}

function ordenarGruposImportantes(grupos) {
  return [...grupos].sort((a, b) => {
    return prioridadEstadoGrupo(obtenerEstado(a)) - prioridadEstadoGrupo(obtenerEstado(b)) ||
      String(obtenerCodigo(a)).localeCompare(String(obtenerCodigo(b)), "es", { numeric: true });
  });
}

export default function MisGrupos() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroJornada, setFiltroJornada] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const mensajeErrorRef = useRef(false);
  const setMensajeError = (valor) => { mensajeErrorRef.current = Boolean(valor); };
  const setMensaje = (texto) => {
    if (!texto) return;
    const tipo = mensajeErrorRef.current ? "error" : "success";
    toast[tipo](texto, { autoClose: 3200, closeOnClick: true });
  };
  const [grupoHorario, setGrupoHorario] = useState(null);
  const [grupoModal, setGrupoModal] = useState(null);
  const [grupoConfirmarHorario, setGrupoConfirmarHorario] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarGruposInstructor() {
      setLoading(true);
      setMensaje("");
      setMensajeError(false);

      try {
        const res = await fetch(GRUPOS_LIST_URL, { headers: getHeaders() });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              "No fue posible cargar tus grupos asignados"
          );
        }

        const gruposExtraidos = extraerListaGrupos(data).filter(
          (grupo) => !FICHAS_OCULTAS.has(String(obtenerCodigo(grupo)))
        );

        if (activo) {
          setGrupos(gruposExtraidos);
          setPaginaActual(1);
          setMensaje("");
          setMensajeError(false);
        }
      } catch (error) {
        console.error("Error cargando grupos del instructor:", error);
        if (activo) {
          setGrupos([]);
          setMensajeError(true);
          setMensaje(
            error.message ||
              "No fue posible cargar tus grupos asignados desde el backend."
          );
        }
      } finally {
        if (activo) setLoading(false);
      }
    }

    const timeout = window.setTimeout(cargarGruposInstructor, 0);

    return () => {
      activo = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const gruposFiltrados = useMemo(() => {
    let filtrados = grupos;

    if (busqueda.trim()) {
      const texto = normalizarTexto(busqueda);
      filtrados = filtrados.filter((grupo) =>
        normalizarTexto(
          `${obtenerCodigo(grupo)} ${obtenerPrograma(grupo)} ${grupo.jornada || ""}`
        ).includes(texto)
      );
    }

    if (filtroEstado) {
      filtrados = filtrados.filter((grupo) => obtenerEstado(grupo) === filtroEstado);
    }

    if (filtroJornada) {
      filtrados = filtrados.filter(
        (grupo) => normalizarTexto(grupo.jornada) === normalizarTexto(filtroJornada)
      );
    }

    return ordenarGruposImportantes(filtrados);
  }, [busqueda, filtroEstado, filtroJornada, grupos]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(gruposFiltrados.length / GRUPOS_POR_PAGINA)
  );
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * GRUPOS_POR_PAGINA;
  const gruposPagina = gruposFiltrados.slice(
    inicioPagina,
    inicioPagina + GRUPOS_POR_PAGINA
  );
  const desde = gruposFiltrados.length === 0 ? 0 : inicioPagina + 1;
  const hasta = Math.min(inicioPagina + GRUPOS_POR_PAGINA, gruposFiltrados.length);

  const jornadasDisponibles = useMemo(
    () => [...new Set([...JORNADAS_BASE, ...grupos.map((grupo) => grupo.jornada).filter(Boolean)])],
    [grupos]
  );

  function cambiarPagina(nuevaPagina) {
    const pagina = Math.min(Math.max(nuevaPagina, 1), totalPaginas);
    setPaginaActual(pagina);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("");
    setFiltroJornada("");
    setPaginaActual(1);
  }

  function navegarGrupo(grupo, index = 0) {
    const idGrupo = obtenerIdGrupo(grupo, index);
    const grupoDetalle = prepararGrupoDetalle(grupo);

    try {
      sessionStorage.setItem(`sima_grupo_detalle_${idGrupo}`, JSON.stringify(grupoDetalle));
    } catch {
      // La navegacion sigue funcionando aunque el navegador bloquee sessionStorage.
    }

    navigate(`/instructor/grupos/${idGrupo}`, { state: { grupo: grupoDetalle } });
  }

  function navegarHistorialAsistencia(grupo, index = 0) {
    const idGrupo = obtenerIdGrupo(grupo, index);
    const grupoDetalle = prepararGrupoDetalle(grupo);

    try {
      sessionStorage.setItem(`sima_grupo_detalle_${idGrupo}`, JSON.stringify(grupoDetalle));
    } catch {
      // La navegacion sigue funcionando aunque el navegador bloquee sessionStorage.
    }

    navigate(`/instructor/grupos/${idGrupo}/asistencias`, { state: { grupo: grupoDetalle } });
  }

  function abrirHorarioDesdeAsignacion(grupo) {
    setGrupoModal(null);
    setGrupoConfirmarHorario(grupo);
    setMensajeError(false);
    setMensaje(`Instructor asignado a la ficha ${obtenerCodigo(grupo)}.`);
  }

  function confirmarAgregarHorario() {
    setGrupoHorario(grupoConfirmarHorario);
    setGrupoConfirmarHorario(null);
  }

  function omitirAgregarHorario() {
    setGrupoConfirmarHorario(null);
  }

  return (
    <div className="grupos-page mis-grupos-page">
      <header className="grupos-header">
        <div>
          <span className="grupos-eyebrow">Area del instructor</span>
          <h1>Mis grupos</h1>
          <p>Consulta las fichas asignadas y su seguimiento academico.</p>
        </div>
      </header>

      {grupoConfirmarHorario && (
        <div className="grupos-alert info grupos-confirmacion-horario">
          <span>¿Quieres agregarle un horario a la ficha {obtenerCodigo(grupoConfirmarHorario)}</span>
          <div>
            <button type="button" className="grupos-primary-btn" onClick={confirmarAgregarHorario}>Si</button>
            <button type="button" className="grupos-secondary-btn" onClick={omitirAgregarHorario}>No</button>
          </div>
        </div>
      )}

      {!loading && grupos.length === 0 ? (
        <div className="grupos-alert info" style={{ marginTop: '20px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px' }}>
          <Info size={48} style={{ color: '#3b82f6' }} />
          <div>
            <h3 style={{ fontSize: '18px', color: '#0b2442', margin: '0 0 8px 0' }}>No tienes grupos asignados</h3>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Actualmente no hay ninguna ficha de formacion vinculada a tu perfil de instructor.</p>
          </div>
        </div>
      ) : (
        <>
          <section className="grupos-toolbar">
            <div className="grupos-search">
              <Search size={19} />
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por ficha, programa o jornada"
              />
            </div>

            <select
              className="grupos-select-filtro"
              value={filtroJornada}
              onChange={(e) => {
                setFiltroJornada(e.target.value);
                setPaginaActual(1);
              }}
            >
              <option value="">Todas las jornadas</option>
              {jornadasDisponibles.map((jornada) => (
                <option key={jornada} value={jornada}>
                  {jornada}
                </option>
              ))}
            </select>

            <select
              className="grupos-select-filtro"
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPaginaActual(1);
              }}
            >
              <option value="">Todos los estados</option>
              {ESTADOS_GRUPO.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>

            <button type="button" className="ghost" onClick={limpiarFiltros}>
              <FilterX size={16} />
              Limpiar
            </button>
          </section>

          <section className="grupos-card">
            <div className="grupos-card-header">
              <div>
                <h2>Grupos asignados</h2>
                <p>
                  Mostrando {desde}-{hasta} de {gruposFiltrados.length} grupos
                </p>
              </div>
            </div>

            <div className="grupos-table-wrap">
              <table className="grupos-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Programa</th>
                    <th>Jornada</th>
                    <th>Trimestres</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="grupos-empty">
                        Cargando grupos...
                      </td>
                    </tr>
                  ) : gruposPagina.length > 0 ? (
                    gruposPagina.map((grupo, index) => {
                      const estado = obtenerEstado(grupo);
                      const esLider = esInstructorLiderGrupo(grupo);

                      return (
                        <tr key={obtenerIdGrupo(grupo, inicioPagina + index)}>
                          <td className="grupos-highlight">{obtenerCodigo(grupo)}</td>
                          <td>{obtenerPrograma(grupo)}</td>
                          <td>{grupo.jornada || "No registrada"}</td>
                          <td>{formatearTrimestres(grupo)}</td>
                          <td>
                            <span className={`grupos-status ${obtenerEstadoClase(estado)}`}>
                              {etiquetaEstadoGrupo(estado)}
                            </span>
                          </td>
                          <td>
                            <div className="grupos-actions">
                              <button
                                type="button"
                                className="grupos-icon-btn"
                                onClick={() => navegarGrupo(grupo, inicioPagina + index)}
                                title="Ver detalle"
                                aria-label={`Ver ficha ${obtenerCodigo(grupo)}`}
                              >
                                <Eye size={16} />
                              </button>
                              {esLider && (
                                <button
                                  type="button"
                                  className="grupos-icon-btn horario"
                                  onClick={() => setGrupoHorario(grupo)}
                                  title="Asignar horario"
                                  aria-label={`Asignar horario a la ficha ${obtenerCodigo(grupo)}`}
                                >
                                  <CalendarClock size={16} />
                                </button>
                              )}
                              {esLider && (
                                <button
                                  type="button"
                                  className="grupos-icon-btn"
                                  onClick={() => setGrupoModal(grupo)}
                                  title="Gestionar instructores"
                                  aria-label={`Gestionar instructores de la ficha ${obtenerCodigo(grupo)}`}
                                >
                                  <UserPlus size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="grupos-icon-btn"
                                onClick={() => navegarHistorialAsistencia(grupo, inicioPagina + index)}
                                title="Filtrar asistencias"
                                aria-label={`Filtrar asistencias de la ficha ${obtenerCodigo(grupo)}`}
                              >
                                <ClipboardList size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="grupos-empty">
                        No hay grupos para mostrar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {gruposFiltrados.length > 0 && (
              <SimaPagination
                desde={desde}
                hasta={hasta}
                total={gruposFiltrados.length}
                entidad="grupos"
                paginaActual={paginaSegura}
                totalPaginas={totalPaginas}
                onCambiarPagina={cambiarPagina}
              />
            )}
          </section>
        </>
      )}

      {grupoHorario && esInstructorLiderGrupo(grupoHorario) && (
        <HorarioGrupoModal
          grupo={grupoHorario}
          onClose={() => setGrupoHorario(null)}
          onSaved={() => {
            setGrupoHorario(null);
            setMensajeError(false);
            setMensaje("Horario actualizado correctamente.");
          }}
          obtenerCodigo={obtenerCodigo}
          obtenerPrograma={obtenerPrograma}
        />
      )}

      {grupoModal && esInstructorLiderGrupo(grupoModal) && (
        <ModalAgregarInstructor
          grupo={grupoModal}
          onCerrar={() => setGrupoModal(null)}
          onAsignacionCompleta={abrirHorarioDesdeAsignacion}
        />
      )}
    </div>
  );
}
