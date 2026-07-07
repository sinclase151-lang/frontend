import { useEffect, useState } from "react";
import { Search, UserCheck, UserX, UserPlus, X } from "lucide-react";
import { toast } from "react-toastify";
import "./ModalAgregarInstructor.css";

const API_URL = "/api";

// â”€â”€â”€ Auth helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getHeaders() {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "undefined") headers.Authorization = `Bearer ${token}`;
  return headers;
}

// instructor.usuario.persona.{nombres, apellidos}
function getNombre(instructor) {
  const p = instructor?.usuario?.persona;
  return p ? `${p.nombres} ${p.apellidos}`.trim() : "Sin nombre";
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function ConfirmacionEstadoInstructor({ accion, nombre, onConfirmar, onCancelar }) {
  const esActivar = accion === "activar";

  return (
    <div className={`mg-confirm-toast ${esActivar ? "activar" : "inactivar"}`}>
      <div className="mg-confirm-toast-icon">
        {esActivar ? <UserCheck size={18} /> : <UserX size={18} />}
      </div>
      <div className="mg-confirm-toast-body">
        <strong>
          {esActivar ? "Â¿EstÃ¡s seguro de activar este instructor?" : "Â¿EstÃ¡s seguro de inactivar este instructor?"}
        </strong>
        <span>
          {nombre}
          {esActivar
            ? " volverÃ¡ a estar disponible en el grupo."
            : " se desvincularÃ¡ de sus horarios actuales."}
        </span>
        <div className="mg-confirm-toast-actions">
          <button type="button" className="mg-confirm-toast-cancel" onClick={onCancelar}>
            No
          </button>
          <button
            type="button"
            className={`mg-confirm-toast-confirm ${esActivar ? "activar" : "inactivar"}`}
            onClick={onConfirmar}
          >
            SÃ­
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModalAgregarInstructor({ grupo, onCerrar, onAsignacionCompleta }) {
  const [disponibles, setDisponibles] = useState([]);
  const [actuales, setActuales]       = useState([]);

  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  const [loadingActuales, setLoadingActuales]       = useState(false);

  const [busqueda, setBusqueda]         = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  const [asignando, setAsignando]             = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(null);

  const idGrupo = grupo?.id_grupo || grupo?.id;

  useEffect(() => {
    if (!idGrupo) return;
    fetchDisponibles();
    fetchActuales();
  }, [idGrupo]);

  // GET /api/groups/instructores-disponibles
  async function fetchDisponibles() {
    setLoadingDisponibles(true);
    try {
      const res = await fetch(`${API_URL}/groups/instructores-disponibles`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("No se pudieron cargar los instructores");
      const data = await res.json();
      const lista = data?.data || [];
      setDisponibles(Array.isArray(lista) ? lista : []);
    } catch (error) {
      toast.error(error.message, { autoClose: 3200, closeOnClick: true });
    } finally {
      setLoadingDisponibles(false);
    }
  }

  // GET /api/instructor-groups/grupo/:idGrupo
  async function fetchActuales() {
    setLoadingActuales(true);
    try {
      const res = await fetch(`${API_URL}/instructor-groups/grupo/${idGrupo}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("No se pudieron cargar los instructores del grupo");
      const data = await res.json();
      const lista = data?.data || [];
      setActuales(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoadingActuales(false);
    }
  }

  // POST /api/instructor-groups/grupo/:idGrupo â€” body: { id_instructor }
  async function handleAgregar() {
    if (!seleccionado) return;
    setAsignando(true);

    try {
      const res = await fetch(`${API_URL}/instructor-groups/grupo/${idGrupo}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ id_instructor: seleccionado.id_instructor }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Error al asignar instructor");

      toast.success(`Instructor "${getNombre(seleccionado)}" asignado correctamente.`, { autoClose: 2500, closeOnClick: true });
      setSeleccionado(null);
      setBusqueda("");
      await fetchActuales();
      onCerrar?.();
      onAsignacionCompleta?.(grupo);
    } catch (error) {
      toast.error(error.message, { autoClose: 3200, closeOnClick: true });
    } finally {
      setAsignando(false);
    }
  }

  // PATCH /api/instructor-groups/grupo/:idGrupo/instructor/:idInstructor
  // body: { estado: 'ACTIVO' | 'INACTIVO' }
  // â”€â”€â”€ BUG CORREGIDO: parÃ¡metro y URL usan el mismo nombre â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleCambiarEstado(id_instructor, estadoActual) {
    const nuevoEstado = estadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const instructorActual = actuales.find((item) => Number(item.id_instructor) === Number(id_instructor));
    const nombreInstructor = getNombre(instructorActual?.instructor);
    const accion = nuevoEstado === "ACTIVO" ? "activar" : "inactivar";

    let toastId;
    toastId = toast(
      <ConfirmacionEstadoInstructor
        accion={accion}
        nombre={nombreInstructor}
        onCancelar={() => toast.dismiss(toastId)}
        onConfirmar={() => {
          toast.dismiss(toastId);
          ejecutarCambioEstadoInstructor(id_instructor, nuevoEstado);
        }}
      />,
      {
        className: "mg-toast-shell",
        bodyClassName: "mg-toast-body",
        closeButton: false,
        icon: false,
      }
    );
  }

  async function ejecutarCambioEstadoInstructor(id_instructor, nuevoEstado) {
    setCambiandoEstado(id_instructor);

    try {
      const res = await fetch(
        `${API_URL}/instructor-groups/grupo/${idGrupo}/instructor/${id_instructor}`,
        //                                                               â†‘ corregido â€” antes decÃ­a ${idInstructor} (variable inexistente)
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ estado: nuevoEstado }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Error al actualizar estado");
      toast.success(`Instructor ${nuevoEstado === "ACTIVO" ? "activado" : "inactivado"} correctamente.`, {
        autoClose: 2500,
        closeOnClick: true,
      });
      await fetchActuales();
      window.dispatchEvent(
        new CustomEvent("sima:horarios-actualizados", {
          detail: { idGrupo, motivo: "estado-instructor", idInstructor: id_instructor, estado: nuevoEstado },
        })
      );
    } catch (error) {
      toast.error(error.message, { autoClose: 3200, closeOnClick: true });
    } finally {
      setCambiandoEstado(null);
    }
  }

  const idLider = Number(grupo?.id_instructor_lider);
  const idsActivos = new Set(
    actuales
      .filter((a) => a.estado === "ACTIVO")
      .map((a) => Number(a.id_instructor))
  );

  // El lÃ­der no se gestiona como instructor de apoyo (H16 + backend lo rechaza con 400)
  const actualesSinLider = actuales.filter(
    (a) => Number(a.id_instructor) !== idLider
  );

  const disponiblesFiltrados = disponibles.filter((i) => {
    if (Number(i.id_instructor) === idLider) return false;
    if (idsActivos.has(Number(i.id_instructor))) return false;
    const texto = normalizarTexto(busqueda);
    if (!texto) return true;
    return (
      normalizarTexto(getNombre(i)).includes(texto) ||
      normalizarTexto(i.especialidad || "").includes(texto)
    );
  });

  return (
    <div className="mg-modal-overlay" role="presentation">
      <div
        className="mg-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mg-modal-title"
      >
        {/* Encabezado */}
        <div className="mg-modal-header">
          <div>
            <span className="mg-modal-tag">
              FICHA {grupo?.numero_ficha || grupo?.codigo || idGrupo}
            </span>
            <h2 className="mg-modal-title" id="mg-modal-title">
              Gestionar instructores
            </h2>
            <p className="mg-modal-subtitle">
              Solo el instructor lÃ­der puede agregar o gestionar instructores de apoyo.
            </p>
          </div>
          <button
            type="button"
            className="mg-modal-close"
            onClick={onCerrar}
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* â”€â”€ SecciÃ³n 1: Instructores actuales del grupo â”€â”€ */}
        <div className="mg-seccion">
          <h3 className="mg-seccion-titulo">Instructores en el grupo</h3>

          {loadingActuales ? (
            <p className="mg-modal-empty">Cargando...</p>
          ) : actualesSinLider.length > 0 ? (
            <div className="mg-actuales-lista">
              {actualesSinLider.map((item) => (
                <div key={item.id_instructor_grupo} className="mg-actual-item">
                  <div className="mg-modal-item-info">
                    <span className="mg-modal-item-nombre">
                      {getNombre(item.instructor)}
                    </span>
                    <span className="mg-modal-item-esp">
                      {item.instructor?.especialidad || "Sin especialidad"}
                    </span>
                  </div>
                  <div className="mg-actual-acciones">
                    <span className={`mg-badge ${item.estado === "ACTIVO" ? "activo" : "inactivo"}`}>
                      {item.estado}
                    </span>
                    <button
                      type="button"
                      className={`mg-estado-btn ${item.estado === "ACTIVO" ? "desactivar" : "activar"}`}
                      disabled={cambiandoEstado === item.id_instructor}
                      onClick={() => handleCambiarEstado(item.id_instructor, item.estado)}
                      title={item.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                    >
                      {cambiandoEstado === item.id_instructor ? (
                        "..."
                      ) : item.estado === "ACTIVO" ? (
                        <UserX size={14} />
                      ) : (
                        <UserCheck size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mg-modal-empty">No hay instructores asignados aÃºn.</p>
          )}
        </div>

        <div className="mg-divider" />

        {/* â”€â”€ SecciÃ³n 2: Agregar nuevo instructor â”€â”€ */}
        <div className="mg-seccion">
          <h3 className="mg-seccion-titulo">Agregar instructor de apoyo</h3>

          <div className="mg-modal-search-wrap">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar por nombre o especialidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="mg-modal-search"
              autoFocus
            />
          </div>

          <div className="mg-modal-lista">
            {loadingDisponibles ? (
              <p className="mg-modal-empty">Cargando instructores...</p>
            ) : disponiblesFiltrados.length > 0 ? (
              disponiblesFiltrados.map((instructor) => (
                <label
                  key={instructor.id_instructor}
                  className={`mg-modal-item ${
                    seleccionado?.id_instructor === instructor.id_instructor ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="instructor"
                    checked={seleccionado?.id_instructor === instructor.id_instructor}
                    onChange={() => setSeleccionado(instructor)}
                  />
                  <div className="mg-modal-item-info">
                    <span className="mg-modal-item-nombre">{getNombre(instructor)}</span>
                    <span className="mg-modal-item-esp">
                      {instructor.especialidad || "Sin especialidad"}
                    </span>
                  </div>
                </label>
              ))
            ) : (
              <p className="mg-modal-empty">
                {busqueda
                  ? "Sin resultados"
                  : "Todos los instructores disponibles ya estÃ¡n en el grupo."}
              </p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="mg-modal-actions">
          <button
            type="button"
            className="mg-btn-primary"
            disabled={!seleccionado || asignando}
            onClick={handleAgregar}
          >
            {asignando ? (
              "Asignando..."
            ) : (
              <>
                <UserPlus size={15} />
                Agregar instructor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

