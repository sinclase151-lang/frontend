import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Layers,
  Megaphone,
  UserCheck,
  UsersRound
} from "lucide-react";
import "./coordinador.css";

const obtenerNumero = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") return Number.parseFloat(valor.replace("%", "")) || 0;
  return 0;
};

const calcularProgreso = (valor, maximo) => {
  const numero = obtenerNumero(valor);
  if (!numero || !maximo) return 0;
  return Math.min(100, Math.max(0, Math.round((numero / maximo) * 100)));
};

const getHeaders = () => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {})
  };
};

export default function PanelCoordinador() {
  const [resumen, setResumen] = useState(null);
  const [conteoInstructores, setConteoInstructores] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtroResumenActivo, setFiltroResumenActivo] = useState("asistencia");
  const [filtroOperativoActivo, setFiltroOperativoActivo] = useState("inasistencias");
  const [mostrarTodosProgramas, setMostrarTodosProgramas] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarResumen() {
      try {
        const res = await fetch("/api/dashboard/coordinador/resumen", {
          headers: getHeaders()
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message || data?.error || "No fue posible cargar el resumen del coordinador");
        }

        const instructoresRes = await fetch("/api/groups/instructores-disponibles", {
          headers: getHeaders()
        }).catch(() => null);

        let totalInstructores = 0;
        if (instructoresRes?.ok) {
          const instructoresData = await instructoresRes.json().catch(() => null);
          const listaInstructores = instructoresData?.data || instructoresData?.results || [];
          totalInstructores = Array.isArray(listaInstructores) ? listaInstructores.length : 0;
        }

        if (activo) {
          setResumen(data?.data || null);
          setConteoInstructores(totalInstructores);
          setError("");
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        if (activo) {
          setResumen(null);
          setConteoInstructores(0);
          setError(err.message || "No fue posible cargar el dashboard");
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarResumen();
    return () => {
      activo = false;
    };
  }, []);

  const kpis = resumen?.kpis || {};
  const programas = resumen?.programas || [];

  const resumenCards = useMemo(() => {
    const totalInstructores =
      kpis.total_instructores ??
      kpis.total_instructores_activos ??
      kpis.instructores_activos ??
      conteoInstructores;

    const cards = [
      {
        titulo: "Aprendices activos",
        valor: kpis.total_aprendices_activos ?? 0,
        detalle: "Aprendices vinculados a grupos activos",
        icono: UsersRound,
        tono: "amarillo"
      },
      {
        titulo: "Instructores",
        valor: totalInstructores,
        detalle: "Instructores disponibles para asignacion",
        icono: UserCheck,
        tono: "morado"
      },
      {
        titulo: "Grupos activos",
        valor: kpis.total_grupos_activos ?? 0,
        detalle: "Fichas disponibles para seguimiento",
        icono: Layers,
        tono: "verde"
      },
      {
        titulo: "Observaciones abiertas",
        valor: kpis.total_observaciones_abiertas ?? 0,
        detalle: "Casos que requieren seguimiento",
        icono: ClipboardCheck,
        tono: "cyan"
      },
      {
        titulo: "Alertas activas",
        valor: kpis.total_alertas_activas ?? 0,
        detalle: "Alertas asociadas a aprendices activos",
        icono: AlertTriangle,
        tono: "rojo",
        alerta: true
      }
    ];
    const maximo = Math.max(...cards.map((card) => obtenerNumero(card.valor)), 1);

    return cards.map((card) => ({
      ...card,
      progreso: calcularProgreso(card.valor, maximo)
    }));
  }, [kpis, conteoInstructores]);

  const estadoAcademico = useMemo(() => ([
    { etiqueta: "Areas asignadas", valor: kpis.total_areas ?? 0 },
    { etiqueta: "Programas activos", valor: kpis.total_programas ?? 0 },
    { etiqueta: "Alertas activas", valor: kpis.total_alertas_activas ?? 0 },
    { etiqueta: "Inasistencias validas", valor: kpis.total_inasistencias_validas ?? 0 }
  ]), [kpis]);

  const novedades = useMemo(() => {
    if (!programas.length) {
      return [
        { icono: Megaphone, titulo: "Sin programas cargados", texto: "Aun no hay programas activos asociados a tus areas." }
      ];
    }

    const programasVisibles = mostrarTodosProgramas ? programas : programas.slice(0, 3);

    return programasVisibles.map((programa) => ({
      icono: FileText,
      titulo: programa.nombre_programa,
      texto: `${programa.nombre_area} - ${programa.total_grupos || 0} grupos activos.`
    }));
  }, [programas, mostrarTodosProgramas]);

  const asistenciaJornada = [
    { nombre: "Manana", valor: 0, color: "#20b9d7" },
    { nombre: "Tarde", valor: 0, color: "#0b2442" },
    { nombre: "Noche", valor: 0, color: "#238500" }
  ];

  const filtrosResumen = [
    { id: "asistencia", label: "Asistencia y observaciones" },
    { id: "tiempo", label: "Tiempo" },
    { id: "programas", label: "Programas" },
    { id: "inasistencias", label: "Inasistencias" }
  ];

  const resumenInstitucional = useMemo(() => {
    const totalAlertas = kpis.total_alertas_activas ?? 0;
    const totalObservaciones = kpis.total_observaciones_abiertas ?? 0;
    const totalInasistencias = kpis.total_inasistencias_validas ?? 0;
    const totalAprendices = kpis.total_aprendices_activos ?? 0;
    const totalAreas = kpis.total_areas ?? 0;
    const totalProgramas = kpis.total_programas ?? 0;
    const totalGrupos = kpis.total_grupos_activos ?? 0;

    if (filtroResumenActivo === "programas") {
      const puntosProgramas = programas.length
        ? programas.slice(0, 6).map((programa) => ({
          label: programa.nombre_programa,
          value: obtenerNumero(programa.total_grupos)
        }))
        : [{ label: "Programas", value: totalProgramas }];

      return {
        titulo: "Programas",
        valor: totalProgramas,
        unidad: totalProgramas === 1 ? "programa" : "programas",
        detalle: `${totalGrupos} grupos activos en programas de tus areas.`,
        puntos: puntosProgramas
      };
    }

    if (filtroResumenActivo === "inasistencias") {
      return {
        titulo: "Inasistencias",
        valor: totalInasistencias,
        unidad: totalInasistencias === 1 ? "inasistencia valida" : "inasistencias validas",
        detalle: "Registros validados asociados a grupos activos.",
        puntos: [
          { label: "Validas", value: totalInasistencias },
          { label: "Alertas", value: totalAlertas },
          { label: "Observ.", value: totalObservaciones },
          { label: "Grupos", value: totalGrupos }
        ]
      };
    }

    if (filtroResumenActivo === "tiempo") {
      return {
        titulo: "Tiempo",
        valor: totalAreas,
        unidad: totalAreas === 1 ? "area" : "areas",
        detalle: "Corte actual por areas, programas, grupos y aprendices.",
        puntos: [
          { label: "Areas", value: totalAreas },
          { label: "Programas", value: totalProgramas },
          { label: "Grupos", value: totalGrupos },
          { label: "Aprendices", value: totalAprendices }
        ]
      };
    }

    return {
      titulo: "Asistencia y observaciones",
      valor: totalObservaciones + totalAlertas + totalInasistencias,
      unidad: "registros",
      detalle: `${totalInasistencias} inasistencias, ${totalObservaciones} observaciones y ${totalAlertas} alertas activas.`,
      puntos: [
        { label: "Inasist.", value: totalInasistencias },
        { label: "Observ.", value: totalObservaciones },
        { label: "Alertas", value: totalAlertas },
        { label: "Aprendices", value: totalAprendices }
      ]
    };
  }, [filtroResumenActivo, kpis, programas]);

  const graficoResumen = useMemo(() => {
    const puntosBase = resumenInstitucional.puntos.length
      ? resumenInstitucional.puntos
      : [{ label: "Sin datos", value: 0 }];
    const maximo = Math.max(...puntosBase.map((punto) => obtenerNumero(punto.value)), 1);
    const ancho = 630;
    const inicioX = 25;
    const baseY = 205;
    const alto = 150;
    const paso = puntosBase.length > 1 ? ancho / (puntosBase.length - 1) : 0;
    const puntos = puntosBase.map((punto, index) => {
      const valor = obtenerNumero(punto.value);
      return {
        ...punto,
        x: puntosBase.length > 1 ? inicioX + (paso * index) : inicioX + (ancho / 2),
        y: baseY - ((valor / maximo) * alto)
      };
    });
    const linea = puntos.map((punto, index) => `${index === 0 ? "M" : "L"}${punto.x} ${punto.y}`).join(" ");
    const area = `${linea} L${puntos[puntos.length - 1].x} ${baseY} L${puntos[0].x} ${baseY} Z`;
    const escala = [maximo, maximo * 0.75, maximo * 0.5, maximo * 0.25, 0].map((valor) => Math.round(valor));

    return { puntos, linea, area, escala };
  }, [resumenInstitucional]);

  if (cargando) {
    return (
      <div className="coordinador-panel">
        <div className="grupos-alert info">Cargando resumen del coordinador...</div>
      </div>
    );
  }

  return (
    <div className="coordinador-panel">
      {error && <div className="grupos-alert danger">{error}</div>}

      <section className="dashboard-welcome">
        <section className="dashboard-role-welcome">
          <h1>Bienvenido coordinador</h1>
        </section>
      </section>

      <section className="coordinador-kpi-grid" aria-label="Resumen general">
        {resumenCards.map((card) => {
          const Icon = card.icono;

          return (
            <article className={`coordinador-kpi-card tono-${card.tono}`} key={card.titulo}>
              <div className="coordinador-kpi-top">
                <span className="coordinador-kpi-icon">
                  <Icon size={29} strokeWidth={2.1} />
                </span>
                <span
                  className="coordinador-kpi-ring"
                  style={{ "--kpi-progress": `${card.progreso}%` }}
                  role="img"
                  aria-label={`${card.progreso}% del total mas alto del resumen`}
                ></span>
              </div>
              <h2>{card.titulo}</h2>
              <strong>{card.valor}</strong>
              <p className={card.alerta ? "negativo" : ""}>{card.alerta ? "Atencion requerida" : "Dato actualizado"}</p>
              <small>{card.detalle}</small>
            </article>
          );
        })}
      </section>

      <section className="coordinador-main-grid">
        <article className="coordinador-card coordinador-asistencia-card">
          <div className="coordinador-card-header">
            <div>
              <h2>{resumenInstitucional.titulo}</h2>
              <strong>{resumenInstitucional.valor} {resumenInstitucional.unidad}</strong>
              <p>{resumenInstitucional.detalle}</p>
            </div>
            <div className="coordinador-filter-actions" aria-label="Filtros de resumen institucional">
              {filtrosResumen.map((filtro) => {
                const activo = filtroResumenActivo === filtro.id;
                const Icon = activo ? ChevronDown : ChevronRight;

                return (
                  <button
                    className={`coordinador-select-btn ${activo ? "active" : ""}`}
                    type="button"
                    key={filtro.id}
                    onClick={() => setFiltroResumenActivo(filtro.id)}
                  >
                    {filtro.label}
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="coordinador-line-chart" aria-label={resumenInstitucional.titulo}>
            <div className="chart-scale">
              {graficoResumen.escala.map((valor, index) => (
                <span key={`${valor}-${index}`}>{valor}</span>
              ))}
            </div>
            <svg viewBox="0 0 680 230" role="img">
              <defs>
                <linearGradient id="asistenciaFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0b2442" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0b2442" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="chart-area" d={graficoResumen.area} />
              <path className="chart-line" d={graficoResumen.linea} />
              {graficoResumen.puntos.map((punto) => (
                <circle key={punto.label} cx={punto.x} cy={punto.y} r="5" />
              ))}
            </svg>
            <div
              className="chart-months"
              style={{ "--chart-columns": graficoResumen.puntos.length }}
            >
              {graficoResumen.puntos.map((punto) => (
                <span key={punto.label} title={`${punto.label}: ${punto.value}`}>
                  {punto.label}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article className="coordinador-card coordinador-jornada-card">
          <div className="coordinador-card-header compacto">
            <div>
              <h2>Estado operativo</h2>
              <strong>{kpis.total_inasistencias_validas ?? 0}</strong>
              <p>Inasistencias validas registradas</p>
            </div>
            <button
              className={`coordinador-select-btn ${filtroOperativoActivo === "inasistencias" ? "active" : ""}`}
              type="button"
              onClick={() => setFiltroOperativoActivo("inasistencias")}
            >
              Inasistencias
              {filtroOperativoActivo === "inasistencias" ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          </div>

          <div className="coordinador-bars" aria-label="Resumen operativo por jornada">
            {asistenciaJornada.map((item) => (
              <div className="coordinador-bar-item" key={item.nombre}>
                <div className="coordinador-bar-track">
                  <span
                    className="coordinador-bar-fill"
                    style={{ height: `${item.valor}%`, background: item.color }}
                  ></span>
                </div>
                <strong>{item.nombre}</strong>
                <small>Sin endpoint</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="coordinador-secondary-grid">
        <article className="coordinador-card coordinador-estado">
          <h2>Estado academico</h2>
          {estadoAcademico.map((item) => (
            <div className="coordinador-estado-row" key={item.etiqueta}>
              <span>{item.etiqueta}</span>
              <strong>{item.valor}</strong>
            </div>
          ))}
          <div className="coordinador-meta">
            <div>
              <span>Seguimiento general</span>
              <strong>{kpis.total_alertas_activas ?? 0} alertas</strong>
            </div>
            <span className="coordinador-meta-track">
              <span></span>
            </span>
          </div>
        </article>

        <article className="coordinador-novedades">
          <h2>
            <Megaphone size={21} />
            Programas activos
          </h2>
          <div className="coordinador-novedades-list">
            {novedades.map((item) => {
              const Icon = item.icono;
              return (
                <div className="coordinador-novedad-item" key={item.titulo}>
                  <Icon size={25} />
                  <div>
                    <strong>{item.titulo}</strong>
                    <p>{item.texto}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {programas.length > 3 && (
            <button
              className="coordinador-novedades-btn"
              type="button"
              onClick={() => setMostrarTodosProgramas((actual) => !actual)}
              aria-expanded={mostrarTodosProgramas}
            >
              {mostrarTodosProgramas ? "Ver menos" : "Ver detalle"}
              {mostrarTodosProgramas ? <ChevronDown size={18} /> : <ArrowRight size={18} />}
            </button>
          )}
        </article>
      </section>
    </div>
  );
}

