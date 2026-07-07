import { useEffect, useMemo, useState } from "react";
import { Fingerprint, RefreshCw, ShieldCheck } from "lucide-react";
import {
  enrolarHuella,
  listarHuellas,
  reemplazarHuella,
  revocarHuella,
} from "../../services/biometricService";
import {
  capturarHuellaEnrolamiento,
  verificarServicioBiomini,
} from "../../services/localBiominiService";
import "./huellasBiometricas.css";

const formInicial = {
  id_usuario: "",
  id_dispositivo_enrolamiento: "",
  plantilla_biometrica_base64: "",
  calidad_captura: "80",
  dedo: "",
  motivo: "Operacion biometrica presencial validada",
};

const estadoInicialLector = {
  estado: "NO_VERIFICADO",
  detalle: "Servicio local BioMini pendiente de verificacion.",
};

export default function HuellasBiometricas() {
  const [form, setForm] = useState(formInicial);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [huellas, setHuellas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [captura, setCaptura] = useState(null);
  const [estadoLector, setEstadoLector] = useState(estadoInicialLector);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const rol = (localStorage.getItem("rol") || "").toLowerCase();
  const esInstructor = rol === "instructor";

  const huellasOrdenadas = useMemo(() => {
    return [...huellas].sort((a, b) => String(b.fecha_enrolamiento || "").localeCompare(String(a.fecha_enrolamiento || "")));
  }, [huellas]);

  useEffect(() => {
    if (!esInstructor) cargarHuellas();
  }, []);

  function actualizarCampo(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function manejarError(err, fallback) {
    const message = err?.response?.data?.message || err?.message || fallback;
    setError(message);
    setMensaje("");
  }

  async function cargarHuellas(filtros = null) {
    setCargando(true);
    setError("");
    try {
      const params = {};
      const idUsuarioFiltro = filtros?.id_usuario ?? filtroUsuario.trim();
      if (idUsuarioFiltro) params.id_usuario = String(idUsuarioFiltro).trim();
      const data = await listarHuellas(params);
      setHuellas(Array.isArray(data) ? data : []);
    } catch (err) {
      manejarError(err, "No se pudieron cargar las huellas");
    } finally {
      setCargando(false);
    }
  }

  async function verificarLector() {
    setError("");
    setEstadoLector({ estado: "VERIFICANDO", detalle: "Consultando servicio local BioMini..." });
    try {
      const data = await verificarServicioBiomini();
      setEstadoLector({
        estado: "DISPONIBLE",
        detalle: `${data.servicio || "Servicio local disponible"} - ${data.modo || "sin RAW persistente"}`,
      });
    } catch (err) {
      setEstadoLector({
        estado: "ERROR",
        detalle: err?.message || "No se pudo conectar con el servicio local BioMini.",
      });
    }
  }

  async function capturarDesdeLector() {
    setCapturando(true);
    setError("");
    setMensaje("");
    setEstadoLector({ estado: "CAPTURANDO", detalle: "Coloca el dedo en el lector BioMini..." });
    try {
      const data = await capturarHuellaEnrolamiento({
        id_dispositivo: form.id_dispositivo_enrolamiento || undefined,
      });
      setCaptura(data);
      setForm((prev) => ({
        ...prev,
        plantilla_biometrica_base64: data.plantilla_biometrica_base64,
        calidad_captura: String(data.calidad_captura ?? prev.calidad_captura),
      }));
      setEstadoLector({
        estado: "CAPTURA_OK",
        detalle: `Captura OK. Calidad ${data.calidad_captura}. Lector ${data.scanner_id || "no identificado"}.`,
      });
      setMensaje("Huella capturada en memoria. La plantilla no se muestra en pantalla.");
    } catch (err) {
      setCaptura(null);
      setForm((prev) => ({ ...prev, plantilla_biometrica_base64: "" }));
      setEstadoLector({
        estado: "ERROR",
        detalle: err?.message || "No fue posible capturar la huella.",
      });
      manejarError(err, "No fue posible capturar la huella");
    } finally {
      setCapturando(false);
    }
  }

  async function enrolar(event) {
    event.preventDefault();
    if (!form.plantilla_biometrica_base64) {
      setError("Primero captura la huella desde el servicio local BioMini.");
      return;
    }
    const idUsuario = Number(form.id_usuario);
    setCargando(true);
    setError("");
    try {
      const huellaEnrolada = await enrolarHuella({
        ...form,
        id_usuario: idUsuario,
        calidad_captura: Number(form.calidad_captura),
        id_dispositivo_enrolamiento: form.id_dispositivo_enrolamiento || null,
      });
      setMensaje(`Huella #${huellaEnrolada?.id_huella || ""} enrolada correctamente para el usuario ${idUsuario}.`);
      setFiltroUsuario(String(idUsuario));
      setForm((prev) => ({ ...formInicial, id_usuario: prev.id_usuario }));
      setCaptura(null);
      await cargarHuellas({ id_usuario: idUsuario });
    } catch (err) {
      manejarError(err, "No se pudo enrolar la huella");
    } finally {
      setCargando(false);
    }
  }

  async function revocar(idHuella) {
    if (!form.motivo || form.motivo.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      await revocarHuella(idHuella, form.motivo);
      setMensaje("Huella revocada correctamente.");
      await cargarHuellas();
    } catch (err) {
      manejarError(err, "No se pudo revocar la huella");
    } finally {
      setCargando(false);
    }
  }

  async function reemplazar(idHuella) {
    if (!form.plantilla_biometrica_base64) {
      setError("Primero captura la nueva huella desde el servicio local BioMini.");
      return;
    }
    const idUsuario = form.id_usuario ? Number(form.id_usuario) : null;
    setCargando(true);
    setError("");
    try {
      await reemplazarHuella(idHuella, {
        ...form,
        calidad_captura: Number(form.calidad_captura),
        id_dispositivo_enrolamiento: form.id_dispositivo_enrolamiento || null,
      });
      setMensaje("Huella reemplazada correctamente.");
      if (idUsuario) setFiltroUsuario(String(idUsuario));
      setForm((prev) => ({ ...formInicial, id_usuario: prev.id_usuario }));
      setCaptura(null);
      await cargarHuellas(idUsuario ? { id_usuario: idUsuario } : null);
    } catch (err) {
      manejarError(err, "No se pudo reemplazar la huella");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="bio-page">
      <section className="bio-hero">
        <div>
          <p className="bio-eyebrow">Fase 2.5</p>
          <h1>Operacion biometrica BioMini</h1>
          <p>
            Gestiona huellas institucionales desde el lector local sin pegar plantillas base64,
            sin exponer RAW y sin mostrar plantillas en pantalla.
          </p>
        </div>
        <ShieldCheck size={52} />
      </section>

      <section className="bio-grid">
        <form className="bio-card" onSubmit={enrolar}>
          <div className="bio-card-title">
            <Fingerprint />
            <h2>Enrolar huella</h2>
          </div>

          <label>
            ID usuario
            <input name="id_usuario" value={form.id_usuario} onChange={actualizarCampo} required />
          </label>
          <label>
            Dispositivo de enrolamiento
            <input name="id_dispositivo_enrolamiento" value={form.id_dispositivo_enrolamiento} onChange={actualizarCampo} placeholder="Opcional: ID o codigo" />
          </label>
          <label>
            Calidad de captura
            <input name="calidad_captura" type="number" min="0" max="100" value={form.calidad_captura} onChange={actualizarCampo} required readOnly={Boolean(captura)} />
          </label>
          <label>
            Dedo
            <input name="dedo" value={form.dedo} onChange={actualizarCampo} placeholder="Ej: INDICE_DERECHO" />
          </label>
          <label>
            Motivo
            <textarea name="motivo" value={form.motivo} onChange={actualizarCampo} rows="2" />
          </label>

          <div className={`bio-reader-status ${estadoLector.estado.toLowerCase()}`}>
            <strong>Estado lector: {estadoLector.estado}</strong>
            <span>{estadoLector.detalle}</span>
            {captura && (
              <small>
                Plantilla capturada en memoria: {captura.template_size} bytes - tipo {captura.template_type}
              </small>
            )}
          </div>

          <div className="bio-actions-row">
            <button type="button" className="secondary" onClick={verificarLector} disabled={capturando || cargando}>
              Verificar lector
            </button>
            <button type="button" className="secondary" onClick={capturarDesdeLector} disabled={capturando || cargando}>
              {capturando ? "Capturando..." : "Capturar desde BioMini"}
            </button>
          </div>

          <button type="submit" disabled={cargando || capturando || !form.plantilla_biometrica_base64}>Enrolar huella</button>
        </form>

        <section className="bio-card">
          <div className="bio-card-title">
            <RefreshCw />
            <h2>Huellas registradas</h2>
          </div>
          <div className="bio-filter">
            <input value={filtroUsuario} onChange={(event) => setFiltroUsuario(event.target.value)} placeholder="Filtrar por ID usuario" />
            <button type="button" onClick={cargarHuellas} disabled={cargando}>Consultar</button>
          </div>

          {mensaje && <div className="bio-message ok">{mensaje}</div>}
          {error && <div className="bio-message error">{error}</div>}

          <div className="bio-list">
            {huellasOrdenadas.map((item) => (
              <article className="bio-item" key={item.id_huella}>
                <div>
                  <strong>Huella #{item.id_huella}</strong>
                  <span>Usuario {item.id_usuario} - {item.estado} - Calidad {item.calidad_captura}</span>
                  <small>{item.dedo || "Dedo no especificado"} - Hash {String(item.plantilla_hash || "").slice(0, 12)}...</small>
                </div>
                {item.estado === "ACTIVA" && (
                  <div className="bio-actions">
                    <button type="button" onClick={() => revocar(item.id_huella)} disabled={cargando}>Revocar</button>
                    <button type="button" onClick={() => reemplazar(item.id_huella)} disabled={cargando || !form.plantilla_biometrica_base64}>Reemplazar</button>
                  </div>
                )}
              </article>
            ))}
            {!huellasOrdenadas.length && <p className="bio-empty">Sin huellas para mostrar.</p>}
          </div>
        </section>
      </section>
    </div>
  );
}
