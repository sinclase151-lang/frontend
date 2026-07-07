import { useEffect, useMemo, useRef, useState } from "react";
import { Edit3, Eye, FileSpreadsheet, Mail, Phone, Plus, Save, Search, Trash2, Upload } from "lucide-react";
import { toast } from "react-toastify";
import SimaPagination from "../../components/common/SimaPagination";
import "./registroAprendices.css";

const detalleVacio = {
  id_aprendiz: "",
  id_usuario: "",
  nombres: "",
  apellidos: "",
  tipo_documento: "",
  numero_documento: "",
  email: "",
  telefono: "",
  numero_ficha: "",
  estado: "ACTIVO"
};

function textoError(valor, fallback = "Ocurrio un error inesperado.") {
  if (!valor) return fallback;
  if (typeof valor === "string") return valor;
  if (Array.isArray(valor)) return valor.map((item) => textoError(item, "")).filter(Boolean).join(" | ") || fallback;
  if (typeof valor === "object") {
    if (valor.message) return textoError(valor.message, fallback);
    if (valor.error) return textoError(valor.error, fallback);
    if (valor.detail) return textoError(valor.detail, fallback);
    if (valor.errores) return textoError(valor.errores, fallback);
    if (valor.errors) return textoError(valor.errors, fallback);
    return JSON.stringify(valor);
  }
  return String(valor);
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

function esInstructorSesionActual() {
  const rol = (localStorage.getItem("rol") || "").toLowerCase();
  return rol === "instructor" || rol === "instructor_lider" || rol === "instructor_asignado";
}

function esGrupoLideradoPorInstructorActual(grupo) {
  const idsInstructor = obtenerIdsInstructorActual();
  if (!idsInstructor.size) return false;

  const candidatos = [
    grupo?.id_instructor_lider,
    grupo?.instructor_lider?.id_instructor,
    grupo?.instructor?.id_instructor,
  ].filter(Boolean).map(String);

  return candidatos.some((id) => idsInstructor.has(id));
}

function ConfirmacionEliminarAprendiz({ nombre, onConfirmar, onCancelar }) {
  return (
    <div className="aprendices-confirm-toast">
      <div>
        <strong>¿Seguro que quieres inactivar este aprendiz?</strong>
        <span>{nombre || "El aprendiz"} se marcará como inactivo.</span>
      </div>
      <div className="aprendices-confirm-toast-actions">
        <button type="button" className="aprendices-confirm-cancel" onClick={onCancelar}>
          No
        </button>
        <button type="button" className="aprendices-confirm-danger" onClick={onConfirmar}>
          Sí
        </button>
      </div>
    </div>
  );
}

export default function Aprendices() {
  const [aprendices, setAprendices] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalIndividual, setModalIndividual] = useState(false);
  const [modalMasivo, setModalMasivo] = useState(false);
  const mensajeErrorRef = useRef(false);
  const setMensajeError = (valor) => { mensajeErrorRef.current = Boolean(valor); };
  const setMensaje = (texto) => {
    if (!texto) return;
    const tipo = mensajeErrorRef.current ? "error" : "success";
    toast[tipo](texto, { autoClose: 3200, closeOnClick: true });
  };
  const [aprendizDetalle, setAprendizDetalle] = useState(null);
  const [detalleModoEdicion, setDetalleModoEdicion] = useState(false);
  const [detalleForm, setDetalleForm] = useState(detalleVacio);

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    tipo_documento: "",
    numero_documento: "",
    email: "",
    telefono: "",
    numero_ficha: ""
  });

  const [archivo, setArchivo] = useState(null);
  const [errores, setErrores] = useState({});

  const API_URL = "/api";
  const URL_USERS = `${API_URL}/users`;
  const URL_APRENDICES_REGISTRO = `${API_URL}/apprentices/registro`;
  const URL_APRENDICES_MASIVO = `${API_URL}/apprentices/registro-masivo`;
  const URL_GRUPOS_ACTIVOS = `${API_URL}/apprentices/grupos-activos`;
  const APRENDICES_POR_PAGINA = 5;

  function getHeaders(json = true) {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    const headers = {};
    if (json) headers["Content-Type"] = "application/json";
    if (token && token !== "undefined") headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function normalizarAprendiz(item) {
    const usuario = item.usuario || {};
    const persona = usuario.persona || item.persona || {};
    const grupoActivo =
      item.aprendiz_grupos?.find((aprendizGrupo) => aprendizGrupo.estado === "ACTIVO")?.grupo ||
      item.grupo ||
      {};
    const numeroFicha = grupoActivo.numero_ficha || grupoActivo.numero_grupo || item.numero_ficha || item.grupo || "-";

    return {
      id: item.id_aprendiz || item.id_usuario || item.id,
      id_aprendiz: item.id_aprendiz || item.id || "",
      id_usuario: usuario.id_usuario || item.id_usuario || "",
      nombres: persona.nombres || item.nombres || "",
      apellidos: persona.apellidos || item.apellidos || "",
      tipo_documento: persona.tipo_documento || item.tipo_documento || "",
      numero_documento: persona.numero_documento || item.numero_documento || "",
      email: usuario.email || item.email || item.correo || "",
      telefono: persona.telefono || item.telefono || "",
      grupo: numeroFicha,
      numero_ficha: numeroFicha,
      estado: usuario.estado || item.estado || "ACTIVO"
    };
  }

  async function cargarGrupos() {
    try {
      const res = await fetch(URL_GRUPOS_ACTIVOS, { headers: getHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(textoError(data, "No fue posible cargar los grupos activos"));
      }

      const data = await res.json().catch(() => null);
      const lista = data?.data || data?.results || (Array.isArray(data) ? data : []);
      const gruposActivos = Array.isArray(lista) ? lista : [];
      const gruposPermitidos = esInstructorSesionActual()
        ? gruposActivos.filter(esGrupoLideradoPorInstructorActual)
        : gruposActivos;
      setGrupos(gruposPermitidos);
      return gruposPermitidos;
    } catch (error) {
      setGrupos([]);
      setMensajeError(true);
      setMensaje(error.message || "No fue posible cargar los grupos activos.");
      return [];
    }
  }

  async function cargarAprendicesDesdeGrupos(gruposActivos) {
    const headers = getHeaders();
    const respuestas = await Promise.all(
      gruposActivos.map(async (grupo) => {
        const idGrupo = grupo.id_grupo || grupo.id;
        if (!idGrupo) return [];

        try {
          const res = await fetch(`${API_URL}/apprentices/grupo/${idGrupo}`, { headers });
          if (!res.ok) return [];
          const data = await res.json().catch(() => null);
          const lista = data?.data?.aprendices || data?.data || [];
          return Array.isArray(lista) ? lista : [];
        } catch {
          return [];
        }
      })
    );

    const mapa = new Map();
    respuestas.flat().forEach((item) => {
      const aprendiz = normalizarAprendiz(item);
      const key = aprendiz.numero_documento || aprendiz.id;
      if (!mapa.has(key)) {
        mapa.set(key, aprendiz);
      }
    });

    return Array.from(mapa.values());
  }

  async function cargarAprendices(gruposActivos) {
    const fallback = await cargarAprendicesDesdeGrupos(gruposActivos);
    setAprendices(fallback);
    setPaginaActual(1);
    setMensajeError(false);
    setMensaje("");
  }

  useEffect(() => {
    async function cargarTodo() {
      const gruposActivos = await cargarGrupos();
      await cargarAprendices(gruposActivos);
    }

    cargarTodo();
  }, []);

  const aprendicesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return aprendices;

    return aprendices.filter((item) =>
      `${item.nombres} ${item.apellidos} ${item.numero_documento} ${item.email} ${item.grupo}`
        .toLowerCase()
        .includes(texto)
    );
  }, [aprendices, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(aprendicesFiltrados.length / APRENDICES_POR_PAGINA));
  const inicioPagina = (paginaActual - 1) * APRENDICES_POR_PAGINA;
  const aprendicesPagina = aprendicesFiltrados.slice(inicioPagina, inicioPagina + APRENDICES_POR_PAGINA);
  const desde = aprendicesFiltrados.length === 0 ? 0 : inicioPagina + 1;
  const hasta = Math.min(inicioPagina + APRENDICES_POR_PAGINA, aprendicesFiltrados.length);

  function cambiarPagina(nuevaPagina) {
    setPaginaActual(Math.min(Math.max(nuevaPagina, 1), totalPaginas));
  }

  function cambiarCampo(e) {
    const { name, value } = e.target;
    setForm((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: "" }));
  }

  function limpiarFormulario() {
    setForm({
      nombres: "",
      apellidos: "",
      tipo_documento: "",
      numero_documento: "",
      email: "",
      telefono: "",
      numero_ficha: ""
    });
    setErrores({});
  }

  function abrirDetalle(aprendiz) {
    setAprendizDetalle(aprendiz);
    setDetalleForm({
      id_aprendiz: aprendiz.id_aprendiz,
      id_usuario: aprendiz.id_usuario,
      nombres: aprendiz.nombres,
      apellidos: aprendiz.apellidos,
      tipo_documento: aprendiz.tipo_documento,
      numero_documento: aprendiz.numero_documento,
      email: aprendiz.email,
      telefono: aprendiz.telefono || "",
      numero_ficha: aprendiz.numero_ficha,
      estado: aprendiz.estado || "ACTIVO"
    });
    setDetalleModoEdicion(false);
  }

  function cerrarDetalle() {
    setAprendizDetalle(null);
    setDetalleModoEdicion(false);
    setDetalleForm(detalleVacio);
  }

  function iniciarEdicionDetalle() {
    if (!aprendizDetalle) return;
    abrirDetalle(aprendizDetalle);
    setDetalleModoEdicion(true);
  }

  function cancelarEdicionDetalle() {
    setDetalleModoEdicion(false);
    if (aprendizDetalle) abrirDetalle(aprendizDetalle);
  }

  function cambiarDetalleForm(e) {
    const { name, value } = e.target;
    setDetalleForm((actual) => ({ ...actual, [name]: value }));
  }

  function validarIndividual() {
    const nuevosErrores = {};
    if (!form.nombres.trim()) nuevosErrores.nombres = "Campo obligatorio";
    if (!form.apellidos.trim()) nuevosErrores.apellidos = "Campo obligatorio";
    if (!form.tipo_documento) nuevosErrores.tipo_documento = "Campo obligatorio";
    if (!form.numero_documento.trim()) nuevosErrores.numero_documento = "Campo obligatorio";
    if (!form.email.trim()) nuevosErrores.email = "Campo obligatorio";
    if (!form.numero_ficha) nuevosErrores.numero_ficha = "Seleccione un grupo activo";

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function guardarAprendiz(e) {
    e.preventDefault();
    if (!validarIndividual()) return;

    try {
      const payload = {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        numero_ficha: form.numero_ficha
      };

      const res = await fetch(URL_APRENDICES_REGISTRO, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (res.status === 409) {
        setErrores({ numero_documento: textoError(data, "Ya existe un aprendiz con este documento") });
        return;
      }

      if (!res.ok) {
        throw new Error(textoError(data, "No fue posible registrar el aprendiz"));
      }

      setMensajeError(false);
      setMensaje("Aprendiz registrado correctamente.");
      setModalIndividual(false);
      limpiarFormulario();
      const gruposActivos = grupos.length > 0 ? grupos : await cargarGrupos();
      await cargarAprendices(gruposActivos);
    } catch (error) {
      setMensajeError(true);
      setMensaje(error.message || "Error al registrar el aprendiz");
    }
  }

  async function guardarEdicionDetalle() {
    if (!detalleForm.id_usuario) {
      setMensajeError(true);
      setMensaje("No se encontro el usuario asociado al aprendiz.");
      return;
    }

    try {
      const payload = {
        email: detalleForm.email.trim(),
        tipo_documento: detalleForm.tipo_documento,
        numero_documento: detalleForm.numero_documento.trim(),
        nombres: detalleForm.nombres.trim(),
        apellidos: detalleForm.apellidos.trim(),
        telefono: detalleForm.telefono.trim()
      };

      const res = await fetch(`${URL_USERS}/${detalleForm.id_usuario}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(textoError(data, "No fue posible actualizar el aprendiz"));

      const aprendizActualizado = {
        ...aprendizDetalle,
        ...payload,
        grupo: detalleForm.numero_ficha,
        numero_ficha: detalleForm.numero_ficha
      };

      setAprendices((actuales) =>
        actuales.map((item) =>
          item.id_usuario === detalleForm.id_usuario ? { ...item, ...aprendizActualizado } : item
        )
      );
      setAprendizDetalle(aprendizActualizado);
      setDetalleModoEdicion(false);
      setMensajeError(false);
      setMensaje("Aprendiz actualizado correctamente.");
    } catch (error) {
      setMensajeError(true);
      setMensaje(error.message || "No fue posible actualizar el aprendiz.");
    }
  }

  async function eliminarAprendiz(aprendiz) {
    if (!aprendiz.id_usuario) {
      setMensajeError(true);
      setMensaje("No se encontro el usuario asociado al aprendiz.");
      return;
    }

    const nombreAprendiz = `${aprendiz.nombres || ""} ${aprendiz.apellidos || ""}`.trim();
    let toastId;
    toastId = toast(
      <ConfirmacionEliminarAprendiz
        nombre={nombreAprendiz}
        onCancelar={() => toast.dismiss(toastId)}
        onConfirmar={() => {
          toast.dismiss(toastId);
          ejecutarEliminarAprendiz(aprendiz);
        }}
      />,
      {
        className: "aprendices-toast-shell",
        bodyClassName: "aprendices-toast-body",
        closeButton: false,
        icon: false,
        autoClose: false,
        closeOnClick: false,
      }
    );
  }

  async function ejecutarEliminarAprendiz(aprendiz) {
    try {
      const res = await fetch(`${URL_USERS}/${aprendiz.id_usuario}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(textoError(data, "No fue posible eliminar el aprendiz"));

      setAprendices((actuales) => actuales.filter((item) => item.id_usuario !== aprendiz.id_usuario));
      if (aprendizDetalle?.id_usuario === aprendiz.id_usuario) cerrarDetalle();
      setMensajeError(false);
      setMensaje("Aprendiz eliminado correctamente.");
    } catch (error) {
      setMensajeError(true);
      setMensaje(error.message || "No fue posible eliminar el aprendiz.");
    }
  }

  async function cargarArchivoMasivo(e) {
    e.preventDefault();
    if (!archivo) {
      setMensajeError(true);
      setMensaje("Seleccione un archivo Excel para cargar aprendices.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("archivo", archivo);

      const res = await fetch(URL_APRENDICES_MASIVO, {
        method: "POST",
        headers: getHeaders(false),
        body: formData
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(textoError(data, "No fue posible cargar el archivo"));

      setMensajeError(false);
      setMensaje(textoError(data.message || data, "Carga masiva procesada correctamente."));
      setModalMasivo(false);
      setArchivo(null);
      const gruposActivos = grupos.length > 0 ? grupos : await cargarGrupos();
      await cargarAprendices(gruposActivos);
    } catch (error) {
      setMensajeError(true);
      setMensaje(error.message || "Error al cargar archivo masivo");
    }
  }

  function obtenerCodigoGrupo(grupo) {
    return grupo.numero_ficha || grupo.numero_grupo || grupo.codigo || grupo.id_grupo || grupo.id;
  }

  const grupoSeleccionado = useMemo(
    () => grupos.find((grupo) => String(obtenerCodigoGrupo(grupo)) === String(form.numero_ficha)),
    [form.numero_ficha, grupos]
  );

  const detalleNombreCompleto = `${aprendizDetalle?.nombres || ""} ${aprendizDetalle?.apellidos || ""}`.trim();
  const detalleIniciales = `${aprendizDetalle?.nombres?.[0] || "A"}${aprendizDetalle?.apellidos?.[0] || "P"}`.toUpperCase();

  return (
    <div className="aprendices-page">
      <header className="aprendices-header">
        <div>
          <h1>Gestion de aprendices</h1>
          <p>Registra aprendices de forma individual o masiva y vincularlos a grupos activos.</p>
        </div>

        <div className="aprendices-header-actions">
          <button type="button" className="aprendices-secondary-btn" onClick={() => setModalMasivo(true)}>
            <Upload size={18} />
            Carga masiva
          </button>
          <button type="button" className="aprendices-primary-btn" onClick={() => setModalIndividual(true)}>
            <Plus size={18} />
            Registrar aprendiz
          </button>
        </div>
      </header>

      <section className="aprendices-toolbar">
        <div className="aprendices-search">
          <Search size={19} />
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por documento, nombre, correo o grupo"
          />
        </div>
        <button type="button" className="ghost" onClick={() => { setBusqueda(""); setPaginaActual(1); }}>
          Limpiar
        </button>
      </section>

      <section className="aprendices-card">
        <div className="aprendices-card-header">
          <div>
            <h2>Aprendices registrados</h2>
            <p>Mostrando {desde}-{hasta} de {aprendicesFiltrados.length} aprendices</p>
          </div>
        </div>

        <div className="aprendices-table-wrap">
          <table className="aprendices-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Aprendiz</th>
                <th>Correo</th>
                <th>Telefono</th>
                <th>Grupo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {aprendicesPagina.length > 0 ? (
                aprendicesPagina.map((item) => (
                  <tr key={item.id || item.numero_documento}>
                    <td className="aprendices-highlight">{item.tipo_documento} {item.numero_documento}</td>
                    <td>{item.nombres} {item.apellidos}</td>
                    <td>{item.email}</td>
                    <td>{item.telefono || "-"}</td>
                    <td>{item.grupo}</td>
                    <td><span className="aprendices-status">{item.estado}</span></td>
                    <td>
                      <div className="aprendices-actions">
                        <button type="button" className="aprendices-icon-btn" onClick={() => abrirDetalle(item)} title="Ver detalle">
                          <Eye size={16} />
                        </button>
                        <button type="button" className="aprendices-icon-btn danger" onClick={() => eliminarAprendiz(item)} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="aprendices-empty">No hay aprendices para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {aprendicesFiltrados.length > 0 && (
          <SimaPagination
            desde={desde}
            hasta={hasta}
            total={aprendicesFiltrados.length}
            entidad="aprendices"
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiarPagina={cambiarPagina}
          />
        )}
      </section>

      {aprendizDetalle && (
        <div className="aprendices-modal-backdrop" role="presentation">
          <section className="aprendices-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detalle-aprendiz-title">
            <div className="aprendices-detail-topbar">
              <div>
                <span className="aprendices-eyebrow">Detalle del aprendiz</span>
                <h2 id="detalle-aprendiz-title">{detalleNombreCompleto || "Aprendiz"}</h2>
                <p>Ficha {aprendizDetalle.numero_ficha || "Sin asignar"}</p>
              </div>
            </div>

            <div className="aprendices-detail-layout">
              <aside className="aprendices-detail-profile-card">
                <div className="aprendices-detail-avatar">{detalleIniciales}</div>
                <span className="aprendices-detail-status-pill">{aprendizDetalle.estado || "ACTIVO"}</span>
                <strong>{detalleNombreCompleto || "Aprendiz"}</strong>
                <p>{aprendizDetalle.email || "No registrado"}</p>
              </aside>

              <div className="aprendices-detail-main">
                <div className="aprendices-detail-grid">
                  <div className="aprendices-detail-field">
                    <span>ID</span>
                    <strong>{aprendizDetalle.id_aprendiz || "-"}</strong>
                  </div>
                  <div className="aprendices-detail-field">
                    <span>Estado</span>
                    <strong>{aprendizDetalle.estado || "ACTIVO"}</strong>
                  </div>
                  <div className="aprendices-detail-field">
                    <span>Documento</span>
                    {detalleModoEdicion ? (
                      <input name="numero_documento" value={detalleForm.numero_documento} onChange={cambiarDetalleForm} />
                    ) : (
                      <strong>{aprendizDetalle.numero_documento || "-"}</strong>
                    )}
                  </div>
                  <div className="aprendices-detail-field">
                    <span>Tipo</span>
                    {detalleModoEdicion ? (
                      <select name="tipo_documento" value={detalleForm.tipo_documento} onChange={cambiarDetalleForm}>
                        <option value="CC">Cedula de ciudadania</option>
                        <option value="TI">Tarjeta de identidad</option>
                        <option value="CE">Cedula de extranjeria</option>
                        <option value="PPT">Permiso por Proteccion Temporal</option>
                        <option value="PEP">Permiso Especial de Permanencia</option>
                        <option value="PA">Pasaporte</option>
                      </select>
                    ) : (
                      <strong>{aprendizDetalle.tipo_documento || "-"}</strong>
                    )}
                  </div>
                  <div className="aprendices-detail-field">
                    <span>Nombres</span>
                    {detalleModoEdicion ? (
                      <input name="nombres" value={detalleForm.nombres} onChange={cambiarDetalleForm} />
                    ) : (
                      <strong>{aprendizDetalle.nombres || "-"}</strong>
                    )}
                  </div>
                  <div className="aprendices-detail-field">
                    <span>Apellidos</span>
                    {detalleModoEdicion ? (
                      <input name="apellidos" value={detalleForm.apellidos} onChange={cambiarDetalleForm} />
                    ) : (
                      <strong>{aprendizDetalle.apellidos || "-"}</strong>
                    )}
                  </div>
                  <div className="aprendices-detail-field aprendices-detail-field-full">
                    <span>Ficha activa</span>
                    <strong>{aprendizDetalle.numero_ficha || "Sin asignar"}</strong>
                  </div>
                </div>

                <div className="aprendices-detail-contact-list">
                  <div className="aprendices-detail-contact-item">
                    <Mail size={18} />
                    {detalleModoEdicion ? (
                      <input name="email" type="email" value={detalleForm.email} onChange={cambiarDetalleForm} />
                    ) : (
                      <span>{aprendizDetalle.email || "No registrado"}</span>
                    )}
                  </div>
                  <div className="aprendices-detail-contact-item">
                    <Phone size={18} />
                    {detalleModoEdicion ? (
                      <input name="telefono" value={detalleForm.telefono} onChange={cambiarDetalleForm} />
                    ) : (
                      <span>{aprendizDetalle.telefono || "No registrado"}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="aprendices-detail-footer">
              {detalleModoEdicion ? (
                <>
                  <button type="button" className="aprendices-secondary-btn" onClick={cancelarEdicionDetalle}>Cancelar</button>
                  <button type="button" className="aprendices-primary-btn" onClick={guardarEdicionDetalle}>
                    <Save size={16} />
                    Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="aprendices-secondary-btn" onClick={iniciarEdicionDetalle}>
                    <Edit3 size={16} />
                    Editar
                  </button>
                  <button type="button" className="aprendices-primary-btn" onClick={cerrarDetalle}>Cerrar</button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {modalIndividual && (
        <div className="aprendices-modal-backdrop" role="presentation">
          <section className="aprendices-modal" role="dialog" aria-modal="true" aria-labelledby="registrar-aprendiz-title">
            <div className="aprendices-modal-header">
              <div>
                <span className="aprendices-eyebrow">Registro individual</span>
                <h2 id="registrar-aprendiz-title">Registrar aprendiz</h2>
                <p>El rol sera Aprendiz y la contrasena inicial sera el documento.</p>
              </div>
            </div>

            <form className="aprendices-form" onSubmit={guardarAprendiz}>
              <div className="aprendices-form-grid">
                <Campo label="Nombres" name="nombres" value={form.nombres} onChange={cambiarCampo} error={errores.nombres} />
                <Campo label="Apellidos" name="apellidos" value={form.apellidos} onChange={cambiarCampo} error={errores.apellidos} />
              </div>

              <div className="aprendices-form-grid">
                <label>
                  <span>Tipo de documento</span>
                  <select name="tipo_documento" value={form.tipo_documento} onChange={cambiarCampo} className={errores.tipo_documento ? "invalid" : ""}>
                    <option value="">Seleccione</option>
                    <option value="CC">Cedula de ciudadania</option>
                    <option value="TI">Tarjeta de identidad</option>
                    <option value="CE">Cedula de extranjeria</option>
                    <option value="PPT">Permiso por Proteccion Temporal</option>
                    <option value="PEP">Permiso Especial de Permanencia</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                  {errores.tipo_documento && <small className="error">{errores.tipo_documento}</small>}
                </label>
                <Campo label="Numero de documento" name="numero_documento" value={form.numero_documento} onChange={cambiarCampo} error={errores.numero_documento} />
              </div>

              <div className="aprendices-form-grid">
                <Campo label="Correo institucional" name="email" type="email" value={form.email} onChange={cambiarCampo} error={errores.email} />
                <Campo label="Telefono" name="telefono" value={form.telefono} onChange={cambiarCampo} />
              </div>

              <label>
                <span>Grupo activo</span>
                <select name="numero_ficha" value={form.numero_ficha} onChange={cambiarCampo} className={errores.numero_ficha ? "invalid" : ""}>
                  <option value="">Seleccione un grupo activo</option>
                  {grupos.map((grupo) => (
                    <option key={grupo.id_grupo || grupo.id || obtenerCodigoGrupo(grupo)} value={obtenerCodigoGrupo(grupo)}>
                      {obtenerCodigoGrupo(grupo)} - {grupo.programa_formacion?.nombre_programa || grupo.programa || "Programa de formacion"}
                    </option>
                  ))}
                </select>
                {errores.numero_ficha && <small className="error">{errores.numero_ficha}</small>}
              </label>

              <div className="aprendices-grupo-visible" aria-live="polite">
                <span>Ficha seleccionada</span>
                <strong>{form.numero_ficha || "Sin seleccionar"}</strong>
                <small>
                  {grupoSeleccionado
                    ?
                     grupoSeleccionado.programa_formacion.nombre_programa || grupoSeleccionado.programa || "Programa de formacion"
                    : "Selecciona el grupo al que pertenece el aprendiz."}
                </small>
              </div>

              <div className="aprendices-modal-actions">
                <button type="button" className="aprendices-secondary-btn" onClick={() => { limpiarFormulario(); setModalIndividual(false); }}>Cancelar</button>
                <button type="submit" className="aprendices-primary-btn">Guardar aprendiz</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modalMasivo && (
        <div className="aprendices-modal-backdrop" role="presentation">
          <section className="aprendices-modal compact" role="dialog" aria-modal="true" aria-labelledby="carga-masiva-title">
            <div className="aprendices-modal-header">
              <div>
                <span className="aprendices-eyebrow">Registro masivo</span>
                <h2 id="carga-masiva-title">Carga de archivo</h2>
                <p>Archivo Excel con las columnas tipo_documento, numero_documento, nombres, apellidos, email y numero_ficha.</p>
              </div>
            </div>

            <form className="aprendices-form" onSubmit={cargarArchivoMasivo}>
              <label className="aprendices-upload">
                <FileSpreadsheet size={34} />
                <strong>{archivo ? archivo.name : "Seleccionar archivo"}</strong>
                <span>Formatos permitidos: .xlsx, .xls</span>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
              </label>

              <div className="aprendices-modal-actions">
                <button type="button" className="aprendices-secondary-btn" onClick={() => { setArchivo(null); setModalMasivo(false); }}>Cancelar</button>
                <button type="submit" className="aprendices-primary-btn">Cargar aprendices</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Campo({ label, name, value, onChange, error, type = "text" }) {
  return (
    <label>
      <span>{label}</span>
      <input name={name} type={type} value={value} onChange={onChange} className={error ? "invalid" : ""} />
      {error && <small className="error">{error}</small>}
    </label>
  );
}

