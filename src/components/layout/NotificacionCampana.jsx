import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Info,
  MessageSquareWarning,
  Stethoscope,
  X
} from "lucide-react";
import {
  marcarNotificacionLeida,
  marcarTodasComoLeidas,
  obtenerNotificaciones,
  resolverJustificacionAsistencia
} from "../../services/alertasService";
import "./notificaciones.css";

function tiempoRelativo(fecha) {
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 1) return "Ahora mismo";
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  return `Hace ${Math.floor(horas / 24)} días`;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function leerJsonSeguro(valor) {
  if (!valor || typeof valor !== "string") return valor || {};
  try {
    return JSON.parse(valor);
  } catch {
    return {};
  }
}

function extraerPayloadNotificacion(notificacion = {}) {
  return leerJsonSeguro(
    notificacion.data ||
    notificacion.metadata ||
    notificacion.detalle ||
    notificacion.payload ||
    {}
  );
}

function primerValor(...valores) {
  return valores.find((valor) => valor !== null && valor !== undefined && valor !== "") || "";
}

function primerTexto(...valores) {
  return valores
    .map((valor) => {
      if (typeof valor === "string" || typeof valor === "number") return String(valor);
      return "";
    })
    .find((valor) => valor.trim() !== "") || "";
}

function normalizarTipo(tipo) {
  const valor = normalizarTexto(tipo);
  if (valor.includes("justificacion") || valor.includes("excusa")) return "JUSTIFICACION";
  if (valor.includes("manual")) return "MANUAL";
  return String(tipo || "SISTEMA").toUpperCase();
}

function obtenerNombreAprendiz(notificacion, payload) {
  const aprendiz = payload.aprendiz || notificacion.aprendiz || {};
  const persona = aprendiz.usuario?.persona || aprendiz.persona || {};
  const nombrePersona = `${persona.nombres || ""} ${persona.apellidos || ""}`.trim();
  return primerTexto(
    notificacion.aprendiz_nombre,
    notificacion.aprendizNombre,
    payload.aprendiz_nombre,
    payload.aprendizNombre,
    nombrePersona,
    typeof notificacion.aprendiz === "string" ? notificacion.aprendiz : "",
    typeof payload.aprendiz === "string" ? payload.aprendiz : "",
    aprendiz.nombre,
    aprendiz.nombre_completo
  );
}

function normalizarNotificacion(notificacion = {}) {
  const payload = extraerPayloadNotificacion(notificacion);
  const tipo = normalizarTipo(primerValor(notificacion.tipo, notificacion.tipo_notificacion, payload.tipo, payload.tipo_notificacion));
  const archivo = primerTexto(
    notificacion.archivo,
    notificacion.archivo_nombre,
    notificacion.nombre_archivo,
    payload.archivo,
    payload.archivo_nombre,
    payload.nombre_archivo
  );

  return {
    ...notificacion,
    id: primerValor(notificacion.id, notificacion.id_notificacion, payload.id, payload.id_notificacion),
    tipo,
    mensaje: primerTexto(notificacion.mensaje, payload.mensaje, "Nueva notificación"),
    fecha: primerValor(notificacion.fecha, notificacion.created_at, notificacion.createdAt, payload.fecha, payload.created_at, new Date().toISOString()),
    leida: Boolean(notificacion.leida ?? notificacion.read ?? notificacion.leido ?? payload.leida ?? payload.read),
    aprendiz: obtenerNombreAprendiz(notificacion, payload) || "Aprendiz sin nombre",
    ficha: primerTexto(notificacion.ficha, notificacion.numero_ficha, payload.ficha, payload.numero_ficha, payload.grupo?.numero_ficha, "Sin ficha"),
    hora: primerTexto(notificacion.hora, notificacion.hora_novedad, payload.hora, payload.hora_novedad, "Sin hora"),
    justificacion: primerTexto(notificacion.justificacion, notificacion.motivo, payload.justificacion?.motivo, payload.justificacion, payload.motivo, "Justificación"),
    descripcion: primerTexto(notificacion.descripcion, typeof notificacion.detalle === "string" ? notificacion.detalle : "", payload.descripcion, payload.justificacion?.descripcion, payload.detalle, payload.observacion, "Sin descripción registrada."),
    archivo,
    archivoDetalle: primerTexto(notificacion.archivoDetalle, notificacion.archivo_detalle, payload.archivoDetalle, payload.archivo_detalle, archivo ? "Archivo adjunto" : ""),
    archivoUrl: primerTexto(notificacion.archivo_url, notificacion.url_archivo, payload.archivo_url, payload.url_archivo),
    idJustificacion: primerValor(
      notificacion.idJustificacion,
      notificacion.id_justificacion,
      notificacion.justificacion_id,
      payload.idJustificacion,
      payload.id_justificacion,
      payload.justificacion_id
    ),
    data: payload,
    raw: notificacion
  };
}

function leerUsuarioActual() {
  try {
    return JSON.parse(localStorage.getItem("user_data") || "{}") || {};
  } catch {
    return {};
  }
}

function agregarValor(set, valor) {
  if (valor !== null && valor !== undefined && valor !== "") set.add(String(valor));
}

function obtenerIdentidadInstructorActual() {
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
}

function obtenerDestinatariosJustificacion(notificacion) {
  const payload = extraerPayloadNotificacion(notificacion);
  const destinatario = payload.destinatario || notificacion.destinatario || {};
  const instructor = payload.instructor || notificacion.instructor || {};
  const usuario = payload.usuario_destinatario || notificacion.usuario_destinatario || {};
  const persona = destinatario.persona || usuario.persona || instructor.usuario?.persona || {};

  return {
    idsInstructor: [
      notificacion.id_instructor_destinatario,
      notificacion.id_instructor,
      payload.id_instructor_destinatario,
      payload.id_instructor,
      destinatario.id_instructor,
      instructor.id_instructor
    ].filter(Boolean).map(String),
    idsUsuario: [
      notificacion.id_usuario_destinatario,
      payload.id_usuario_destinatario,
      destinatario.id_usuario,
      usuario.id_usuario,
      instructor.usuario?.id_usuario
    ].filter(Boolean).map(String),
    documentos: [
      notificacion.documento_destinatario,
      payload.documento_destinatario,
      persona.numero_documento
    ].filter(Boolean).map(String),
    emails: [
      notificacion.email_destinatario,
      payload.email_destinatario,
      destinatario.email,
      usuario.email,
      instructor.usuario?.email
    ].filter(Boolean).map(String)
  };
}

function esNotificacionJustificacion(notificacion) {
  return normalizarTipo(notificacion?.tipo) === "JUSTIFICACION";
}

function justificacionPerteneceInstructorActual(notificacion) {
  const identidad = obtenerIdentidadInstructorActual();
  const destinatarios = obtenerDestinatariosJustificacion(notificacion);
  const tieneDestinatario =
    destinatarios.idsInstructor.length ||
    destinatarios.idsUsuario.length ||
    destinatarios.documentos.length ||
    destinatarios.emails.length;

  if (!tieneDestinatario) return true;

  return (
    destinatarios.idsInstructor.some((valor) => identidad.idsInstructor.has(valor)) ||
    destinatarios.idsUsuario.some((valor) => identidad.idsUsuario.has(valor)) ||
    destinatarios.documentos.some((valor) => identidad.documentos.has(valor)) ||
    destinatarios.emails.some((valor) => identidad.emails.has(valor))
  );
}

function debeMostrarNotificacion(notificacion, esInstructor) {
  if (!esNotificacionJustificacion(notificacion)) return true;
  return esInstructor && justificacionPerteneceInstructorActual(notificacion);
}

export default function NotificacionCampana({ esCoordinador = false }) {
  const esInstructor = !esCoordinador;
  const [notificaciones, setNotificaciones] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [justificacion, setJustificacion] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [resultado, setResultado] = useState("");
  const [loading, setLoading] = useState(false);
  const [procesandoJustificacion, setProcesandoJustificacion] = useState(false);
  const [errorJustificacion, setErrorJustificacion] = useState("");
  const dropdownRef = useRef(null);

  const noLeidas = notificaciones.filter((notificacion) => !notificacion.leida).length;

  const cargarNotificaciones = useCallback(async () => {
    const { data } = await obtenerNotificaciones();
    const recibidas = Array.isArray(data) ? data : [];
    setNotificaciones(
      recibidas
        .map(normalizarNotificacion)
        .filter((notificacion) => debeMostrarNotificacion(notificacion, esInstructor))
    );
  }, [esInstructor]);

  useEffect(() => {
    const inicial = setTimeout(cargarNotificaciones, 0);
    const interval = setInterval(cargarNotificaciones, 60000);
    return () => {
      clearTimeout(inicial);
      clearInterval(interval);
    };
  }, [cargarNotificaciones]);

  useEffect(() => {
    function cerrarAlHacerClickAfuera(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", cerrarAlHacerClickAfuera);
    return () => document.removeEventListener("mousedown", cerrarAlHacerClickAfuera);
  }, [isOpen]);

  useEffect(() => {
    function cerrarConEscape(event) {
      if (event.key === "Escape") setJustificacion(null);
    }
    if (justificacion) {
      document.addEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = "";
    };
  }, [justificacion]);

  async function abrirNotificacion(notificacion) {
    setIsOpen(false);
    if (esNotificacionJustificacion(notificacion)) {
      if (!notificacion.leida && notificacion.id) {
        await marcarNotificacionLeida(notificacion.id).catch(() => null);
      }
      setNotificaciones((actuales) =>
        actuales.map((item) =>
          item.id === notificacion.id ? { ...item, leida: true } : item
        )
      );
      setResultado("");
      setObservacion("");
      setErrorJustificacion("");
      setJustificacion({ ...notificacion, leida: true });
      return;
    }
    if (!notificacion.leida) {
      await marcarNotificacionLeida(notificacion.id);
      await cargarNotificaciones();
    }
  }

  async function marcarTodas() {
    setLoading(true);
    await marcarTodasComoLeidas();
    await cargarNotificaciones();
    setLoading(false);
  }

  async function resolverJustificacion(decision) {
    if (!justificacion || procesandoJustificacion) return;
    const aceptada = decision === "ACEPTADA";

    setProcesandoJustificacion(true);
    setErrorJustificacion("");

    const { error } = await resolverJustificacionAsistencia(justificacion, decision, observacion.trim());
    if (error) {
      setErrorJustificacion(error);
      setProcesandoJustificacion(false);
      return;
    }

    setResultado(aceptada ? "Justificado" : "Ausente");
    setNotificaciones((actuales) => actuales.filter((item) => item.id !== justificacion.id));
    await cargarNotificaciones().catch(() => null);
    setProcesandoJustificacion(false);
  }

  const claseResultadoJustificacion = resultado === "Ausente" ? "ausente" : resultado === "Justificado" ? "justificado" : "";

  return (
    <>
      <div className="notif-container" ref={dropdownRef}>
        <button
          className={`notif-btn ${esCoordinador ? "coordinador" : ""} ${isOpen ? "active" : ""}`}
          type="button"
          onClick={() => setIsOpen((abierto) => !abierto)}
          aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ""}`}
          aria-expanded={isOpen}
        >
          <Bell size={22} />
          {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
        </button>

        {isOpen && (
          <div className="notif-dropdown">
            <div className="notif-header">
              <h3>Notificaciones</h3>
              <span>{noLeidas} pendiente{noLeidas === 1 ? "" : "s"}</span>
            </div>

            <div className="notif-list">
              {notificaciones.length ? (
                notificaciones.slice(0, 5).map((notificacion) => (
                  <button
                    type="button"
                    key={notificacion.id}
                    className={`notif-item ${!notificacion.leida ? "unread" : ""}`}
                    onClick={() => abrirNotificacion(notificacion)}
                  >
                    <span className={`notif-icon-box ${normalizarTexto(notificacion.tipo)}`}>
                      {esNotificacionJustificacion(notificacion) ? <Stethoscope size={17} /> :
                        notificacion.tipo === "MANUAL" ? <MessageSquareWarning size={17} /> :
                          <Info size={17} />}
                    </span>
                    <span className="notif-content">
                      <strong>{esNotificacionJustificacion(notificacion) ? "Justificación del aprendiz" : "Nueva notificación"}</strong>
                      <span className="notif-msg">{notificacion.mensaje}</span>
                      <span className="notif-time"><Clock size={11} /> {tiempoRelativo(notificacion.fecha)}</span>
                    </span>
                    {!notificacion.leida && <span className="notif-dot" />}
                  </button>
                ))
              ) : (
                <div className="notif-empty">
                  <BellOff size={32} />
                  <p>No tienes notificaciones pendientes</p>
                </div>
              )}
            </div>

            {notificaciones.length > 0 && (
              <div className="notif-footer">
                <button className="notif-btn-readall" type="button" onClick={marcarTodas} disabled={loading || noLeidas === 0}>
                  <CheckCheck size={14} /> {loading ? "Procesando..." : "Marcar todas como leídas"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {justificacion && createPortal(
        <div className="justificacion-overlay" onMouseDown={(event) => event.target === event.currentTarget && setJustificacion(null)}>
          <section className="justificacion-modal" role="dialog" aria-modal="true" aria-labelledby="justificacion-title">
            <header className="justificacion-header">
              <span className="justificacion-header-icon"><Bell size={21} /></span>
              <div>
                <h2 id="justificacion-title">Novedad del aprendiz</h2>
                <p>Solicitud pendiente de revisión</p>
              </div>
              <span className={`justificacion-estado ${resultado ? "resuelta" : ""} ${claseResultadoJustificacion}`}>
                {resultado || "Pendiente"}
              </span>
              <button className="justificacion-cerrar" type="button" onClick={() => setJustificacion(null)} aria-label="Cerrar ventana">
                <X size={20} />
              </button>
            </header>

            <div className="justificacion-body">
              {resultado ? (
                <div className={`justificacion-resultado ${claseResultadoJustificacion}`}>
                  <span>{resultado === "Ausente" ? <X size={30} /> : <Check size={30} />}</span>
                  <h3>Estado actualizado a {resultado}</h3>
                  <p>La decisión se guardó en el backend.</p>
                  {observacion && <blockquote>"{observacion}"</blockquote>}
                  <button type="button" onClick={() => setJustificacion(null)}>Cerrar</button>
                </div>
              ) : (
                <>
                  <div className="justificacion-grid">
                    <div><span>Aprendiz</span><strong>{justificacion.aprendiz}</strong></div>
                    <div><span>Ficha</span><strong>{justificacion.ficha}</strong></div>
                    <div><span>Hora de novedad</span><strong>{justificacion.hora}</strong></div>
                    <div><span>Justificación</span><strong>{justificacion.justificacion}</strong></div>
                  </div>

                  <div className="justificacion-descripcion">
                    <span>Descripción</span>
                    <p>{justificacion.descripcion}</p>
                  </div>

                  {(justificacion.archivo || justificacion.archivoUrl) && (
                    <div className="justificacion-archivo">
                      <FileText size={22} />
                      <span><strong>{justificacion.archivo || "Archivo adjunto"}</strong><small>{justificacion.archivoDetalle}</small></span>
                      <button
                        type="button"
                        title={justificacion.archivoUrl ? "Ver archivo adjunto" : "Archivo sin enlace disponible"}
                        disabled={!justificacion.archivoUrl}
                        onClick={() => justificacion.archivoUrl && window.open(justificacion.archivoUrl, "_blank", "noopener,noreferrer")}
                      >
                        <Download size={16} /> Ver archivo
                      </button>
                    </div>
                  )}

                  <label className="justificacion-observacion">
                    <span>Observación del instructor</span>
                    <textarea
                      value={observacion}
                      onChange={(event) => setObservacion(event.target.value)}
                      placeholder="Escriba aquí su observación (opcional)..."
                      maxLength={500}
                    />
                  </label>

                  <div className="justificacion-actions">
                    <button className="rechazar" type="button" onClick={() => resolverJustificacion("RECHAZADA")} disabled={procesandoJustificacion}><X size={18} /> {procesandoJustificacion ? "Procesando..." : "Rechazar"}</button>
                    <button className="aceptar" type="button" onClick={() => resolverJustificacion("ACEPTADA")} disabled={procesandoJustificacion}><Check size={18} /> {procesandoJustificacion ? "Procesando..." : "Aceptar"}</button>
                  </div>
                  {errorJustificacion && <p className="justificacion-error">{errorJustificacion}</p>}
                </>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
