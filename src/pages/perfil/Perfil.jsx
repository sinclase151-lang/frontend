import { useEffect, useMemo, useState } from "react";
import { Building2, Camera, Edit3, ImagePlus, Mail, Phone, Save, ShieldCheck, UserRound, X } from "lucide-react";
import "./perfil.css";

const perfilVacio = {
  email: "",
  telefono: "",
  password_actual: "",
  password_nuevo: ""
};

export default function Perfil() {
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState(perfilVacio);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [menuFotoAbierto, setMenuFotoAbierto] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensajeError, setMensajeError] = useState(false);

  function getHeaders() {
    const token = localStorage.getItem("access") || localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async function cargarPerfil() {
    try {
      setCargando(true);
      const res = await fetch("/api/profile/overview", { headers: getHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || "No fue posible cargar el perfil");

      const perfilData = data?.data || data;
      setPerfil(perfilData);
      setForm({
        email: perfilData?.email || "",
        telefono: perfilData?.persona?.telefono || "",
        password_actual: "",
        password_nuevo: ""
      });
      setMensaje("");
      setMensajeError(false);
    } catch (error) {
      setMensaje(error.message || "No fue posible cargar el perfil.");
      setMensajeError(true);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarPerfil();
  }, []);

  const nombreCompleto = useMemo(() => {
    const persona = perfil?.persona || {};
    return `${persona.nombres || ""} ${persona.apellidos || ""}`.trim() || "Usuario del sistema";
  }, [perfil]);

  const iniciales = useMemo(() => {
    return nombreCompleto
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }, [nombreCompleto]);

  const areaPrincipal = perfil?.informacion_rol?.areas_asignadas?.[0] || "";

  function cambiarFotoPerfil(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFotoPerfil(reader.result?.toString() || "");
      setMenuFotoAbierto(false);
    };
    reader.readAsDataURL(archivo);
  }

  function cambiarCampo(e) {
    const { name, value } = e.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  }

  function cancelarEdicion() {
    setModoEdicion(false);
    setForm({
      email: perfil?.email || "",
      telefono: perfil?.persona?.telefono || "",
      password_actual: "",
      password_nuevo: ""
    });
  }

  async function guardarPerfil() {
    try {
      setGuardando(true);
      const payload = {
        email: form.email.trim(),
        telefono: form.telefono.trim()
      };

      if (form.password_nuevo.trim()) {
        payload.password_actual = form.password_actual;
        payload.password_nuevo = form.password_nuevo;
      }

      const res = await fetch("/api/profile/overview", {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || "No fue posible actualizar el perfil");

      setMensaje(data?.message || "Perfil actualizado exitosamente.");
      setMensajeError(false);
      setModoEdicion(false);
      await cargarPerfil();
    } catch (error) {
      setMensaje(error.message || "No fue posible actualizar el perfil.");
      setMensajeError(true);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="perfil-page"><div className="grupos-alert info">Cargando perfil...</div></div>;
  }

  return (
    <div className="perfil-page">
      {mensaje && <div className={`grupos-alert ${mensajeError ? "danger" : "info"}`}>{mensaje}</div>}

      <section className="perfil-hero">
        <div className="perfil-avatar-wrap">
          <button
            type="button"
            className="perfil-avatar"
            onClick={() => setMenuFotoAbierto((abierto) => !abierto)}
            aria-label="Opciones de foto de perfil"
          >
            {fotoPerfil ? <img src={fotoPerfil} alt="" /> : (iniciales || "US")}
          </button>
          {menuFotoAbierto && (
            <div className="perfil-photo-menu">
              <label>
                <ImagePlus size={19} />
                Elegir foto de perfil
                <input type="file" accept="image/*" onChange={cambiarFotoPerfil} />
              </label>
              <label>
                <Camera size={19} />
                Subir foto
                <input type="file" accept="image/*" onChange={cambiarFotoPerfil} />
              </label>
              <button type="button" onClick={() => setMenuFotoAbierto(false)}>
                <X size={19} />
                Cancelar
              </button>
            </div>
          )}
        </div>
        <div className="perfil-hero-copy">
          <span className="perfil-eyebrow">Mi perfil</span>
          <h1>{nombreCompleto}</h1>
          <div className="perfil-hero-meta">
            <p>{perfil?.rol || "Usuario"}</p>
            {areaPrincipal && (
              <span className="perfil-area-pill">
                <Building2 size={16} />
                {areaPrincipal}
              </span>
            )}
          </div>
        </div>
        <div className="perfil-hero-actions">
          {modoEdicion ? (
            <>
              <button type="button" className="perfil-secondary-btn" onClick={cancelarEdicion}>Cancelar</button>
              <button type="button" className="perfil-primary-btn" onClick={guardarPerfil} disabled={guardando}>
                <Save size={16} />
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          ) : (
            <button type="button" className="perfil-icon-edit-btn" onClick={() => setModoEdicion(true)} aria-label="Editar perfil">
              <Edit3 size={16} />
            </button>
          )}
        </div>
      </section>

      <section className="perfil-grid">
        <article className="perfil-card perfil-card-main">
          <h2>Informacion personal</h2>
          <div className="perfil-fields">
            <div className="perfil-field">
              <span>Nombres</span>
              <strong>{perfil?.persona?.nombres || "-"}</strong>
            </div>
            <div className="perfil-field">
              <span>Apellidos</span>
              <strong>{perfil?.persona?.apellidos || "-"}</strong>
            </div>
            <div className="perfil-field">
              <span>Tipo de documento</span>
              <strong>{perfil?.persona?.tipo_documento || "-"}</strong>
            </div>
            <div className="perfil-field">
              <span>Numero de documento</span>
              <strong>{perfil?.persona?.numero_documento || "-"}</strong>
            </div>
            <div className="perfil-field perfil-field-full">
              <span>Correo</span>
              {modoEdicion ? (
                <input name="email" type="email" value={form.email} onChange={cambiarCampo} />
              ) : (
                <strong>{perfil?.email || "-"}</strong>
              )}
            </div>
            <div className="perfil-field perfil-field-full">
              <span>Telefono</span>
              {modoEdicion ? (
                <input name="telefono" value={form.telefono} onChange={cambiarCampo} />
              ) : (
                <strong>{perfil?.persona?.telefono || "No registrado"}</strong>
              )}
            </div>
          </div>
        </article>

        <article className="perfil-card">
          <h2>Seguridad</h2>
          <div className="perfil-security-row">
            <ShieldCheck size={20} />
            <div>
              <strong>Acceso protegido</strong>
              <span>Actualiza tu correo, telefono o contrasena desde aqui.</span>
            </div>
          </div>
          {modoEdicion && (
            <div className="perfil-security-form">
              <label>
                <span>Contrasena actual</span>
                <input name="password_actual" type="password" value={form.password_actual} onChange={cambiarCampo} />
              </label>
              <label>
                <span>Nueva contrasena</span>
                <input name="password_nuevo" type="password" value={form.password_nuevo} onChange={cambiarCampo} />
              </label>
            </div>
          )}
        </article>

        <article className="perfil-card">
          <h2>Resumen del rol</h2>
          <div className="perfil-role-list">
            <div className="perfil-role-item">
              <UserRound size={18} />
              <div>
                <strong>Rol actual</strong>
                <span>{perfil?.rol || "No definido"}</span>
              </div>
            </div>
            {perfil?.informacion_rol?.fichas_activas?.length > 0 && (
              <div className="perfil-role-item">
                <Mail size={18} />
                <div>
                  <strong>Fichas activas</strong>
                  <span>{perfil.informacion_rol.fichas_activas.join(", ")}</span>
                </div>
              </div>
            )}
            {perfil?.informacion_rol?.fichas_lideradas?.length > 0 && (
              <div className="perfil-role-item">
                <Phone size={18} />
                <div>
                  <strong>Fichas lideradas</strong>
                  <span>{perfil.informacion_rol.fichas_lideradas.join(", ")}</span>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
