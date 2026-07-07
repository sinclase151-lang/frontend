import { useEffect, useMemo, useState } from "react";
import { Edit3, Eye, Mail, Phone, Plus, Save, Search, Trash2, Upload } from "lucide-react";
import SimaPagination from "../../components/common/SimaPagination";
import "./usuario.css";

const detalleVacio = {
  id_usuario: "",
  email: "",
  nombres: "",
  apellidos: "",
  tipo_documento: "",
  numero_documento: "",
  id_rol: "",
  estado: "ACTIVO",
  telefono: ""
};

const ROLES_GESTIONABLES_COORDINADOR = new Set(["aprendiz", "instructor"]);

function normalizarNombreRol(valor) {
  return String(valor || "").toLowerCase().trim();
}

function rolGestionablePorCoordinador(rolItem) {
  return ROLES_GESTIONABLES_COORDINADOR.has(normalizarNombreRol(rolItem?.nombre));
}

function textoError(valor, fallback = "Error al guardar el usuario") {
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

export default function Usuario() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [busquedaDocumento, setBusquedaDocumento] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalCargaMasivaAbierto, setModalCargaMasivaAbierto] = useState(false);
  const [archivoCargaMasiva, setArchivoCargaMasiva] = useState(null);
  const [usuarioDetalle, setUsuarioDetalle] = useState(null);
  const [detalleModoEdicion, setDetalleModoEdicion] = useState(false);
  const [detalleForm, setDetalleForm] = useState(detalleVacio);
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [areaSeleccionada, setAreaSeleccionada] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errorUsuarios, setErrorUsuarios] = useState("");
  const [errorRoles, setErrorRoles] = useState("");
  const [errorGrupos, setErrorGrupos] = useState("");
  const [errorAreas, setErrorAreas] = useState("");

  const URL_USUARIOS = "/api/users";
  const URL_ROLES = "/api/roles";
  const URL_GRUPOS = "/api/groups";
  const URL_AREAS = "/api/coordinator-areas/areas";
  const USUARIOS_POR_PAGINA = 5;
  const LIMITE_CARGA_USUARIOS = 1000;
  const rolActual = normalizarNombreRol(localStorage.getItem("rol"));
  const esCoordinadorActual = rolActual === "coordinador";
  const rolesFormulario = useMemo(
    () => esCoordinadorActual ? roles.filter(rolGestionablePorCoordinador) : roles,
    [roles, esCoordinadorActual]
  );

  useEffect(() => {
    cargarUsuarios();
    cargarRoles();
    cargarGrupos();
    cargarAreas();
  }, []);

  function obtenerHeaders() {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };

    if (token && token.trim() !== "") {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function transformarUsuario(user) {
    return {
      id: user.id_usuario,
      id_usuario: user.id_usuario,
      email: user.email,
      estado: user.estado,
      nombres: user.persona?.nombres || user.nombres || "",
      apellidos: user.persona?.apellidos || user.apellidos || "",
      tipo_documento: user.persona?.tipo_documento || user.tipo_documento || "",
      numero_documento: user.persona?.numero_documento || user.numero_documento || "",
      telefono: user.persona?.telefono || user.telefono || "No registrado",
      id_rol: user.rol?.id_rol || user.id_rol || "",
      rol: user.rol,
      created_at: user.created_at
    };
  }

  async function cargarUsuarios() {
    try {
      setErrorUsuarios("");

      const token = localStorage.getItem("access") || localStorage.getItem("token");
      if (!token || token === "undefined") {
        setErrorUsuarios("Debe iniciar sesion para cargar los usuarios.");
        return;
      }

      const res = await fetch(`${URL_USUARIOS}?limit=${LIMITE_CARGA_USUARIOS}`, {
        method: "GET",
        headers: obtenerHeaders()
      });

      const responseData = await res.json().catch(() => null);

      if (!res.ok) {
        throw responseData || { message: "No se pudieron cargar los usuarios" };
      }

      const datos =
        responseData?.data?.usuarios ||
        responseData?.data?.users ||
        responseData?.data ||
        responseData?.results ||
        (Array.isArray(responseData) ? responseData : []);

      const usuariosTransformados = datos.map(transformarUsuario);
      setUsuarios(usuariosTransformados);
      setUsuariosFiltrados(usuariosTransformados);
      setPaginaActual(1);
    } catch (error) {
      console.error(error);
      setErrorUsuarios(error?.message || "Error al cargar los usuarios");
    }
  }

  async function cargarRoles() {
    try {
      setErrorRoles("");
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      if (!token) {
        setErrorRoles("Debe iniciar sesion para cargar los roles.");
        return;
      }

      const res = await fetch(URL_ROLES, {
        method: "GET",
        headers: obtenerHeaders()
      });

      const responseData = await res.json().catch(() => null);
      if (!res.ok) {
        throw responseData || { message: "No se pudieron cargar los roles" };
      }

      const datos =
        responseData?.data?.roles ||
        responseData?.data ||
        responseData?.results ||
        (Array.isArray(responseData) ? responseData : []);

      setRoles(datos);
    } catch (error) {
      console.error(error);
      setErrorRoles(error?.message || "Error al cargar los roles");
    }
  }

  async function cargarGrupos() {
    try {
      setErrorGrupos("");
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      if (!token) {
        setErrorGrupos("Debe iniciar sesion para cargar las fichas.");
        return;
      }

      const res = await fetch(`${URL_GRUPOS}?estado=ACTIVO&limit=1000`, {
        method: "GET",
        headers: obtenerHeaders()
      });

      const responseData = await res.json().catch(() => null);
      if (!res.ok) {
        throw responseData || { message: "No se pudieron cargar las fichas activas" };
      }

      const datos =
        responseData?.data?.grupos ||
        responseData?.data ||
        responseData?.results ||
        (Array.isArray(responseData) ? responseData : []);

      setGrupos(datos);
    } catch (error) {
      console.error(error);
      setErrorGrupos(error?.message || "Error al cargar las fichas activas");
    }
  }

  async function cargarAreas() {
    try {
      setErrorAreas("");
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      if (!token) {
        setErrorAreas("Debe iniciar sesion para cargar las areas.");
        return;
      }

      const res = await fetch(URL_AREAS, {
        method: "GET",
        headers: obtenerHeaders()
      });

      const responseData = await res.json().catch(() => null);
      if (!res.ok) {
        throw responseData || { message: "No se pudieron cargar las areas de formacion" };
      }

      const datos =
        responseData?.data?.areas ||
        responseData?.areas ||
        responseData?.data ||
        responseData?.results ||
        (Array.isArray(responseData) ? responseData : []);

      setAreas(Array.isArray(datos) ? datos : []);
    } catch (error) {
      console.error(error);
      setErrorAreas(error?.message || "Error al cargar las areas de formacion");
    }
  }

  function aplicarFiltrosUsuarios({
    texto = busquedaDocumento,
    rolFiltro = filtroRol,
    estadoFiltro = filtroEstado
  } = {}) {
    const textoBusqueda = texto.trim().toLowerCase();
    const resultado = usuarios.filter((item) => {
      const documento = item.numero_documento?.toString().toLowerCase() || "";
      const nombres = item.nombres?.toLowerCase() || "";
      const apellidos = item.apellidos?.toLowerCase() || "";
      const nombreCompleto = `${nombres} ${apellidos}`.trim();
      const email = item.email?.toLowerCase() || "";
      const coincideTexto =
        !textoBusqueda ||
        documento.includes(textoBusqueda) ||
        nombres.includes(textoBusqueda) ||
        apellidos.includes(textoBusqueda) ||
        nombreCompleto.includes(textoBusqueda) ||
        email.includes(textoBusqueda);
      const coincideRol = !rolFiltro || String(item.id_rol) === String(rolFiltro);
      const coincideEstado = !estadoFiltro || String(item.estado || "").toUpperCase() === estadoFiltro;

      return coincideTexto && coincideRol && coincideEstado;
    });

    setUsuariosFiltrados(resultado);
    setPaginaActual(1);
    return resultado;
  }

  function buscarUsuarioPorDocumento() {
    const resultado = aplicarFiltrosUsuarios();
    setMensaje(
      resultado.length > 0
        ? "Busqueda realizada correctamente"
        : "No se encontraron usuarios con esos filtros"
    );
  }

  function limpiarBusqueda() {
    setBusquedaDocumento("");
    setFiltroRol("");
    setFiltroEstado("");
    setUsuariosFiltrados(usuarios);
    setPaginaActual(1);
    setMensaje("Busqueda limpiada");
  }

  function cargarUsuariosMasivo(e) {
    e.preventDefault();
    if (!archivoCargaMasiva) {
      setMensaje("Seleccione un archivo Excel para la carga masiva.");
      return;
    }
    setMensaje(`Archivo ${archivoCargaMasiva.name} listo. Falta conectar el endpoint de carga masiva de usuarios.`);
    setArchivoCargaMasiva(null);
    setModalCargaMasivaAbierto(false);
  }

  async function guardarUsuario(e) {
    e.preventDefault();
    setMensaje("");

    const token = localStorage.getItem("access") || localStorage.getItem("token");
    if (!token) {
      setMensaje("Debe iniciar sesion para crear usuarios.");
      return;
    }

    const esAprendiz = esRolAprendiz(rol);
    const esCoordinador = esRolCoordinador(rol);
    const rolSeleccionado = roles.find((item) => Number(item.id_rol) === Number(rol));

    if (esCoordinadorActual && !rolGestionablePorCoordinador(rolSeleccionado)) {
      setMensaje("El coordinador solo puede crear usuarios instructores o aprendices.");
      return;
    }

    if (esAprendiz && !grupoSeleccionado) {
      setMensaje("Debe seleccionar la ficha activa a la que pertenece el aprendiz.");
      return;
    }
    if (esCoordinador && !areaSeleccionada) {
      setMensaje("Debe seleccionar el area a la que pertenece el coordinador.");
      return;
    }

    const data = {
      email: correo.trim(),
      id_rol: parseInt(rol, 10),
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      telefono: telefono.trim()
    };

    if (esAprendiz) {
      data.id_grupo = parseInt(grupoSeleccionado, 10);
    }

    if (esCoordinador) {
      data.id_area = parseInt(areaSeleccionada, 10);
    }

    try {
      const res = await fetch(URL_USUARIOS, {
        method: "POST",
        headers: obtenerHeaders(),
        body: JSON.stringify(data)
      });

      const respuesta = await res.json().catch(() => null);
      if (!res.ok) throw respuesta || { message: "No se pudo crear el usuario" };

      setMensaje("Usuario creado correctamente");
      limpiarFormulario();
      setModalCrearAbierto(false);
      cargarUsuarios();
    } catch (error) {
      mostrarError(error);
    }
  }

  async function eliminarUsuario(id) {
    const confirmar = window.confirm("Esta seguro de eliminar este usuario?");
    if (!confirmar) return;

    try {
      const res = await fetch(`${URL_USUARIOS}/${id}`, {
        method: "DELETE",
        headers: obtenerHeaders()
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw data || { message: "No se pudo eliminar el usuario" };
      }

      setMensaje("Usuario eliminado correctamente");
      if (usuarioDetalle?.id === id) cerrarDetalle();
      cargarUsuarios();
    } catch (error) {
      console.error(error);
      setMensaje("Error al eliminar el usuario");
    }
  }

  function abrirDetalle(usuario) {
    setUsuarioDetalle(usuario);
    setDetalleForm({
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      tipo_documento: usuario.tipo_documento,
      numero_documento: usuario.numero_documento,
      id_rol: usuario.id_rol?.toString() || "",
      estado: usuario.estado || "ACTIVO",
      telefono: usuario.telefono || ""
    });
    setDetalleModoEdicion(false);
  }

  function cerrarDetalle() {
    setUsuarioDetalle(null);
    setDetalleModoEdicion(false);
    setDetalleForm(detalleVacio);
  }

  function iniciarEdicionDetalle() {
    if (!usuarioDetalle) return;
    const rolUsuario = roles.find((item) => Number(item.id_rol) === Number(usuarioDetalle.id_rol));
    if (esCoordinadorActual && !rolGestionablePorCoordinador(rolUsuario)) {
      setMensaje("El coordinador solo puede actualizar usuarios instructores o aprendices.");
      return;
    }

    setDetalleForm({
      id_usuario: usuarioDetalle.id_usuario,
      email: usuarioDetalle.email,
      nombres: usuarioDetalle.nombres,
      apellidos: usuarioDetalle.apellidos,
      tipo_documento: usuarioDetalle.tipo_documento,
      numero_documento: usuarioDetalle.numero_documento,
      id_rol: usuarioDetalle.id_rol?.toString() || "",
      estado: usuarioDetalle.estado || "ACTIVO",
      telefono: usuarioDetalle.telefono || ""
    });
    setDetalleModoEdicion(true);
  }

  function cancelarEdicionDetalle() {
    setDetalleModoEdicion(false);
    if (usuarioDetalle) {
      setDetalleForm({
        id_usuario: usuarioDetalle.id_usuario,
        email: usuarioDetalle.email,
        nombres: usuarioDetalle.nombres,
        apellidos: usuarioDetalle.apellidos,
        tipo_documento: usuarioDetalle.tipo_documento,
        numero_documento: usuarioDetalle.numero_documento,
        id_rol: usuarioDetalle.id_rol?.toString() || "",
        estado: usuarioDetalle.estado || "ACTIVO",
        telefono: usuarioDetalle.telefono || ""
      });
    }
  }

  function cambiarDetalleForm(e) {
    const { name, value } = e.target;
    setDetalleForm((actual) => ({ ...actual, [name]: value }));
  }

  async function guardarEdicionDetalle() {
    if (!usuarioDetalle) return;
    const rolSeleccionado = roles.find((item) => Number(item.id_rol) === Number(detalleForm.id_rol));

    if (esCoordinadorActual && !rolGestionablePorCoordinador(rolSeleccionado)) {
      setMensaje("El coordinador solo puede actualizar usuarios instructores o aprendices.");
      return;
    }

    const data = {
      email: detalleForm.email.trim(),
      id_rol: parseInt(detalleForm.id_rol, 10),
      tipo_documento: detalleForm.tipo_documento,
      numero_documento: detalleForm.numero_documento.trim(),
      nombres: detalleForm.nombres.trim(),
      apellidos: detalleForm.apellidos.trim()
    };

    try {
      const res = await fetch(`${URL_USUARIOS}/${usuarioDetalle.id}`, {
        method: "PUT",
        headers: obtenerHeaders(),
        body: JSON.stringify(data)
      });

      const respuesta = await res.json().catch(() => null);
      if (!res.ok) throw respuesta || { message: "No se pudo actualizar el usuario" };

      const actualizado = {
        ...usuarioDetalle,
        email: data.email,
        nombres: data.nombres,
        apellidos: data.apellidos,
        tipo_documento: data.tipo_documento,
        numero_documento: data.numero_documento,
        id_rol: data.id_rol
      };

      setUsuarioDetalle(actualizado);
      setDetalleModoEdicion(false);
      setMensaje("Usuario actualizado correctamente");
      cargarUsuarios();
    } catch (error) {
      mostrarError(error);
    }
  }

  function mostrarError(error) {
    console.error(error);
    setMensaje(textoError(error));
  }

  function limpiarFormulario() {
    setNombres("");
    setApellidos("");
    setTipoDocumento("");
    setNumeroDocumento("");
    setCorreo("");
    setTelefono("");
    setRol("");
    setGrupoSeleccionado("");
    setAreaSeleccionada("");
  }

  function limitarDigitos(valor, maximo) {
    return valor.replace(/\D/g, "").slice(0, maximo);
  }

  function obtenerNombreRol(item) {
    const rolId = item.id_rol;
    const rolEncontrado = roles.find((r) => Number(r.id_rol) === Number(rolId));
    return rolEncontrado ? rolEncontrado.nombre : item.rol?.nombre || "-";
  }

  function obtenerNombreRolPorId(idRol) {
    const rolEncontrado = roles.find((r) => Number(r.id_rol) === Number(idRol));
    return rolEncontrado?.nombre || "";
  }

  function esRolAprendiz(idRol) {
    return obtenerNombreRolPorId(idRol).toLowerCase() === "aprendiz";
  }

  function esRolCoordinador(idRol) {
    return obtenerNombreRolPorId(idRol).toLowerCase() === "coordinador";
  }

  function cambiarRolCrear(valor) {
    setRol(valor);
    if (!esRolAprendiz(valor)) {
      setGrupoSeleccionado("");
    }
    if (!esRolCoordinador(valor)) {
      setAreaSeleccionada("");
    }
  }

  function obtenerEtiquetaGrupo(item) {
    const programa =
      item.programa_formacion?.nombre_programa ||
      item.programa?.nombre_programa ||
      item.nombre_programa ||
      "Sin programa";

    return `${item.numero_ficha} - ${programa}`;
  }

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / USUARIOS_POR_PAGINA));
  const inicioPagina = (paginaActual - 1) * USUARIOS_POR_PAGINA;
  const usuariosPagina = usuariosFiltrados.slice(inicioPagina, inicioPagina + USUARIOS_POR_PAGINA);
  const desde = usuariosFiltrados.length === 0 ? 0 : inicioPagina + 1;
  const hasta = Math.min(inicioPagina + USUARIOS_POR_PAGINA, usuariosFiltrados.length);

  const detalleUsuario = useMemo(() => {
    if (!usuarioDetalle) return null;
    const fuente = detalleModoEdicion ? { ...usuarioDetalle, ...detalleForm, id_rol: detalleForm.id_rol || usuarioDetalle.id_rol } : usuarioDetalle;
    return {
      ...fuente,
      nombreCompleto: `${fuente.nombres || ""} ${fuente.apellidos || ""}`.trim() || "Usuario sin nombre",
      nombreRol: obtenerNombreRol(fuente),
      estadoTexto: `${fuente.estado || "ACTIVO"}`.toUpperCase(),
      iniciales: `${fuente.nombres?.charAt(0) || "U"}${fuente.apellidos?.charAt(0) || "S"}`
    };
  }, [usuarioDetalle, detalleForm, detalleModoEdicion, roles]);

  function cambiarPagina(nuevaPagina) {
    const paginaSegura = Math.min(Math.max(nuevaPagina, 1), totalPaginas);
    setPaginaActual(paginaSegura);
  }

  return (
    <div className="usuarios-page">
      <header className="usuarios-header">
        <div>
          <span className="usuarios-eyebrow">Administracion institucional</span>
          <h1>Gestion de usuarios</h1>
          <p>Consulta, registra y administra los usuarios que acceden a SIMA.</p>
        </div>

        <div className="usuarios-header-actions">
          <button
            type="button"
            className="usuarios-secondary-btn"
            onClick={() => setModalCargaMasivaAbierto(true)}
          >
            <Upload size={18} />
            Carga masiva
          </button>
          <button type="button" className="usuarios-primary-btn" onClick={() => setModalCrearAbierto(true)} data-testid="users-create-button">
            <Plus size={19} />
            Crear usuario
          </button>
        </div>
      </header>

      {mensaje && <div className="usuarios-alert info">{mensaje}</div>}
      {errorUsuarios && <div className="usuarios-alert danger">{errorUsuarios}</div>}
      {errorRoles && <div className="usuarios-alert warning">{errorRoles}</div>}
      {errorGrupos && <div className="usuarios-alert warning">{errorGrupos}</div>}
      {errorAreas && <div className="usuarios-alert warning">{errorAreas}</div>}

      <section className="usuarios-toolbar">
        <div className="usuarios-search">
          <Search size={19} />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o correo"
            value={busquedaDocumento}
            onChange={(e) => setBusquedaDocumento(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") buscarUsuarioPorDocumento();
            }}
          />
        </div>
        <select
          className="usuarios-select-filtro"
          value={filtroRol}
          onChange={(e) => {
            setFiltroRol(e.target.value);
            aplicarFiltrosUsuarios({ rolFiltro: e.target.value });
          }}
        >
          <option value="">Todos los roles</option>
          {roles.map((item) => (
            <option key={item.id_rol} value={item.id_rol}>{item.nombre}</option>
          ))}
        </select>
        <select
          className="usuarios-select-filtro"
          data-testid="select-usuario-estado"
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value);
            aplicarFiltrosUsuarios({ estadoFiltro: e.target.value });
          }}
          data-testid="users-filter-status"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
          <option value="BLOQUEADO">Bloqueado</option>
        </select>
        <button type="button" onClick={buscarUsuarioPorDocumento}>
          <Search size={16} />
          Buscar
        </button>
        <button type="button" className="ghost" onClick={limpiarBusqueda}>Limpiar</button>
      </section>

      <section className="usuarios-card">
        <div className="usuarios-card-header">
          <div>
            <h2>Usuarios registrados</h2>
            <p>Mostrando {desde}-{hasta} de {usuariosFiltrados.length} usuarios</p>
          </div>
        </div>

        <div className="usuarios-table-wrap">
          <table className="usuarios-table" data-testid="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Documento</th>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPagina.length > 0 ? (
                usuariosPagina.map((item) => (
                  <tr key={item.id} data-testid="users-row">
                    <td>{item.id}</td>
                    <td className="usuarios-documento">{item.tipo_documento} {item.numero_documento}</td>
                    <td>{item.nombres}</td>
                    <td>{item.apellidos}</td>
                    <td>{obtenerNombreRol(item)}</td>
                    <td>
                      <span className="usuarios-status" data-testid="users-status-badge">{item.estado || "ACTIVO"}</span>
                    </td>
                    <td>
                      <div className="usuarios-actions">
                        <button type="button" className="usuarios-icon-btn" onClick={() => abrirDetalle(item)} title="Ver detalle" data-testid="users-edit-button">
                          <Eye size={16} />
                        </button>
                        <button type="button" className="usuarios-icon-btn danger" onClick={() => eliminarUsuario(item.id)} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="usuarios-empty">No hay usuarios para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {usuariosFiltrados.length > 0 && (
          <SimaPagination
            desde={desde}
            hasta={hasta}
            total={usuariosFiltrados.length}
            entidad="usuarios"
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiarPagina={cambiarPagina}
          />
        )}
      </section>

      {detalleUsuario && (
        <div className="usuarios-modal-backdrop" role="presentation">
          <section className="usuarios-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detalle-usuario-title">
            <div className="usuarios-detail-topbar">
              <div>
                <span className="usuarios-eyebrow">Detalle del usuario</span>
                <h2 id="detalle-usuario-title">{detalleUsuario.nombreCompleto}</h2>
                <p>{detalleUsuario.nombreRol}</p>
              </div>
            </div>

            <div className="usuarios-detail-layout">
              <aside className="usuarios-detail-profile-card">
                <div className="usuarios-detail-avatar">{detalleUsuario.iniciales}</div>
                <span className="usuarios-detail-status-pill">{detalleUsuario.estadoTexto}</span>
                <strong>{detalleUsuario.nombreCompleto}</strong>
                <p>{detalleUsuario.email}</p>
              </aside>

              <div className="usuarios-detail-main">
                <div className="usuarios-detail-grid">
                  <div className="usuarios-detail-field">
                    <span>ID</span>
                    <strong>{detalleUsuario.id}</strong>
                  </div>
                  <div className="usuarios-detail-field">
                    <span>Estado</span>
                    <strong>{detalleUsuario.estadoTexto}</strong>
                  </div>
                  <div className="usuarios-detail-field">
                    <span>Documento</span>
                    {detalleModoEdicion ? (
                      <input name="numero_documento" value={detalleForm.numero_documento} onChange={cambiarDetalleForm} />
                    ) : (
                      <strong>{detalleUsuario.numero_documento || "-"}</strong>
                    )}
                  </div>
                  <div className="usuarios-detail-field">
                    <span>Tipo</span>
                    {detalleModoEdicion ? (
                      <select name="tipo_documento" value={detalleForm.tipo_documento} onChange={cambiarDetalleForm}>
                        <option value="CC">Cedula de ciudadania</option>
                        <option value="TI">Tarjeta de identidad</option>
                        <option value="CE">Cedula de extranjeria</option>
                        <option value="PPT">Permiso por Proteccion Temporal</option>
                        <option value="PAS">Pasaporte</option>
                      </select>
                    ) : (
                      <strong>{detalleUsuario.tipo_documento || "-"}</strong>
                    )}
                  </div>
                  <div className="usuarios-detail-field">
                    <span>Nombres</span>
                    {detalleModoEdicion ? (
                      <input name="nombres" value={detalleForm.nombres} onChange={cambiarDetalleForm} />
                    ) : (
                      <strong>{detalleUsuario.nombres || "-"}</strong>
                    )}
                  </div>
                  <div className="usuarios-detail-field">
                    <span>Apellidos</span>
                    {detalleModoEdicion ? (
                      <input name="apellidos" value={detalleForm.apellidos} onChange={cambiarDetalleForm} />
                    ) : (
                      <strong>{detalleUsuario.apellidos || "-"}</strong>
                    )}
                  </div>
                  <div className="usuarios-detail-field usuarios-detail-field-full">
                    <span>Rol</span>
                    {detalleModoEdicion ? (
                      <select name="id_rol" value={detalleForm.id_rol} onChange={cambiarDetalleForm}>
                        <option value="">Seleccione</option>
                        {rolesFormulario.map((item) => (
                          <option key={item.id_rol} value={item.id_rol}>{item.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <strong>{detalleUsuario.nombreRol}</strong>
                    )}
                  </div>
                </div>

                <div className="usuarios-detail-contact-list">
                  <div className="usuarios-detail-contact-item">
                    <Mail size={18} />
                    {detalleModoEdicion ? (
                      <input name="email" type="email" value={detalleForm.email} onChange={cambiarDetalleForm} />
                    ) : (
                      <span>{detalleUsuario.email || "No registrado"}</span>
                    )}
                  </div>
                  <div className="usuarios-detail-contact-item">
                    <Phone size={18} />
                    <span>{detalleUsuario.telefono || "No registrado"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="usuarios-detail-footer">
              {detalleModoEdicion ? (
                <>
                  <button type="button" className="usuarios-secondary-btn" onClick={cancelarEdicionDetalle}>Cancelar</button>
                  <button type="button" className="usuarios-primary-btn" onClick={guardarEdicionDetalle} data-testid="users-save-button">
                    <Save size={16} />
                    Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="usuarios-primary-btn" onClick={iniciarEdicionDetalle}>
                    <Edit3 size={16} />
                    Editar
                  </button>
                  <button type="button" className="usuarios-secondary-btn" onClick={cerrarDetalle}>Cerrar</button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {modalCrearAbierto && (
        <div className="usuarios-modal-backdrop" role="presentation">
          <section className="usuarios-modal" role="dialog" aria-modal="true" aria-labelledby="crear-usuario-title">
            <div className="usuarios-modal-header">
              <div>
                <span className="usuarios-eyebrow">Nuevo registro</span>
                <h2 id="crear-usuario-title">Crear usuario</h2>
                <p>La contrasena inicial sera el numero de documento.</p>
              </div>
            </div>

            <form onSubmit={guardarUsuario} className="usuarios-form">
              <div className="usuarios-form-grid">
                <label>
                  <span>Nombres</span>
                  <input type="text" placeholder="Ej. Maria" value={nombres} onChange={(e) => setNombres(e.target.value)} required />
                </label>
                <label>
                  <span>Apellidos</span>
                  <input type="text" placeholder="Ej. Torres" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
                </label>
              </div>

              <div className="usuarios-form-grid">
                <label>
                  <span>Tipo de documento</span>
                  <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} required>
                    <option value="">Seleccione</option>
                    <option value="CC">Cedula de ciudadania</option>
                    <option value="TI">Tarjeta de identidad</option>
                    <option value="CE">Cedula de extranjeria</option>
                    <option value="PPT">Permiso por Proteccion Temporal</option>
                    <option value="PAS">Pasaporte</option>
                  </select>
                </label>
                <label>
                  <span>Numero de documento</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={15}
                    minLength={8}
                    pattern="[0-9]{8,15}"
                    placeholder="Numero de cedula"
                    title="Ingrese entre 8 y 15 digitos numericos"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(limitarDigitos(e.target.value, 15))}
                    required
                  />
                </label>
              </div>

              <div className="usuarios-form-grid">
                <label>
                  <span>Correo institucional</span>
                  <input type="email" placeholder="usuario@misena.edu.co" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
                </label>
                <label>
                  <span>Celular</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    minLength={10}
                    pattern="[0-9]{10}"
                    placeholder="Numero de celular"
                    title="Ingrese 10 digitos numericos"
                    value={telefono}
                    onChange={(e) => setTelefono(limitarDigitos(e.target.value, 10))}
                    required
                  />
                </label>
              </div>

              <div className="usuarios-form-grid usuarios-form-grid-single">
                <label>
                  <span>Rol</span>
                  <select value={rol} onChange={(e) => cambiarRolCrear(e.target.value)} required>
                    <option value="">Seleccione un rol</option>
                    {rolesFormulario.map((item) => (
                      <option key={item.id_rol} value={item.id_rol}>{item.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              {esRolAprendiz(rol) && (
                <div className="usuarios-form-grid usuarios-form-grid-single">
                  <label>
                    <span>Ficha activa</span>
                    <select
                      value={grupoSeleccionado}
                      onChange={(e) => setGrupoSeleccionado(e.target.value)}
                      required
                    >
                      <option value="">Seleccione la ficha del aprendiz</option>
                      {grupos.map((item) => (
                        <option key={item.id_grupo} value={item.id_grupo}>
                          {obtenerEtiquetaGrupo(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {esRolCoordinador(rol) && (
                <div className="usuarios-form-grid usuarios-form-grid-single">
                  <label>
                    <span>Area asignada</span>
                    <select
                      value={areaSeleccionada}
                      onChange={(e) => setAreaSeleccionada(e.target.value)}
                      required
                    >
                      <option value="">Seleccione el area del coordinador</option>
                      {areas.map((item) => (
                        <option key={item.id_area} value={item.id_area}>
                          {item.nombre_area || item.nombre || `Area ${item.id_area}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="usuarios-modal-actions">
                <button type="button" className="usuarios-secondary-btn" onClick={() => { limpiarFormulario(); setModalCrearAbierto(false); }}>Cancelar</button>
                <button type="submit" className="usuarios-primary-btn">Guardar usuario</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modalCargaMasivaAbierto && (
        <div className="usuarios-modal-backdrop" role="presentation">
          <section className="usuarios-modal compact" role="dialog" aria-modal="true" aria-labelledby="carga-usuarios-title">
            <div className="usuarios-modal-header">
              <div>
                <span className="usuarios-eyebrow">Carga masiva</span>
                <h2 id="carga-usuarios-title">Importar usuarios</h2>
                <p>Archivo Excel con documento, nombres, apellidos, correo, rol y estado.</p>
              </div>
            </div>

            <form className="usuarios-form" onSubmit={cargarUsuariosMasivo}>
              <label className="usuarios-upload">
                <Upload size={34} />
                <strong>{archivoCargaMasiva ? archivoCargaMasiva.name : "Seleccionar archivo"}</strong>
                <span>Formatos preparados: .xlsx, .xls</span>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => setArchivoCargaMasiva(e.target.files?.[0] || null)} />
              </label>

              <div className="usuarios-modal-actions">
                <button type="button" className="usuarios-secondary-btn" onClick={() => { setArchivoCargaMasiva(null); setModalCargaMasivaAbierto(false); }}>Cancelar</button>
                <button type="submit" className="usuarios-primary-btn">Preparar carga</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}





