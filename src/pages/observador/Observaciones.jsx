import { useEffect, useState } from "react";
import { Edit3, Eye, Plus, Save, Search, X } from "lucide-react";
import SimaPagination from "../../components/common/SimaPagination";
import "./Observaciones.css";

const FILTROS_INICIALES = {
  id_aprendiz: "",
  tipo: "",
  severidad: "",
  estado: "",
  fecha_desde: "",
  fecha_hasta: "",
};

export default function Observaciones() {
  const API_URL = "/api";


  function safeParse(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch {
      return null;
    }
  }

  const usuario = safeParse("user_data") || safeParse("usuario") || {};
  const rol = (
    localStorage.getItem("rol") ||
    usuario?.rol ||
    usuario?.tipo_rol ||
    ""
  ).toLowerCase();

  const esInstructor = rol === "instructor";

  function getHeaders() {
    const token =
      localStorage.getItem("access") || localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token && token !== "undefined") {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }



  // Fecha máxima = hoy (no se permiten fechas futuras en los filtros)
  const hoy = new Date().toISOString().split("T")[0];

  // Formatea ISO a dd/mm/aaaa hh:mm
  function formatFecha(iso) {
    if (!iso) return "Sin fecha";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatFechaFiltro(fecha) {
    if (!fecha) return "";
    const [year, month, day] = fecha.split("-");
    return year && month && day ? `${day}/${month}/${year}` : fecha;
  }

  function normalizarFechaFiltro(fecha, cierreDia = false) {
    if (!fecha) return "";
    return `${fecha}T${cierreDia ? "23:59:59.999" : "00:00:00.000"}`;
  }

  function rangoFechasEsInvalido(fechaDesde, fechaHasta) {
    return Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);
  }

  function getNombreAprendiz(obs) {
    const p = obs?.aprendiz?.usuario?.persona;
    return p ? `${p.nombres} ${p.apellidos}`.trim() : "Sin nombre";
  }

  // Para el listado de aprendices (getByGroup): aprendiz.usuario.persona
  function getNombreAprendizLista(aprendiz) {
    const p = aprendiz?.usuario?.persona;
    return p ? `${p.nombres} ${p.apellidos}`.trim() : "Sin nombre";
  }

  function getNombreInstructor(obs) {
    const p = obs?.instructor?.usuario?.persona;
    return p ? `${p.nombres} ${p.apellidos}`.trim() : "Instructor";
  }

  function getNumeroFicha(grupo) {
    return grupo?.numero_ficha || grupo?.numero_grupo || grupo?.codigo || grupo?.id_grupo || "";
  }

  
  const [fichas, setFichas] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(
    () => sessionStorage.getItem("obs_grupo_seleccionado") || ""
  );

  const [observaciones, setObservaciones] = useState([]);
  const [total, setTotal] = useState(0);
  const [observacionesAbiertas, setObservacionesAbiertas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorFiltros, setErrorFiltros] = useState("");
  const [pagina, setPagina] = useState(1);
  const LIMIT = 5;

  // Todos los filtros van como query params al backend
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [filtrosFormulario, setFiltrosFormulario] = useState(FILTROS_INICIALES);

  // Aprendices del grupo para poblar los dropdowns (sin paginar)
  const [aprendices, setAprendices] = useState([]);

  // Modal registro / edición
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    id_aprendiz: "",
    tipo_observacion: "ACADEMICA",
    severidad: "LEVE",
    descripcion: "",
    notificar_lider: false,
  });
  const [mostrarDropdownModal, setMostrarDropdownModal] = useState(false);
  const [busquedaModal, setBusquedaModal] = useState("");

  // Modal historial
  const [historial, setHistorial] = useState([]);
  const [totalHistorial, setTotalHistorial] = useState(0);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [aprendizHistorial, setAprendizHistorial] = useState(null);


  useEffect(() => {
    fetchFichas();
  }, []);

  useEffect(() => {
    if (!grupoSeleccionado) return;
    sessionStorage.setItem("obs_grupo_seleccionado", grupoSeleccionado);
    fetchObservaciones();
    fetchAprendices();
  }, [grupoSeleccionado, pagina, filtros]);

  // --- Fetch fichas -------------------------------------------------------------
  async function fetchFichas() {
    try {
      const res = await fetch(`${API_URL}/apprentices/grupos-activos`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("No se pudieron cargar las fichas");
      const data = await res.json();
      // getActiveGroups devuelve el array directamente en data.data
      const lista = Array.isArray(data?.data) ? data.data : [];
      setFichas(lista);
      // Solo autoselecciona si no hay uno guardado en sessionStorage
      if (lista.length > 0 && !grupoSeleccionado) {
        setGrupoSeleccionado(String(lista[0].id_grupo));
      }
    } catch (error) {
      console.error(error);
      setFichas([]);
    }
  }

  // --- Fetch aprendices (limit=1000 para poblar selects sin paginar) ------------
  async function fetchAprendices() {
    try {
      const res = await fetch(
        `${API_URL}/apprentices/grupo/${grupoSeleccionado}?limit=1000`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error("No se pudieron cargar aprendices");
      const data = await res.json();
      // getByGroup devuelve { total, pagina, grupo, aprendices: rows }
      const lista = data?.data?.aprendices || [];
      setAprendices(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error(error);
      setAprendices([]);
    }
  }

  // --- Fetch observaciones (H18) ------------------------------------------------
  async function fetchObservaciones(opciones = {}) {
    const filtrosConsulta = opciones.filtros || filtros;
    const paginaConsulta = opciones.pagina || pagina;
    const grupoConsulta = opciones.grupo || grupoSeleccionado;

    if (!grupoConsulta) return;

    try {
      setLoading(true);
      setErrorFiltros("");

      if (rangoFechasEsInvalido(filtrosConsulta.fecha_desde, filtrosConsulta.fecha_hasta)) {
        setObservaciones([]);
        setTotal(0);
        setObservacionesAbiertas(0);
        setErrorFiltros("La fecha desde no puede ser mayor que la fecha hasta.");
        return;
      }

      const params = new URLSearchParams();
      params.append("page", paginaConsulta);
      params.append("limit", LIMIT);

      if (filtrosConsulta.id_aprendiz) params.append("id_aprendiz", filtrosConsulta.id_aprendiz);
      if (filtrosConsulta.tipo)        params.append("tipo_observacion", filtrosConsulta.tipo);
      if (filtrosConsulta.severidad)   params.append("severidad", filtrosConsulta.severidad);
      if (filtrosConsulta.estado)      params.append("estado", filtrosConsulta.estado);
      if (filtrosConsulta.fecha_desde) params.append("fecha_desde", normalizarFechaFiltro(filtrosConsulta.fecha_desde));
      if (filtrosConsulta.fecha_hasta) params.append("fecha_hasta", normalizarFechaFiltro(filtrosConsulta.fecha_hasta, true));

      const res = await fetch(
        `${API_URL}/observations/group/${grupoConsulta}?${params}`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error("Error cargando observaciones");
      const data = await res.json();

      const payload = data?.data || data;
      const lista = payload?.observaciones || payload?.data || payload?.results || (Array.isArray(payload) ? payload : []);
      setObservaciones(Array.isArray(lista) ? lista : []);
      setTotal(Number(payload?.total ?? lista.length) || 0);
      setObservacionesAbiertas(Number(payload?.observaciones_abiertas ?? 0) || 0);
    } catch (error) {
      console.error(error);
      setObservaciones([]);
    } finally {
      setLoading(false);
    }
  }

  // --- Fetch historial (H19) - requiere id_grupo como query param ---------------
  async function fetchHistorial(idAprendiz, nombreAprendiz) {
    try {
      const params = new URLSearchParams();
      params.append("id_grupo", grupoSeleccionado);
      const res = await fetch(
        `${API_URL}/observations/apprentice/${idAprendiz}?${params}`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error("No se pudo cargar el historial");
      const data = await res.json();
      setHistorial(data?.data?.observaciones || []);
      setTotalHistorial(data?.data?.total || 0);
      setAprendizHistorial(nombreAprendiz);
      setMostrarHistorial(true);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  // --- Submit (H17 POST / H20 PATCH) -------------------------------------------
  async function handleSubmit() {
    if (!grupoSeleccionado) { alert("Debes seleccionar una ficha"); return; }
    if (!form.id_aprendiz)  { alert("Selecciona un aprendiz"); return; }
    if (form.descripcion.trim().length < 20) {
      alert("La descripción debe tener mínimo 20 caracteres");
      return;
    }

    try {
      const payload = editando
        ? {
            tipo_observacion: form.tipo_observacion,
            severidad: form.severidad,
            descripcion: form.descripcion.trim(),
          }
        : {
            id_aprendiz: Number(form.id_aprendiz),
            id_grupo: Number(grupoSeleccionado),
            tipo_observacion: form.tipo_observacion,
            severidad: form.severidad,
            descripcion: form.descripcion.trim(),
            notificar_lider: form.notificar_lider,
          };

      const url    = editando ? `${API_URL}/observations/${editando}` : `${API_URL}/observations`;
      const method = editando ? "PATCH" : "POST";

      const res  = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.message || data?.error || "Error guardando observación");

      cerrarModal();
      setFiltros(FILTROS_INICIALES);
      setPagina(1);
      await fetchObservaciones({ filtros: FILTROS_INICIALES, pagina: 1, grupo: grupoSeleccionado });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  // --- Helpers UI ---------------------------------------------------------------
  function handleEditar(obs) {
    setEditando(obs.id_observacion || obs.id);
    setForm({
      id_aprendiz:      obs.id_aprendiz,
      tipo_observacion: obs.tipo_observacion,
      severidad:        obs.severidad,
      descripcion:      obs.descripcion,
      notificar_lider:  false,
    });
    setMostrarModal(true);
  }

  function cerrarModal() {
    setMostrarModal(false);
    setEditando(null);
    setMostrarDropdownModal(false);
    setBusquedaModal("");
    setForm({ id_aprendiz: "", tipo_observacion: "ACADEMICA", severidad: "LEVE", descripcion: "", notificar_lider: false });
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
    setFiltrosFormulario(FILTROS_INICIALES);
    setErrorFiltros("");
    setPagina(1);
  }

  function aplicarFiltros() {
    setPagina(1);
    setFiltros(filtrosFormulario);
    fetchObservaciones({ filtros: filtrosFormulario, pagina: 1, grupo: grupoSeleccionado });
  }

  const totalPaginas = Math.max(1, Math.ceil(total / LIMIT));
  const desde = total === 0 ? 0 : (pagina - 1) * LIMIT + 1;
  const hasta = Math.min(pagina * LIMIT, total);

  function cambiarPagina(nuevaPagina) {
    const paginaSegura = Math.min(Math.max(nuevaPagina, 1), totalPaginas);
    setPagina(paginaSegura);
  }

  const aprendizEnModal = aprendices.find(
    (a) => Number(a.id_aprendiz) === Number(form.id_aprendiz)
  );
  const grupoEnModal = fichas.find(
    (g) => Number(g.id_grupo) === Number(grupoSeleccionado)
  );

  const aprendicesFiltradosModal = aprendices.filter((a) =>
    getNombreAprendizLista(a).toLowerCase().includes(busquedaModal.toLowerCase())
  );

  // --- Render -------------------------------------------------------------------
  return (
    <div className="obs-page">
      <header className="obs-main-header">
        <div>
          <h1>Gestión de observaciones</h1>
          <p>Consulta, registra y administra observaciones de los aprendices por ficha.</p>
          {grupoSeleccionado && (
            <div className="obs-stats">
              <span className="badge cerrada">Total: {total}</span>
              <span className="badge abierta">Abiertas: {observacionesAbiertas}</span>
            </div>
          )}
        </div>

        {esInstructor && (
          <button
            className="obs-btn-primary"
            type="button"
            onClick={() => { cerrarModal(); setMostrarModal(true); }}
          >
            <Plus size={18} strokeWidth={2.4} />
            Registrar observación
          </button>
        )}
      </header>

      {/* -- Encabezado + filtros -- */}
      <section className="obs-toolbar">
        <div className="obs-filters">
          <select
            value={grupoSeleccionado}
            onChange={(e) => {
              setGrupoSeleccionado(e.target.value);
              setPagina(1);
              setFiltros((f) => ({ ...f, id_aprendiz: "" }));
              setFiltrosFormulario((f) => ({ ...f, id_aprendiz: "" }));
            }}
          >
            <option value="">Seleccione ficha</option>
            {fichas.map((g) => (
              <option key={g.id_grupo} value={g.id_grupo}>
                Ficha {g.numero_ficha}
              </option>
            ))}
          </select>

          <select
            value={filtrosFormulario.id_aprendiz}
            onChange={(e) => setFiltrosFormulario({ ...filtrosFormulario, id_aprendiz: e.target.value })}
          >
            <option value="">Todos los aprendices</option>
            {aprendices.map((a) => (
              <option key={a.id_aprendiz} value={a.id_aprendiz}>
                {getNombreAprendizLista(a)}
              </option>
            ))}
          </select>

          <select
            value={filtrosFormulario.tipo}
            onChange={(e) => setFiltrosFormulario({ ...filtrosFormulario, tipo: e.target.value })}
          >
            <option value="">tipo</option>
            <option value="ACADEMICA">académica</option>
            <option value="CONVIVENCIAL">convivencial</option>
          </select>

          <select
            value={filtrosFormulario.severidad}
            onChange={(e) => setFiltrosFormulario({ ...filtrosFormulario, severidad: e.target.value })}
          >
            <option value="">Severidad</option>
            <option value="LEVE">LEVE</option>
            <option value="MODERADA">MODERADA</option>
            <option value="GRAVE">GRAVE</option>
          </select>

          <select
            value={filtrosFormulario.estado}
            onChange={(e) => setFiltrosFormulario({ ...filtrosFormulario, estado: e.target.value })}
          >
            <option value="">Estado</option>
            <option value="ABIERTA">ABIERTA</option>
            <option value="CERRADA">CERRADA</option>
          </select>
        </div>

        <div className="obs-filters-dates">
          <div className="obs-date-field">
            <span className="obs-date-label">
              Desde {filtrosFormulario.fecha_desde && <strong>{formatFechaFiltro(filtrosFormulario.fecha_desde)}</strong>}
            </span>
            <input
              type="date"
              className={filtrosFormulario.fecha_desde ? "has-value" : ""}
              value={filtrosFormulario.fecha_desde}
              max={hoy}
              onChange={(e) => setFiltrosFormulario({ ...filtrosFormulario, fecha_desde: e.target.value })}
            />
          </div>
          <div className="obs-date-field">
            <span className="obs-date-label">
              Hasta {filtrosFormulario.fecha_hasta && <strong>{formatFechaFiltro(filtrosFormulario.fecha_hasta)}</strong>}
            </span>
            <input
              type="date"
              className={filtrosFormulario.fecha_hasta ? "has-value" : ""}
              value={filtrosFormulario.fecha_hasta}
              max={hoy}
              onChange={(e) => setFiltrosFormulario({ ...filtrosFormulario, fecha_hasta: e.target.value })}
            />
          </div>
          <button className="obs-btn-primary" onClick={aplicarFiltros}>
            <Search size={16} strokeWidth={2.4} />
            Buscar
          </button>
          <button className="obs-btn-secondary" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
        {errorFiltros && <p className="obs-filter-warning">{errorFiltros}</p>}
      </section>

      {/* -- Tabla observaciones (H18) -- */}
      <section className="obs-card obs-table-card">
        <div className="obs-card-header">
          <div>
            <h2>Observaciones registradas</h2>
            <p>Mostrando {desde}-{hasta} de {total} observaciones</p>
          </div>
        </div>

        {loading ? (
          <p className="obs-loading">Cargando...</p>
        ) : (
          <>
            <div className="obs-table">
              <table>
                <thead>
                  <tr>
                    <th>Aprendiz</th>
                    <th>Tipo</th>
                    <th>Severidad</th>
                    <th>Estado</th>
                    <th>Descripción</th>
                    <th>Fecha</th>
                    <th>Autor</th>
                    <th>Seguimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {observaciones.length > 0 ? (
                    observaciones.map((obs) => (
                      <tr key={obs.id_observacion}>
                        <td>{getNombreAprendiz(obs)}</td>
                        <td className="obs-plain-value obs-type-value">{obs.tipo_observacion}</td>
                        <td>
                          <span className={`badge ${(obs.severidad || "").toLowerCase()}`}>
                            {obs.severidad}
                          </span>
                        </td>
                        <td className="obs-plain-value">{obs.estado}</td>
                        <td className="obs-description-cell">
                          {obs.descripcion?.length > 80
                            ? obs.descripcion.slice(0, 80) + "..."
                            : obs.descripcion}
                        </td>
                        <td>{formatFecha(obs.fecha_observacion)}</td>
                        <td>{getNombreInstructor(obs)}</td>
                        <td>
                          <div className="obs-actions">
                            <button
                              type="button"
                              className="obs-icon-btn"
                              onClick={() => fetchHistorial(obs.id_aprendiz, getNombreAprendiz(obs))}
                              title="Ver historial"
                              aria-label="Ver historial"
                            >
                              <Eye size={16} strokeWidth={2.2} />
                            </button>
                            {esInstructor && obs.estado === "ABIERTA" && (
                              <button
                                type="button"
                                className="obs-icon-btn obs-action-edit"
                                onClick={() => handleEditar(obs)}
                                title="Editar observación"
                                aria-label="Editar observación"
                              >
                                <Edit3 size={16} strokeWidth={2.2} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="obs-empty">
                        {grupoSeleccionado
                          ? "No hay observaciones registradas para este grupo"
                          : "Selecciona una ficha para ver observaciones"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <SimaPagination
                desde={desde}
                hasta={hasta}
                total={total}
                entidad="observaciones"
                paginaActual={pagina}
                totalPaginas={totalPaginas}
                onCambiarPagina={cambiarPagina}
              />
            )}
          </>
        )}
      </section>

      {/* -- Modal registro / edición (H17 + H20) -- */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <span className="modal-tag">
              {editando ? "EDITANDO" : "NUEVO REGISTRO"}
            </span>
            <h2>{editando ? "Editar observación" : "Registrar observación"}</h2>

            <div className="modal-grid">
              <div>
                <label>Ficha</label>
                <select
                  value={grupoSeleccionado}
                  disabled={!!editando}
                  onChange={(e) => {
                    setGrupoSeleccionado(e.target.value);
                    setForm({ ...form, id_aprendiz: "" });
                    setFiltros((actual) => ({ ...actual, id_aprendiz: "" }));
                    setPagina(1);
                  }}
                >
                  <option value="">Seleccione ficha</option>
                  {fichas.map((g) => (
                    <option key={g.id_grupo} value={g.id_grupo}>
                      Ficha {getNumeroFicha(g)}
                    </option>
                  ))}
                </select>
                {grupoEnModal && (
                  <small className="obs-modal-help">
                    La observación se asociará a la ficha {getNumeroFicha(grupoEnModal)}.
                  </small>
                )}
              </div>

              <div>
                <label>Aprendiz</label>
                <div className="multi-select">
                  <button
                    type="button"
                    className="multi-select-trigger"
                    disabled={!!editando}
                    onClick={() => !editando && setMostrarDropdownModal(!mostrarDropdownModal)}
                  >
                    {aprendizEnModal
                      ? getNombreAprendizLista(aprendizEnModal)
                      : "Seleccione un aprendiz"}
                  </button>

                  {mostrarDropdownModal && !editando && (
                    <div className="multi-select-dropdown">
                      <input
                        type="text"
                        placeholder="Buscar aprendiz..."
                        value={busquedaModal}
                        onChange={(e) => setBusquedaModal(e.target.value)}
                        className="multi-select-search"
                        autoFocus
                      />
                      <div className="multi-select-options">
                        {aprendicesFiltradosModal.length > 0 ? (
                          aprendicesFiltradosModal.map((a) => (
                            <label key={a.id_aprendiz} className="multi-select-option">
                              <input
                                type="radio"
                                name="aprendiz"
                                checked={Number(form.id_aprendiz) === Number(a.id_aprendiz)}
                                onChange={() => {
                                  setForm({ ...form, id_aprendiz: a.id_aprendiz });
                                  setMostrarDropdownModal(false);
                                  setBusquedaModal("");
                                }}
                              />
                              <span>{getNombreAprendizLista(a)}</span>
                            </label>
                          ))
                        ) : (
                          <p className="multi-select-empty">Sin resultados</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label>Tipo</label>
                <select
                  value={form.tipo_observacion}
                  onChange={(e) => setForm({ ...form, tipo_observacion: e.target.value })}
                >
                  <option value="ACADEMICA">Académica</option>
                  <option value="CONVIVENCIAL">Convivencial</option>
                </select>
              </div>

              <div>
                <label>Severidad</label>
                <select
                  value={form.severidad}
                  onChange={(e) => setForm({ ...form, severidad: e.target.value })}
                >
                  <option value="LEVE">Leve</option>
                  <option value="MODERADA">Moderada</option>
                  <option value="GRAVE">Grave</option>
                </select>
              </div>
            </div>

            <div className="modal-full">
              <label>Descripción</label>
              <textarea
                placeholder="Describe la observación (mínimo 20 caracteres)..."
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
              <small className={form.descripcion.trim().length < 20 ? "obs-char-error" : "obs-char-ok"}>
                {form.descripcion.trim().length} / 20 caracteres minimos
              </small>
            </div>

            {!editando && (
              <div className="obs-notif-lider">
                <label>
                  <input
                    type="checkbox"
                    checked={form.notificar_lider}
                    onChange={(e) => setForm({ ...form, notificar_lider: e.target.checked })}
                  />
                  Notificar al instructor 
                </label>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={cerrarModal}>
                <X size={16} strokeWidth={2.3} />
                Cancelar
              </button>
              <button className="obs-btn-primary" onClick={handleSubmit}>
                <Save size={16} strokeWidth={2.3} />
                {editando ? "Actualizar" : "Guardar observación"}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {mostrarHistorial && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>
              Historial de observaciones
              {aprendizHistorial && (
                <span className="obs-historial-nombre"> - {aprendizHistorial}</span>
              )}
            </h2>
            <p className="obs-historial-total">
              {totalHistorial} observacion{totalHistorial !== 1 ? "es" : ""} registrada{totalHistorial !== 1 ? "s" : ""}
            </p>

            <div className="obs-historial-lista">
              {historial.length > 0 ? (
                historial.map((item) => (
                  <div key={item.id_observacion} className="historial-item">
                    <div className="historial-badges">
                      <span className={`badge ${(item.tipo_observacion || "").toLowerCase()}`}>
                        {item.tipo_observacion}
                      </span>
                      <span className={`badge ${(item.severidad || "").toLowerCase()}`}>
                        {item.severidad}
                      </span>
                      <span className={`badge ${(item.estado || "").toLowerCase()}`}>
                        {item.estado}
                      </span>
                    </div>
                    <p><strong>Fecha:</strong> {formatFecha(item.fecha_observacion)}</p>
                    <p><strong>Descripción:</strong> {item.descripcion}</p>
                    <p className="historial-meta">
                      <strong>Instructor:</strong>{" "}
                      {item.instructor?.usuario?.persona
                        ? `${item.instructor.usuario.persona.nombres} ${item.instructor.usuario.persona.apellidos}`
                        : "Sin datos"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="obs-empty-historial">
                  No hay observaciones disponibles para este aprendiz.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setMostrarHistorial(false)}>
                <X size={16} strokeWidth={2.3} />
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

