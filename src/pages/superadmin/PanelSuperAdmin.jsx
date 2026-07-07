import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Fingerprint,
  Layers,
  MonitorCog,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import "../coordinador/coordinador.css";
import "../instructor/instructor.css";
import "./superadmin.css";

const getHeaders = () => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const numero = (valor) => Number(valor || 0);
const porcentaje = (valor, total) => total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;

export default function PanelSuperAdmin() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarResumen() {
      try {
        const res = await fetch("/api/dashboard/super-admin/resumen", { headers: getHeaders() });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || data?.error || "No fue posible cargar el dashboard del super admin");
        if (activo) {
          setResumen(data?.data || null);
          setError("");
        }
      } catch (err) {
        console.error("Error cargando dashboard super admin:", err);
        if (activo) {
          setResumen(null);
          setError(err.message || "No fue posible cargar el dashboard");
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarResumen();
    return () => { activo = false; };
  }, []);

  const kpis = resumen?.kpis || {};
  const totalUsuarios = numero(kpis.total_usuarios);
  const usuariosActivos = numero(kpis.usuarios_activos);
  const totalGrupos = numero(kpis.total_grupos);
  const gruposActivos = numero(kpis.total_grupos_activos);
  const huellasActivas = numero(kpis.huellas_activas);
  const huellasRevocadas = numero(kpis.huellas_revocadas);
  const dispositivosActivos = numero(kpis.dispositivos_activos);
  const dispositivosMantenimiento = numero(kpis.dispositivos_mantenimiento);
  const alertasActivas = numero(kpis.total_alertas_activas);
  const justificacionesPendientes = numero(kpis.justificaciones_pendientes);
  const totalSeguimiento = alertasActivas + justificacionesPendientes;
  const porcentajeAlertas = porcentaje(alertasActivas, totalSeguimiento);

  const cards = [
    { titulo: "Usuarios activos", valor: usuariosActivos, detalle: `${totalUsuarios} usuarios registrados`, progreso: porcentaje(usuariosActivos, totalUsuarios), icono: UsersRound, tono: "verde" },
    { titulo: "Grupos activos", valor: gruposActivos, detalle: `${totalGrupos} grupos registrados`, progreso: porcentaje(gruposActivos, totalGrupos), icono: Layers, tono: "azul" },
    { titulo: "Huellas activas", valor: huellasActivas, detalle: `${huellasRevocadas} huellas revocadas`, progreso: porcentaje(huellasActivas, huellasActivas + huellasRevocadas), icono: Fingerprint, tono: "verde" },
    { titulo: "Dispositivos activos", valor: dispositivosActivos, detalle: `${dispositivosMantenimiento} en mantenimiento`, progreso: porcentaje(dispositivosActivos, dispositivosActivos + dispositivosMantenimiento), icono: MonitorCog, tono: "amarillo" },
  ];

  const usuariosPorRol = [
    { etiqueta: "Super admins", valor: numero(kpis.total_super_admins), color: "#7c5bd6", icono: ShieldCheck },
    { etiqueta: "Coordinadores", valor: numero(kpis.total_coordinadores), color: "#238500", icono: UserCheck },
    { etiqueta: "Instructores", valor: numero(kpis.total_instructores_activos), color: "#1687c9", icono: UsersRound },
    { etiqueta: "Aprendices", valor: numero(kpis.total_aprendices_activos), color: "#13a8b5", icono: UsersRound },
  ];

  const actividad = useMemo(() => [
    { etiqueta: "Usuarios", valor: usuariosActivos },
    { etiqueta: "Grupos", valor: gruposActivos },
    { etiqueta: "Alertas", valor: alertasActivas },
    { etiqueta: "Huellas", valor: huellasActivas },
    { etiqueta: "Dispositivos", valor: dispositivosActivos },
    { etiqueta: "Justificaciones", valor: justificacionesPendientes },
  ], [usuariosActivos, gruposActivos, alertasActivas, huellasActivas, dispositivosActivos, justificacionesPendientes]);

  const grafico = useMemo(() => {
    const maximo = Math.max(...actividad.map((item) => item.valor), 1);
    const ancho = 720;
    const alto = 170;
    const base = 190;
    const paso = ancho / (actividad.length - 1);
    const puntos = actividad.map((item, index) => ({
      ...item,
      x: 30 + (paso * index),
      y: base - ((item.valor / maximo) * alto),
    }));
    const linea = puntos.map((item, index) => `${index ? "L" : "M"}${item.x} ${item.y}`).join(" ");
    const area = `${linea} L${puntos[puntos.length - 1].x} ${base} L${puntos[0].x} ${base} Z`;
    return { puntos, linea, area, maximo };
  }, [actividad]);

  if (cargando) {
    return <div className="coordinador-panel superadmin-panel"><div className="grupos-alert info">Cargando resumen institucional...</div></div>;
  }

  return (
    <div className="coordinador-panel superadmin-panel">
      {error && <div className="grupos-alert danger">{error}</div>}

      <section className="superadmin-executive-hero">
        <div>
          <div className="superadmin-executive-title">
            <h1>Bienvenido super administrador</h1>
            <span>Vista ejecutiva</span>
          </div>
          <p>Panel de control ejecutivo del sistema de administracion institucional, biometria e IoT.</p>
        </div>
        <time><CalendarDays size={17} />{new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}</time>
      </section>

      <section className="superadmin-kpi-row superadmin-executive-kpis" aria-label="Indicadores principales">
        {cards.map((card) => {
          const Icon = card.icono;
          return (
            <article className={`coordinador-kpi-card tono-${card.tono}`} key={card.titulo}>
              <div className="coordinador-kpi-top">
                <span className="coordinador-kpi-icon"><Icon size={29} strokeWidth={2.1} /></span>
                <span className="coordinador-kpi-ring" style={{ "--kpi-progress": `${card.progreso}%` }} role="img" aria-label={`${card.progreso}% de avance`}></span>
              </div>
              <h2>{card.titulo}</h2>
              <strong>{card.valor}</strong>
              <p className={card.alerta ? "negativo" : ""}>{card.alerta ? "Atencion requerida" : "Dato actualizado"}</p>
              <small>{card.detalle}</small>
            </article>
          );
        })}
      </section>

      <section className="superadmin-overview-grid">
        <article className="coordinador-card superadmin-role-panel">
          <div className="coordinador-card-header"><div><h2>Distribucion de usuarios</h2><p>Usuarios actuales por rol en el sistema.</p></div></div>
          <div className="superadmin-role-list">
            {usuariosPorRol.map((item) => {
              const Icon = item.icono;
              return (
                <div className="coordinador-registro-item" key={item.etiqueta}>
                  <span style={{ color: item.color }}><Icon size={18} /></span>
                  <div><strong>{item.etiqueta}</strong><small>Usuarios activos registrados</small></div>
                  <strong>{item.valor}</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="coordinador-card superadmin-followup-panel">
          <div className="coordinador-card-header"><div><h2>Seguimiento actual</h2><p>Estado de alertas y justificaciones.</p></div></div>
          <div className="instructor-risk-layout superadmin-risk-layout">
            <div className="instructor-risk-donut" style={{ background: `conic-gradient(#ef4444 0 ${porcentajeAlertas}%, #f5b400 ${porcentajeAlertas}% 100%)` }}>
              <div className="instructor-risk-donut-inner"><strong>{totalSeguimiento}</strong><span>Total</span></div>
            </div>
            <div className="instructor-risk-list">
              <div className="instructor-risk-item"><span className="dot" style={{ background: "#ef4444" }}></span><p>Alertas activas</p><strong>{alertasActivas}</strong></div>
              <div className="instructor-risk-item"><span className="dot" style={{ background: "#f5b400" }}></span><p>Justificaciones</p><strong>{justificacionesPendientes}</strong></div>
            </div>
          </div>
        </article>
      </section>

      <section className="superadmin-detail-grid">
        <article className="coordinador-card superadmin-activity-panel">
          <div className="coordinador-card-header"><div><h2>Actividad actual</h2><p>Comparativo de los principales modulos del sistema.</p></div></div>
          <div className="coordinador-line-chart superadmin-line-chart">
            <div className="chart-scale"><span>{grafico.maximo}</span><span>{Math.round(grafico.maximo * .75)}</span><span>{Math.round(grafico.maximo / 2)}</span><span>{Math.round(grafico.maximo * .25)}</span><span>0</span></div>
            <svg viewBox="0 0 780 210" role="img" aria-label="Comparativo de actividad actual">
              <defs><linearGradient id="superadminArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#238500" stopOpacity=".25" /><stop offset="100%" stopColor="#238500" stopOpacity="0" /></linearGradient></defs>
              <path className="chart-area superadmin-chart-area" d={grafico.area} />
              <path className="chart-line superadmin-chart-line" d={grafico.linea} />
              {grafico.puntos.map((item) => <circle key={item.etiqueta} cx={item.x} cy={item.y} r="5"><title>{`${item.etiqueta}: ${item.valor}`}</title></circle>)}
            </svg>
            <div className="chart-months" style={{ "--chart-columns": actividad.length }}>{actividad.map((item) => <span key={item.etiqueta}>{item.etiqueta}</span>)}</div>
          </div>
        </article>

        <article className="coordinador-card superadmin-security-panel">
          <div className="coordinador-card-header"><div><h2>Seguridad y accesos</h2><p>Informacion disponible del sistema.</p></div><ShieldCheck size={21} /></div>
          <div className="superadmin-security-list">
            <div className="coordinador-estado-row"><span>Inicios de sesion fallidos</span><strong className="unavailable">Sin dato</strong></div>
            <div className="coordinador-estado-row"><span>Marcas rechazadas por geolocalizacion</span><strong className="unavailable">Sin dato</strong></div>
            <div className="coordinador-estado-row"><span>Accesos denegados por alcance</span><strong className="unavailable">Sin dato</strong></div>
            <div className="coordinador-estado-row"><span>Huellas revocadas</span><strong>{huellasRevocadas}</strong></div>
          </div>
          <p className="superadmin-security-note"><AlertTriangle size={15} /> El backend actual no entrega los tres primeros indicadores.</p>
        </article>
      </section>
    </div>
  );
}
