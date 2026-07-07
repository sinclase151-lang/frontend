import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Layers, Plus, Search, Upload } from "lucide-react";
import { toast } from "react-toastify";
import SimaPagination from "../../components/common/SimaPagination";
import {
  ESTADOS_GRUPO,
  GRUPOS_LIST_URL,
  claseEstadoGrupo,
  etiquetaEstadoGrupo,
  normalizarEstadoGrupo,
} from "../../services/gruposService";
import "./fichas.css";

export default function GruposFormativos() {
  const navigate = useNavigate();
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalCargaMasivaAbierto, setModalCargaMasivaAbierto] = useState(false);
  const [archivoCargaMasiva, setArchivoCargaMasiva] = useState(null);
  const mensajeErrorRef = useRef(false);
  const setMensajeError = (valor) => { mensajeErrorRef.current = Boolean(valor); };
  const setMensaje = (texto) => {
    if (!texto) return;
    const tipo = mensajeErrorRef.current ? "error" : "success";
    toast[tipo](texto, { autoClose: 3200, closeOnClick: true });
  };
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroJornada, setFiltroJornada] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const [grupos, setGrupos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [ambientes, setAmbientes] = useState([]);

  const [numeroGrupo, setNumeroGrupo] = useState("");
  const [areaFormacion, setAreaFormacion] = useState("");
  const [jornada, setJornada] = useState("");
  const [programaFormacion, setProgramaFormacion] = useState("");
  const [trimestres, setTrimestres] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [instructorLider, setInstructorLider] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [errores, setErrores] = useState({});
  const [estadoNumero, setEstadoNumero] = useState(null);
  const [aprendicesPorGrupo, setAprendicesPorGrupo] = useState({});

  const API_URL = "/api";
  const URL_GRUPOS = `${API_URL}/groups`;
  const URL_INSTRUCTORES = `${URL_GRUPOS}/instructores-disponibles`;
  const GRUPOS_POR_PAGINA = 5;
  const rangoFechaInicio = useMemo(() => {
    const hoy = new Date();
    const minimo = new Date(hoy);
    const maximo = new Date(hoy);
    minimo.setMonth(minimo.getMonth() - 6);
    maximo.setFullYear(maximo.getFullYear() + 1);

    return {
      min: minimo.toISOString().split("T")[0],
      max: maximo.toISOString().split("T")[0],
    };
  }, []);

  function extraerLista(data, llavePrincipal = "") {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    if (llavePrincipal && Array.isArray(data?.data?.[llavePrincipal])) return data.data[llavePrincipal];
    if (llavePrincipal && Array.isArray(data[llavePrincipal])) return data[llavePrincipal];
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  }

  function getHeaders() {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token && token !== "undefined") headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function obtenerIdAmbiente(item) {
    return item?.id_ambiente || item?.id || item?.ambiente?.id_ambiente || item?.ambiente?.id;
  }

  function obtenerNombreAmbiente(item) {
    return (
      item?.nombre_ambiente ||
      item?.nombre ||
      item?.ambiente_nombre ||
      item?.ambiente?.nombre_ambiente ||
      item?.ambiente?.nombre ||
      ""
    );
  }

  function obtenerUbicacionAmbiente(item) {
    return item?.ubicacion || item?.ambiente?.ubicacion || "";
  }

  function normalizarAmbientes(lista) {
    const mapa = new Map();

    lista.forEach((item) => {
      const idAmbiente = obtenerIdAmbiente(item);
      const nombreAmbiente = obtenerNombreAmbiente(item);
      if (!idAmbiente || !nombreAmbiente) return;

      mapa.set(String(idAmbiente), {
        id_ambiente: idAmbiente,
        nombre_ambiente: nombreAmbiente,
        ubicacion: obtenerUbicacionAmbiente(item),
      });
    });

    return Array.from(mapa.values()).sort((a, b) =>
      String(a.nombre_ambiente).localeCompare(String(b.nombre_ambiente))
    );
  }

  function combinarAmbientes(base, nuevos) {
    return normalizarAmbientes([...base, ...nuevos]);
  }

  function extraerAmbientesDesdeGrupos(listaGrupos) {
    return normalizarAmbientes(
      listaGrupos
        .map((grupo) => grupo?.ambiente)
        .filter(Boolean)
    );
  }

  async function cargarGrupos() {
    try {
      const res = await fetch(GRUPOS_LIST_URL, { headers: getHeaders() });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "No fue posible cargar los grupos.");
      }

      const gruposExtraidos = extraerLista(data, "grupos");
      const gruposBackend = gruposExtraidos.length ? gruposExtraidos : extraerLista(data, "fichas");

      setGrupos(gruposBackend);
      setAmbientes((actuales) => combinarAmbientes(actuales, extraerAmbientesDesdeGrupos(gruposBackend)));
      setPaginaActual(1);
      cargarConteoAprendices(gruposBackend);
    } catch (error) {
      console.error("Error cargando grupos:", error);
      setMensajeError(true);
      setMensaje(error.message || "No fue posible cargar los grupos desde el backend.");
    }
  }

  async function cargarAreas() {
    try {
      const res = await fetch(`${API_URL}/dashboard/coordinador/resumen`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const areasExtraidas = data?.data?.areas || data?.areas || data?.results || [];
        setAreas(Array.isArray(areasExtraidas) ? areasExtraidas : []);
      }
    } catch (error) {
      console.error("Error cargando areas:", error);
      setAreas([]);
    }
  }

  async function cargarConteoAprendices(gruposBase) {
    try {
      const headers = getHeaders();
      const respuestas = await Promise.all(
        gruposBase.map(async (grupo) => {
          const idGrupo = grupo.id_grupo || grupo.id;
          if (!idGrupo) return [idGrupo, null];

          try {
            const res = await fetch(`${API_URL}/apprentices/grupo/${idGrupo}`, { headers });
            if (!res.ok) return [idGrupo, null];

            const data = await res.json().catch(() => null);
            const lista = data?.data?.aprendices || data?.data || [];
            const total = Array.isArray(lista) ? lista.length : 0;
            return [idGrupo, total];
          } catch {
            return [idGrupo, null];
          }
        })
      );

      setAprendicesPorGrupo(Object.fromEntries(respuestas.filter(([id]) => id)));
    } catch (error) {
      console.error("Error cargando conteo de aprendices:", error);
      setAprendicesPorGrupo({});
    }
  }

  async function cargarInstructores() {
    try {
      const res = await fetch(URL_INSTRUCTORES, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const lista = data?.data || data?.results || [];
        setInstructores(Array.isArray(lista) ? lista : []);
      }
    } catch (error) {
      console.error("Error cargando instructores:", error);
    }
  }

  async function cargarAmbientes() {
    const rutasAmbientes = [`${API_URL}/environments`, `${API_URL}/ambientes`];

    for (const ruta of rutasAmbientes) {
      try {
        const res = await fetch(ruta, { headers: getHeaders() });
        if (!res.ok) continue;

        const data = await res.json().catch(() => null);
        const lista = extraerLista(data, "ambientes");
        if (lista.length) {
          setAmbientes((actuales) => combinarAmbientes(actuales, lista));
          return;
        }
      } catch (error) {
        console.error("Error cargando ambientes:", error);
      }
    }
  }

  async function cargarProgramas(idArea) {
    try {
      const res = await fetch(`${API_URL}/formative-programs/area/${idArea}`, {
        headers: getHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        const progs = data?.data || data?.results || [];
        setProgramas(Array.isArray(progs) ? progs : []);
      } else {
        setProgramas([]);
      }
    } catch (error) {
      console.error("Error cargando programas:", error);
      setProgramas([]);
    }
  }

  useEffect(() => {
    let activo = true;
    Promise.resolve().then(() => {
      if (!activo) return;
      cargarGrupos();
      cargarAreas();
      cargarInstructores();
      cargarAmbientes();
    });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    Promise.resolve().then(() => {
      if (!activo) return;
      if (areaFormacion) {
        cargarProgramas(areaFormacion);
      } else {
        setProgramas([]);
        setProgramaFormacion("");
      }
    });
    return () => { activo = false; };
  }, [areaFormacion]);

  useEffect(() => {
    if (!numeroGrupo.trim()) {
      const timer = setTimeout(() => setEstadoNumero(null), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${URL_GRUPOS}/verificar-ficha/${numeroGrupo.trim()}`, {
          headers: getHeaders()
        });

        if (res.ok) {
          const data = await res.json();
          const isDisponible = data?.data?.disponible ?? data?.disponible;
          setEstadoNumero(isDisponible ? "disponible" : "ocupado");
        } else {
          setEstadoNumero(null);
        }
      } catch (error) {
        console.error("Error verificando grupo:", error);
        setEstadoNumero(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [numeroGrupo]);

  const gruposFiltrados = useMemo(() => {
    let filtrados = grupos;

    if (busqueda.trim()) {
      const texto = busqueda.trim().toLowerCase();
      filtrados = filtrados.filter((grupo) => {
        const codigo = grupo.numero_ficha || grupo.numero_grupo || grupo.codigo || "";
        const programa = grupo.programa_formacion?.nombre_programa || grupo.programa || "";
        const jornadaGrupo = grupo.jornada || "";
        return `${codigo} ${programa} ${jornadaGrupo}`.toLowerCase().includes(texto);
      });
    }

    if (filtroEstado) {
      filtrados = filtrados.filter((grupo) => normalizarEstadoGrupo(grupo.estado) === filtroEstado);
    }

    if (filtroJornada) {
      filtrados = filtrados.filter(grupo => (grupo.jornada || "") === filtroJornada);
    }

    return filtrados;
  }, [busqueda, filtroEstado, filtroJornada, grupos]);

  const totalPaginas = Math.max(1, Math.ceil(gruposFiltrados.length / GRUPOS_POR_PAGINA));
  const inicioPagina = (paginaActual - 1) * GRUPOS_POR_PAGINA;
  const gruposPagina = gruposFiltrados.slice(inicioPagina, inicioPagina + GRUPOS_POR_PAGINA);
  const desde = gruposFiltrados.length === 0 ? 0 : inicioPagina + 1;
  const hasta = Math.min(inicioPagina + GRUPOS_POR_PAGINA, gruposFiltrados.length);
  const mesesEquivalentes = trimestres && !isNaN(trimestres) ? parseInt(trimestres, 10) * 3 : 0;

  function cambiarPagina(nuevaPagina) {
    const paginaSegura = Math.min(Math.max(nuevaPagina, 1), totalPaginas);
    setPaginaActual(paginaSegura);
  }

  function limpiarFormulario() {
    setNumeroGrupo("");
    setAreaFormacion("");
    setJornada("");
    setProgramaFormacion("");
    setInstructorLider("");
    setAmbiente("");
    setTrimestres("");
    setFechaInicio("");
    setErrores({});
    setEstadoNumero(null);
  }

  function validarFormulario() {
    const nuevosErrores = {};
    if (!numeroGrupo.trim()) nuevosErrores.numeroGrupo = "Este campo es obligatorio";
    if (estadoNumero === "ocupado") nuevosErrores.numeroGrupo = "Este numero ya esta registrado";
    if (!areaFormacion) nuevosErrores.areaFormacion = "Este campo es obligatorio";
    if (!jornada) nuevosErrores.jornada = "Este campo es obligatorio";
    if (!programaFormacion) nuevosErrores.programaFormacion = "Este campo es obligatorio";
    if (!ambiente) nuevosErrores.ambiente = "Este campo es obligatorio";
    if (!trimestres || isNaN(trimestres)) nuevosErrores.trimestres = "Este campo es obligatorio";
    if (!fechaInicio) nuevosErrores.fechaInicio = "Este campo es obligatorio";
    if (fechaInicio && (fechaInicio < rangoFechaInicio.min || fechaInicio > rangoFechaInicio.max)) {
      nuevosErrores.fechaInicio = "La fecha debe estar entre 6 meses atras y 1 ano hacia adelante";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function guardarGrupo(e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    try {
      const payload = {
        numero_ficha: numeroGrupo.trim(),
        id_programa: parseInt(programaFormacion, 10),
        jornada,
        id_instructor_lider: instructorLider ? parseInt(instructorLider, 10) : null,
        id_ambiente: parseInt(ambiente, 10),
        trimestres: parseInt(trimestres, 10),
        fecha_inicio: fechaInicio
      };

      const res = await fetch(URL_GRUPOS, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const responseData = await res.json().catch(() => null);

      if (res.status === 409) {
        setErrores({ numeroGrupo: "Este numero ya esta registrado" });
        setEstadoNumero("ocupado");
        return;
      }

      if (!res.ok) {
        const errorMsg = responseData?.message || responseData?.error || responseData?.detail || "No fue posible crear el grupo.";
        throw new Error(errorMsg);
      }

      setMensajeError(false);
      setMensaje(`Grupo ${numeroGrupo.trim()} creado correctamente.`);
      setModalCrearAbierto(false);
      limpiarFormulario();
      await cargarGrupos();
    } catch (error) {
      console.error("Error guardando grupo:", error);
      setMensajeError(true);
      setMensaje(error.message || "Error de conexion. No se pudo crear el grupo.");
    }
  }

  function cargarGruposMasivo(e) {
    e.preventDefault();
    if (!archivoCargaMasiva) {
      setMensajeError(true);
      setMensaje("Seleccione un archivo Excel para la carga masiva de grupos.");
      return;
    }

    setMensajeError(false);
    setMensaje(`Archivo ${archivoCargaMasiva.name} listo para procesar.`);
    setArchivoCargaMasiva(null);
    setModalCargaMasivaAbierto(false);
  }

  function obtenerPrograma(grupo) {
    return grupo.programa_formacion?.nombre_programa || grupo.programa || grupo.nombre_programa || "No especificado";
  }

  function obtenerCodigo(grupo) {
    return grupo.numero_ficha || grupo.numero_grupo || grupo.codigo || "-";
  }

  function obtenerEstadoClase(estado) {
    return claseEstadoGrupo(estado);
  }

  function obtenerNombreInstructor(instructor) {
    if (!instructor) return "Sin asignar";
    const nombres = instructor.usuario?.persona?.nombres || instructor.nombres || "";
    const apellidos = instructor.usuario?.persona?.apellidos || instructor.apellidos || "";
    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    return nombreCompleto || instructor.usuario?.email || `Instructor ${instructor.id_instructor || ''}`;
  }

  function abrirDetalleGrupo(grupo, index = 0) {
    const idGrupo = grupo.id_grupo || grupo.id || index;
    try {
      sessionStorage.setItem(`sima_grupo_detalle_${idGrupo}`, JSON.stringify(grupo));
    } catch {
      // Si el navegador bloquea sessionStorage, el detalle igual consultara el backend.
    }
    navigate(`/fichas/${idGrupo}`, { state: { grupo } });
  }

  return (
    <div className="grupos-page">
      <header className="grupos-header">
        <div>
          <span className="grupos-eyebrow">Programacion academica</span>
          <h1>Gestion de grupos</h1>
          <p>Registra grupos de formacion y consulta su estado academico.</p>
        </div>

        <div className="grupos-header-actions">
          <button
            type="button"
            className="grupos-secondary-btn"
            onClick={() => setModalCargaMasivaAbierto(true)}
          >
            <Upload size={18} />
            Carga masiva
          </button>
          <button type="button" className="grupos-primary-btn" data-testid="btn-abrir-crear-grupo" onClick={() => setModalCrearAbierto(true)}>
            <Plus size={19} />
            Crear grupo
          </button>
        </div>
      </header>

      <section className="grupos-toolbar">
        <div className="grupos-search">
          <Search size={19} />
          <input
            data-testid="input-buscar-grupo"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por codigo, programa o jornada"
          />
        </div>
        
        <select 
          className="grupos-select-filtro" 
          data-testid="select-filtro-jornada"
          value={filtroJornada} 
          onChange={(e) => { setFiltroJornada(e.target.value); setPaginaActual(1); }}
        >
          <option value="">Todas las jornadas</option>
          <option value="Manana">Manana</option>
          <option value="Tarde">Tarde</option>
          <option value="Noche">Noche</option>
        </select>

        <select 
          className="grupos-select-filtro" 
          data-testid="select-filtro-estado"
          value={filtroEstado} 
          onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_GRUPO.map((estado) => (
            <option key={estado.value} value={estado.value}>{estado.label}</option>
          ))}
        </select>

        <button
          type="button"
          className="ghost"
          onClick={() => {
            setBusqueda("");
            setFiltroEstado("");
            setFiltroJornada("");
            setPaginaActual(1);
          }}
        >
          Limpiar
        </button>
      </section>

      <section className="grupos-card">
        <div className="grupos-card-header">
          <div>
            <h2>Grupos registrados</h2>
            <p>Mostrando {desde}-{hasta} de {gruposFiltrados.length} grupos</p>
          </div>
        </div>

        <div className="grupos-table-wrap">
          <table className="grupos-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Programa</th>
                <th>Jornada</th>
                <th>Aprendices</th>
                <th>Trimestres</th>
                <th>Estado</th>
                <th>Lider</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gruposPagina.length > 0 ? (
                gruposPagina.map((grupo, index) => (
                  <tr key={grupo.id_grupo || grupo.id || index} data-testid="fila-grupo" data-numero-ficha={obtenerCodigo(grupo)}>
                    <td className="grupos-highlight">{obtenerCodigo(grupo)}</td>
                    <td>{obtenerPrograma(grupo)}</td>
                    <td>{grupo.jornada || "No registrada"}</td>
                    <td>{aprendicesPorGrupo[grupo.id_grupo || grupo.id] ?? grupo.aprendices ?? "-"}</td>
                    <td>{grupo.trimestres ?? "-"}</td>
                    <td>
                      <span className={`grupos-status ${obtenerEstadoClase(grupo.estado)}`}>
                        {etiquetaEstadoGrupo(grupo.estado)}
                      </span>
                    </td>
                    <td>{obtenerNombreInstructor(grupo.instructor_lider)}</td>
                    <td>
                      <div className="grupos-actions">
                        <button type="button" className="grupos-icon-btn" data-testid="btn-ver-detalle-grupo" onClick={() => abrirDetalleGrupo(grupo, inicioPagina + index)} title="Ver detalle">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="grupos-empty">No hay grupos para mostrar</td>
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
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiarPagina={cambiarPagina}
          />
        )}
      </section>

      {modalCrearAbierto && (
        <div className="grupos-modal-backdrop" role="presentation">
          <section className="grupos-modal" role="dialog" aria-modal="true" aria-labelledby="crear-grupo-title">
            <div className="grupos-modal-header">
              <div>
                <span className="grupos-eyebrow">Nuevo grupo formativo</span>
                <h2 id="crear-grupo-title">Crear grupo</h2>
                <p>Completa la informacion obligatoria para habilitar el grupo.</p>
              </div>
            </div>

            <form className="grupos-form" onSubmit={guardarGrupo}>
              <div className="grupos-form-grid">
                <label>
                  <span>Numero de grupo</span>
                  <input data-testid="input-numero-grupo" value={numeroGrupo} onChange={(e) => setNumeroGrupo(e.target.value)} className={errores.numeroGrupo ? "invalid" : ""} />
                  {estadoNumero === "disponible" && !errores.numeroGrupo && <small className="success">Numero disponible</small>}
                  {errores.numeroGrupo && <small className="error">{errores.numeroGrupo}</small>}
                </label>

                <label>
                  <span>Area de formacion</span>
                  <select data-testid="select-area-formacion" value={areaFormacion} onChange={(e) => setAreaFormacion(e.target.value)} className={errores.areaFormacion ? "invalid" : ""}>
                    <option value="">Seleccione</option>
                    {areas.map((area) => (
                      <option key={area.id_area} value={area.id_area}>{area.nombre_area || area.nombre}</option>
                    ))}
                  </select>
                  {errores.areaFormacion && <small className="error">{errores.areaFormacion}</small>}
                </label>
              </div>

              <div className="grupos-form-grid">
                <label>
                  <span>Programa de formacion</span>
                  <select data-testid="select-programa-formacion" value={programaFormacion} onChange={(e) => setProgramaFormacion(e.target.value)} disabled={!areaFormacion} className={errores.programaFormacion ? "invalid" : ""}>
                    <option value="">Seleccione</option>
                    {programas.map((programa) => (
                      <option key={programa.id_programa} value={programa.id_programa}>{programa.nombre_programa}</option>
                    ))}
                  </select>
                  {!areaFormacion && <small>Selecciona un area primero</small>}
                  {errores.programaFormacion && <small className="error">{errores.programaFormacion}</small>}
                </label>

                <label>
                  <span>Jornada academica</span>
                  <select data-testid="select-jornada" value={jornada} onChange={(e) => setJornada(e.target.value)} className={errores.jornada ? "invalid" : ""}>
                    <option value="">Seleccione</option>
                    <option value="Manana">Manana - 7:00 am a 1:00 pm</option>
                    <option value="Tarde">Tarde - 12:00 m a 6:00 pm</option>
                    <option value="Noche">Noche - 6:00 pm a 10:00 pm</option>
                  </select>
                  {errores.jornada && <small className="error">{errores.jornada}</small>}
                </label>
              </div>

              <div className="grupos-form-grid">
                <label>
                  <span>Instructor lider</span>
                  <select data-testid="select-instructor-lider" value={instructorLider} onChange={(e) => setInstructorLider(e.target.value)}>
                    <option value="">Seleccione instructor</option>
                    {instructores.map((instructor) => (
                      <option key={instructor.id_instructor} value={instructor.id_instructor}>
                        {obtenerNombreInstructor(instructor)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Duracion en trimestres</span>
                  <input data-testid="input-trimestres" type="number" min="1" value={trimestres} onChange={(e) => setTrimestres(e.target.value)} className={errores.trimestres ? "invalid" : ""} />
                  {!errores.trimestres && trimestres && <small>Equivale a {mesesEquivalentes} meses de formacion</small>}
                  {errores.trimestres && <small className="error">{errores.trimestres}</small>}
                </label>
              </div>

              <div className="grupos-form-grid">
                <label>
                  <span>Fecha de inicio</span>
                  <input
                    data-testid="input-fecha-inicio"
                    type="date"
                    value={fechaInicio}
                    min={rangoFechaInicio.min}
                    max={rangoFechaInicio.max}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className={errores.fechaInicio ? "invalid" : ""}
                  />
                  {!errores.fechaInicio && <small>Permitido: de {rangoFechaInicio.min} a {rangoFechaInicio.max}</small>}
                  {errores.fechaInicio && <small className="error">{errores.fechaInicio}</small>}
                </label>

                <label>
                  <span>Ambiente</span>
                  <select data-testid="select-ambiente" value={ambiente} onChange={(e) => setAmbiente(e.target.value)} className={errores.ambiente ? "invalid" : ""} required>
                    <option value="">Seleccione ambiente</option>
                    {ambientes.map((item) => (
                      <option key={item.id_ambiente} value={item.id_ambiente}>
                        {item.nombre_ambiente}{item.ubicacion ? ` - ${item.ubicacion}` : ""}
                      </option>
                    ))}
                  </select>
                  {errores.ambiente && <small className="error">{errores.ambiente}</small>}
                  <small>
                    {ambientes.length
                      ? "Obligatorio, se usara para los horarios y sesiones del grupo"
                      : "No hay ambientes disponibles para seleccionar"}
                  </small>
                </label>
              </div>

              <div className="grupos-info-box">
                <Layers size={19} />
                <p>Una vez creado, el grupo quedara disponible para asignar aprendices, instructor lider y horarios.</p>
              </div>

              <div className="grupos-modal-actions">
                <button type="button" className="grupos-secondary-btn" data-testid="btn-cancelar-crear-grupo" onClick={() => { limpiarFormulario(); setModalCrearAbierto(false); }}>
                  Cancelar
                </button>
                <button type="submit" className="grupos-primary-btn" data-testid="btn-submit-crear-grupo">Crear grupo</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modalCargaMasivaAbierto && (
        <div className="grupos-modal-backdrop" role="presentation">
          <section className="grupos-modal compact" role="dialog" aria-modal="true" aria-labelledby="carga-grupos-title">
            <div className="grupos-modal-header">
              <div>
                <span className="grupos-eyebrow">Carga masiva</span>
                <h2 id="carga-grupos-title">Importar grupos</h2>
                <p>Archivo Excel con ficha, programa, area, jornada, trimestres, fecha de inicio e instructor lider.</p>
              </div>
            </div>

            <form className="grupos-form" onSubmit={cargarGruposMasivo}>
              <label className="grupos-upload">
                <Upload size={34} />
                <strong>{archivoCargaMasiva ? archivoCargaMasiva.name : "Seleccionar archivo"}</strong>
                <span>Formatos preparados: .xlsx, .xls</span>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setArchivoCargaMasiva(e.target.files?.[0] || null)} />
              </label>

              <div className="grupos-modal-actions">
                <button type="button" className="grupos-secondary-btn" onClick={() => { setArchivoCargaMasiva(null); setModalCargaMasivaAbierto(false); }}>Cancelar</button>
                <button type="submit" className="grupos-primary-btn">Preparar carga</button>
              </div>
            </form>
          </section>
        </div>
      )}

    </div>
  );
}