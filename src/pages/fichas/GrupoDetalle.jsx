import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, BarChart3, CalendarClock, Edit3, Eye, FilterX, RefreshCw, Save, Search, Users, X } from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import SimaPagination from "../../components/common/SimaPagination";
import api from "../../services/api";
import { claseEstadoGrupo, etiquetaEstadoGrupo } from "../../services/gruposService";
import HorarioGrupoModal, { DIAS_SEMANA, consultarHorariosGrupo } from "./HorarioGrupoModal";
import "./fichas.css";

/* -- helpers ------------------------------- */
function SeveridadLabel({ valor }) {
  const map = {
    Critica:  "gd-sev-critica",
    Grave:    "gd-sev-grave",
    Moderada: "gd-sev-moderada",
    Leve:     "gd-sev-leve",
  };
  return <span className={`gd-sev ${map[valor] || ""}`}>{valor || "-"}</span>;
}

const BARRA_ASISTENCIA = [
  { clave: "presente",   label: "Presente",   color: "#238500" },
  { clave: "tarde",      label: "Tarde",       color: "#f5b400" },
  { clave: "inasistente",label: "Inasistente", color: "#ef4444" },
  { clave: "justificada",label: "Justificada", color: "#0b2442" },
];

const BARRAS_SEVERIDAD = [
  { clave: "leves",     label: "Leves",     color: "#f5b400" },
  { clave: "moderadas", label: "Moderadas", color: "#f5b400" },
  { clave: "graves",    label: "Graves",    color: "#ef4444" },
];

const TABS_DETALLE = [
  { id: "resumen", label: "General", Icono: BarChart3 },
  { id: "horario", label: "Horario", Icono: CalendarClock },
  { id: "aprendices", label: "Aprendices", Icono: Users },
  { id: "alertas", label: "Alertas", Icono: AlertTriangle },
];

const APRENDIZ_FORM_VACIO = {
  id_usuario: "",
  nombres: "",
  apellidos: "",
  tipo_documento: "",
  numero_documento: "",
  email: "",
  telefono: "",
};

const FILTROS_ALERTAS_INICIALES = {
  busqueda: "",
  tipo: "",
  severidad: "",
  estado: "",
  fecha: "",
};

const ESTADOS_ALERTA_CERRADA = new Set(["CERRADA", "CERRADO", "RESUELTA"]);
const ESTADOS_ALERTA_ABIERTA = new Set(["ABIERTA", "ACTIVA"]);
const ESTADOS_APRENDIZ_INACTIVO = new Set(["INACTIVO", "RETIRADO", "CANCELADO", "APLAZADO", "SUSPENDIDO"]);
const REGISTROS_POR_PAGINA = 5;

function payload(resp) {
  return resp?.data ?? resp;
}

function extraerLista(data, llavePrincipal = "") {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (llavePrincipal && Array.isArray(data[llavePrincipal])) return data[llavePrincipal];
  if (Array.isArray(data.aprendices)) return data.aprendices;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function textoPlano(valor) {
  return `${valor ?? ""}`.trim().toUpperCase();
}

function normalizarTexto(valor) {
  return `${valor ?? ""}`
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerInicialesHorario(nombre) {
  const partes = String(nombre || "SI")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return `${partes[0]?.[0] || "S"}${partes[1]?.[0] || ""}`.toUpperCase();
}

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function numeroPositivo(valor) {
  const numero = numeroSeguro(String(valor ?? "").replace(",", "."));
  return numero && numero > 0 ? numero : null;
}

function trimestresDesdeTexto(valor) {
  const texto = normalizarTexto(valor);
  if (!texto) return null;

  const coincidencia = texto.match(/\d+(?:[.,]\d+)?/);
  if (!coincidencia) return null;

  const numero = numeroPositivo(coincidencia[0]);
  if (!numero) return null;

  if (texto.includes("mes")) return Math.max(1, Math.ceil(numero / 3));
  if (texto.includes("ano")) return Math.max(1, Math.ceil((numero * 12) / 3));

  return Math.round(numero);
}

function trimestresDesdeMeses(valor) {
  const meses = numeroPositivo(valor);
  return meses ? Math.max(1, Math.ceil(meses / 3)) : null;
}

function trimestresDesdeFechas(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return null;

  const inicio = new Date(`${String(fechaInicio).split("T")[0]}T00:00:00`);
  const fin = new Date(`${String(fechaFin).split("T")[0]}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) {
    return null;
  }

  const meses =
    (fin.getFullYear() - inicio.getFullYear()) * 12 +
    (fin.getMonth() - inicio.getMonth()) +
    (fin.getDate() >= inicio.getDate() ? 0 : -1);

  return meses > 0 ? Math.max(1, Math.ceil(meses / 3)) : null;
}

function obtenerTrimestresGrupo(grupo) {
  const candidatos = [
    grupo?.trimestres,
    grupo?.total_trimestres,
    grupo?.numero_trimestres,
    grupo?.cantidad_trimestres,
    grupo?.duracion_trimestres,
    grupo?.duracion_en_trimestres,
    grupo?.programa_formacion?.trimestres,
    grupo?.programa_formacion?.total_trimestres,
    grupo?.programa_formacion?.numero_trimestres,
    grupo?.programa_formacion?.cantidad_trimestres,
    grupo?.programa_formacion?.duracion_trimestres,
    grupo?.programa?.trimestres,
    grupo?.programa?.duracion_trimestres,
  ];

  for (const candidato of candidatos) {
    const valor = typeof candidato === "string"
      ? trimestresDesdeTexto(candidato)
      : numeroPositivo(candidato);
    if (valor) return Math.round(valor);
  }

  const meses = [
    grupo?.duracion_meses,
    grupo?.meses,
    grupo?.programa_formacion?.duracion_meses,
    grupo?.programa_formacion?.meses,
    grupo?.programa?.duracion_meses,
    grupo?.programa?.meses,
  ];

  for (const candidato of meses) {
    const valor = trimestresDesdeMeses(candidato);
    if (valor) return valor;
  }

  const duracionesTexto = [
    grupo?.duracion,
    grupo?.programa_formacion?.duracion,
    grupo?.programa?.duracion,
  ];

  for (const candidato of duracionesTexto) {
    const valor = trimestresDesdeTexto(candidato);
    if (valor) return valor;
  }

  return trimestresDesdeFechas(grupo?.fecha_inicio, grupo?.fecha_fin);
}

function obtenerIdAprendiz(item) {
  return item?.id_aprendiz ?? item?.idAprendiz ?? item?.aprendiz?.id_aprendiz ?? item?.aprendiz?.id ?? item?.id;
}

function obtenerPersona(item) {
  return item?.usuario?.persona || item?.persona || item?.aprendiz?.usuario?.persona || {};
}

function obtenerNombreAprendiz(item, fallback = "Aprendiz") {
  const persona = obtenerPersona(item);
  const nombre = `${persona.nombres || item?.nombres || ""} ${persona.apellidos || item?.apellidos || ""}`.trim();
  return nombre || item?.aprendizNombre || item?.nombre || fallback;
}

function obtenerNombresAprendiz(item) {
  const persona = obtenerPersona(item);
  return persona.nombres || item?.nombres || "";
}

function obtenerApellidosAprendiz(item) {
  const persona = obtenerPersona(item);
  return persona.apellidos || item?.apellidos || "";
}

function obtenerDocumentoAprendiz(item) {
  const persona = obtenerPersona(item);
  return persona.numero_documento || item?.numero_documento || item?.documento || "-";
}

function obtenerIdUsuarioAprendiz(item) {
  return item?.usuario?.id_usuario || item?.id_usuario || item?.aprendiz?.usuario?.id_usuario || "";
}

function obtenerTipoDocumentoAprendiz(item) {
  const persona = obtenerPersona(item);
  return persona.tipo_documento || item?.tipo_documento || "";
}

function obtenerEmailAprendiz(item) {
  return item?.usuario?.email || item?.email || item?.correo || "";
}

function obtenerTelefonoAprendiz(item) {
  const persona = obtenerPersona(item);
  return persona.telefono || item?.telefono || "";
}

function obtenerEstadoFormativoAprendiz(item) {
  return item?.estado_formativo || item?.estadoFormativo || item?.estado_formacion || "No registrado";
}

function obtenerEstadoUsuarioAprendiz(item) {
  return item?.usuario?.estado || item?.estado_usuario || item?.estado || "No registrado";
}

function obtenerGrupoActualAprendiz(item) {
  const grupoActivo = item?.aprendiz_grupos?.find((relacion) => relacion?.estado === "ACTIVO") ||
    item?.aprendiz_grupos?.[0];
  return grupoActivo?.grupo || item?.grupo || {};
}

function aprendizInactivo(item) {
  const estado = textoPlano(item?.estado || item?.usuario?.estado);
  const estadoFormativo = textoPlano(item?.estado_formativo);
  return ESTADOS_APRENDIZ_INACTIVO.has(estado) || ESTADOS_APRENDIZ_INACTIVO.has(estadoFormativo);
}

function obtenerInasistenciasAprendiz(item) {
  const posibles = [
    item?.inasistencias_validas,
    item?.total_inasistencias_validas,
    item?.inasistencias,
    item?.total_inasistencias,
    item?.faltas,
    item?.ausencias,
  ];
  const valor = posibles.map(numeroSeguro).find((numero) => numero !== null);
  return valor ?? 0;
}

function alertaEstaAbierta(alerta) {
  const estado = textoPlano(alerta?.estado);
  return !estado || ESTADOS_ALERTA_ABIERTA.has(estado);
}

function alertaEstaActiva(alerta) {
  return ESTADOS_ALERTA_ABIERTA.has(textoPlano(alerta?.estado || "ABIERTA"));
}

function alertaEsObservacion(alerta) {
  return textoPlano(alerta?.tipo_alerta || alerta?.tipoAlerta) === "OBSERVACIONES_RECURRENTES" ||
    textoPlano(alerta?.observacion?.estado) === "ABIERTA";
}

function alertaEsInasistencia(alerta) {
  return textoPlano(alerta?.tipo_alerta || alerta?.tipoAlerta) === "ASISTENCIAL";
}

function observacionEstaAbierta(observacion) {
  const estado = textoPlano(observacion?.estado || observacion?.estado_observacion || "ABIERTA");
  return estado === "ABIERTA" || estado === "ABIERTO" || estado === "PENDIENTE";
}

function contarObservacionesAbiertas(data) {
  const fuentesConteo = [
    data?.observaciones_abiertas,
    data?.total_observaciones_abiertas,
    data?.total_abiertas,
    data?.abiertas,
    data?.meta?.observaciones_abiertas,
  ];

  for (const valor of fuentesConteo) {
    const numero = numeroSeguro(valor);
    if (numero !== null) return numero;
  }

  const lista = extraerLista(data, "observaciones");
  return lista.filter(observacionEstaAbierta).length;
}

function formatearFecha(valor) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString("es-CO");
}

function normalizarFechaInput(valor) {
  if (!valor) return "";
  if (typeof valor === "string") return valor.split("T")[0];
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "" : fecha.toISOString().split("T")[0];
}

function obtenerRangoFechaInicio() {
  const hoy = new Date();
  const minimo = new Date(hoy);
  const maximo = new Date(hoy);
  minimo.setMonth(minimo.getMonth() - 6);
  maximo.setFullYear(maximo.getFullYear() + 1);

  return {
    min: minimo.toISOString().split("T")[0],
    max: maximo.toISOString().split("T")[0],
  };
}

function validarRangoFechaInicio(valor, rango) {
  const fecha = normalizarFechaInput(valor);
  if (!fecha) return "La fecha de inicio es obligatoria.";
  if (fecha < rango.min || fecha > rango.max) {
    return "La fecha de inicio debe estar entre 6 meses atras y 1 ano hacia adelante.";
  }
  return "";
}

function calcularFechaFinLocal(fechaInicio, trimestres, fallback = "") {
  const inicio = normalizarFechaInput(fechaInicio);
  const totalTrimestres = Number.parseInt(trimestres, 10);
  if (!inicio || !Number.isInteger(totalTrimestres)) return fallback;
  const fecha = new Date(`${inicio}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return fallback;
  fecha.setMonth(fecha.getMonth() + totalTrimestres * 3);
  return fecha.toISOString().split("T")[0];
}

function obtenerMensajeError(error, fallback = "No fue posible completar la accion.") {
  const data = error?.response?.data || error;
  const estado = error?.response?.status;
  if (estado === 404) {
    return "El backend no tiene habilitado el endpoint para editar grupos (PUT /api/groups/:id).";
  }
  return data?.message || data?.error || error?.message || fallback;
}

function etiquetaSeveridad(valor) {
  const severidad = textoPlano(valor);
  const map = { CRITICA: "Critica", GRAVE: "Grave", MODERADA: "Moderada", LEVE: "Leve" };
  return map[severidad] || "-";
}

function etiquetaTipoAlerta(valor) {
  const tipo = textoPlano(valor);
  const map = {
    ASISTENCIAL: "Asistencial",
    CONVIVENCIAL: "Convivencial",
    OBSERVACIONES_RECURRENTES: "Observaciones recurrentes",
  };
  return map[tipo] || (tipo ? tipo.replace(/_/g, " ") : "No registrado");
}

function etiquetaEstadoAlerta(valor) {
  const estado = textoPlano(valor || "ABIERTA");
  const map = {
    ABIERTA: "Abierta",
    ACTIVA: "Abierta",
    CERRADA: "Cerrada",
    CERRADO: "Cerrada",
    RESUELTA: "Resuelta",
  };
  return map[estado] || estado;
}

function obtenerFechaAlerta(alerta) {
  return alerta?.fecha_alerta || alerta?.fechaCreacion || alerta?.fecha_creacion || alerta?.createdAt || "";
}

function obtenerGrupoAlerta(alerta, fallback = "-") {
  return alerta?.grupo?.numero_ficha || alerta?.grupoCodigo || alerta?.grupoId || alerta?.id_grupo || fallback;
}

function calcularTrimestreActual(grupo) {
  const totalTrimestres = obtenerTrimestresGrupo(grupo) || 0;
  if (!grupo?.fecha_inicio || !totalTrimestres) return "-";

  const inicio = new Date(`${grupo.fecha_inicio}T00:00:00`);
  if (Number.isNaN(inicio.getTime())) return "-";

  const dias = Math.floor((Date.now() - inicio.getTime()) / 86400000);
  if (dias < 0) return "Por iniciar";

  const actual = Math.floor(dias / 90) + 1;
  return Math.min(Math.max(actual, 1), totalTrimestres);
}

function formatearTotalTrimestres(valor) {
  const total = Number.parseInt(valor, 10);
  if (!Number.isInteger(total) || total < 1) return "Sin duracion";
  return `${total} ${total === 1 ? "trimestre" : "trimestres"}`;
}

function normalizarAlertas(listaAlertas, aprendices) {
  const aprendicesPorId = new Map();
  aprendices.forEach((aprendiz) => {
    const id = obtenerIdAprendiz(aprendiz);
    if (id !== undefined && id !== null) aprendicesPorId.set(String(id), aprendiz);
  });

  const filtradas = listaAlertas.filter((alerta) => {
    const idAprendiz = obtenerIdAprendiz(alerta);
    return idAprendiz !== undefined && aprendicesPorId.has(String(idAprendiz));
  });

  const abiertas = filtradas.filter(alertaEstaAbierta);
  const activas = abiertas.filter(alertaEstaActiva);
  const porSeveridad = { leves: 0, moderadas: 0, graves: 0 };
  const porAprendiz = {};

  abiertas.forEach((alerta) => {
    const severidad = textoPlano(alerta.severidad);
    if (severidad === "LEVE") porSeveridad.leves += 1;
    else if (severidad === "MODERADA") porSeveridad.moderadas += 1;
    else if (severidad === "GRAVE" || severidad === "CRITICA") porSeveridad.graves += 1;

    const idAprendiz = String(obtenerIdAprendiz(alerta));
    if (!porAprendiz[idAprendiz]) {
      porAprendiz[idAprendiz] = { total: 0, inasistencias: 0, graves: 0, moderadas: 0 };
    }
    porAprendiz[idAprendiz].total += 1;
    if (alertaEsInasistencia(alerta)) porAprendiz[idAprendiz].inasistencias += 1;
    if (severidad === "GRAVE" || severidad === "CRITICA") porAprendiz[idAprendiz].graves += 1;
    if (severidad === "MODERADA") porAprendiz[idAprendiz].moderadas += 1;
  });

  return {
    total: activas.length,
    observaciones: abiertas.filter(alertaEsObservacion).length,
    inasistencias: abiertas.filter(alertaEsInasistencia).length,
    porSeveridad,
    porAprendiz,
    totalHistorial: filtradas.length,
    lista: filtradas.map((alerta) => {
      const aprendiz = aprendicesPorId.get(String(obtenerIdAprendiz(alerta)));
      const tipoValor = textoPlano(alerta.tipo_alerta || alerta.tipoAlerta || alerta.tipo);
      const estadoRaw = textoPlano(alerta.estado || "ABIERTA");
      const estadoValor = ESTADOS_ALERTA_CERRADA.has(estadoRaw) ? "CERRADA" : "ABIERTA";
      const severidadValor = textoPlano(alerta.severidad);
      const fechaRaw = obtenerFechaAlerta(alerta);
      return {
        aprendiz: obtenerNombreAprendiz(aprendiz, `Aprendiz #${obtenerIdAprendiz(alerta) || ""}`.trim()),
        grupo: obtenerGrupoAlerta(alerta),
        tipo: etiquetaTipoAlerta(tipoValor),
        tipoValor,
        detalle: alerta.descripcion || alerta.detalle || "-",
        severidad: etiquetaSeveridad(severidadValor),
        severidadValor,
        estado: etiquetaEstadoAlerta(estadoValor),
        estadoValor,
        fuente: textoPlano(alerta.origen || alerta.fuente || alerta.tipo_alerta) === "MANUAL" ? "Manual" : "Sistema",
        fecha: formatearFecha(fechaRaw),
        fechaRaw,
      };
    }),
  };
}

function calcularMetricasGrupo(aprendices, alertasGrupo, grupo) {
  const inactivos = aprendices.filter(aprendizInactivo).length;
  const activos = Math.max(aprendices.length - inactivos, 0);
  const inasistenciasDesdeAprendices = aprendices.reduce(
    (total, aprendiz) => total + obtenerInasistenciasAprendiz(aprendiz),
    0
  );

  return {
    activos,
    inactivos,
    trimestreActual: calcularTrimestreActual(grupo),
    inasistencias: inasistenciasDesdeAprendices || alertasGrupo.inasistencias || 0,
  };
}

function porcentaje(valor, total) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((valor / total) * 100)));
}

function buscarNumero(objeto, claves) {
  if (!objeto || typeof objeto !== "object") return null;

  for (const clave of claves) {
    const numero = numeroSeguro(objeto[clave]);
    if (numero !== null) return numero;
  }

  return null;
}

function extraerDistribucionAsistencia(fuente) {
  if (!fuente || typeof fuente !== "object") return null;

  const valores = {
    presente: buscarNumero(fuente, ["presente", "presentes", "asistio", "asistieron"]),
    tarde: buscarNumero(fuente, ["tarde", "tardes", "llegadas_tarde", "retardos"]),
    inasistente: buscarNumero(fuente, ["inasistente", "inasistentes", "ausente", "ausentes", "no_asistio", "no_asistieron"]),
    justificada: buscarNumero(fuente, ["justificada", "justificadas", "inasistencia_justificada", "inasistencias_justificadas"]),
  };

  const tieneDatos = Object.values(valores).some((valor) => valor !== null);
  if (!tieneDatos) return null;

  const suma = Object.values(valores).reduce((total, valor) => total + (valor || 0), 0);
  const total = buscarNumero(fuente, ["total", "total_registros", "total_aprendices", "registrados"]) || suma;
  if (!total) return null;

  return {
    presente: porcentaje(valores.presente || 0, total),
    tarde: porcentaje(valores.tarde || 0, total),
    inasistente: porcentaje(valores.inasistente || 0, total),
    justificada: porcentaje(valores.justificada || 0, total),
  };
}

function extraerAsistenciaPeriodo(fuente, periodo) {
  if (!fuente || typeof fuente !== "object") return null;

  const periodoNormalizado = periodo.toLowerCase();
  return (
    extraerDistribucionAsistencia(fuente[periodoNormalizado]) ||
    extraerDistribucionAsistencia(fuente[periodoNormalizado.toUpperCase()]) ||
    extraerDistribucionAsistencia(fuente)
  );
}

function agregarAsistenciaAprendices(aprendices, periodo) {
  const acumulado = { presente: 0, tarde: 0, inasistente: 0, justificada: 0 };
  let registros = 0;

  aprendices.forEach((aprendiz) => {
    const fuentes = [
      aprendiz?.asistencia,
      aprendiz?.asistencias,
      aprendiz?.resumen_asistencia,
      aprendiz?.attendance,
      aprendiz,
    ];

    const resumen = fuentes.map((fuente) => extraerAsistenciaPeriodo(fuente, periodo)).find(Boolean);
    if (!resumen) return;

    registros += 1;
    BARRA_ASISTENCIA.forEach(({ clave }) => {
      acumulado[clave] += resumen[clave] || 0;
    });
  });

  if (!registros) return null;

  return Object.fromEntries(
    Object.entries(acumulado).map(([clave, valor]) => [clave, porcentaje(valor, registros * 100)])
  );
}

function construirAsistencia(metricasGrupo, aprendices, grupo = null) {
  const fuentesGrupo = [
    grupo?.asistencia,
    grupo?.asistencias,
    grupo?.resumen_asistencia,
    grupo?.attendance,
    grupo?.metricas_asistencia,
  ];

  const datos = {};
  ["hoy", "semana", "mes"].forEach((periodo) => {
    datos[periodo] =
      fuentesGrupo.map((fuente) => extraerAsistenciaPeriodo(fuente, periodo)).find(Boolean) ||
      agregarAsistenciaAprendices(aprendices, periodo);
  });

  const tieneDatos = Boolean(datos.hoy || datos.semana || datos.mes);

  return {
    tieneDatos,
    inasistencias: metricasGrupo.inasistencias || 0,
    hoy: datos.hoy,
    semana: datos.semana,
    mes: datos.mes,
  };
}

function obtenerIdGrupoBackend(grupo, fallback) {
  return grupo?.id_grupo || grupo?.id || grupo?.grupo?.id_grupo || fallback;
}

function obtenerCodigoGrupo(grupo) {
  return grupo?.numero_ficha || grupo?.numero_grupo || grupo?.codigo || grupo?.ficha || "";
}

function extraerGrupoRespuesta(dataGrupo, dataAprendices) {
  if (dataGrupo?.grupo) return dataGrupo.grupo;
  if (dataGrupo?.id_grupo || dataGrupo?.numero_ficha || dataGrupo?.jornada) return dataGrupo;
  if (dataAprendices?.grupo) return dataAprendices.grupo;
  return null;
}

function leerGrupoNavegacion(idGrupo, grupoState) {
  if (grupoState) return grupoState;

  try {
    const guardado = sessionStorage.getItem(`sima_grupo_detalle_${idGrupo}`);
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

function resolverGrupoSeleccionado(grupoBackend, grupoNavegacion) {
  if (!grupoNavegacion) return grupoBackend;
  if (!grupoBackend) return grupoNavegacion;

  const fichaBackend = String(obtenerCodigoGrupo(grupoBackend));
  const fichaNavegacion = String(obtenerCodigoGrupo(grupoNavegacion));

  if (fichaBackend && fichaNavegacion && fichaBackend !== fichaNavegacion) {
    return grupoNavegacion;
  }

  return { ...grupoNavegacion, ...grupoBackend };
}

async function consultarGrupoBase(idGrupo) {
  const [grupoResp, aprendicesResp] = await Promise.allSettled([
    api.get(`/api/groups/${idGrupo}`),
    api.get(`/api/apprentices/grupo/${idGrupo}`, { params: { limit: 1000 } }),
  ]);

  const dataGrupo = grupoResp.status === "fulfilled" ? payload(grupoResp.value.data) : null;
  const dataAprendices = aprendicesResp.status === "fulfilled" ? payload(aprendicesResp.value.data) : null;
  const listaAprendices = extraerLista(dataAprendices, "aprendices");
  const grupoBackend = extraerGrupoRespuesta(dataGrupo, dataAprendices);

  if (!grupoBackend) {
    const err = grupoResp.reason?.response?.data || aprendicesResp.reason?.response?.data;
    throw new Error(err?.message || err?.error || "No fue posible cargar la ficha");
  }

  return { grupoBackend, listaAprendices };
}

function camposNoPersistidos(grupoBackend, cambios) {
  const pendientes = [];
  if (normalizarFechaInput(grupoBackend?.fecha_inicio) !== cambios.fecha_inicio) {
    pendientes.push("fecha de inicio");
  }
  if (normalizarTexto(grupoBackend?.jornada) !== normalizarTexto(cambios.jornada)) {
    pendientes.push("jornada");
  }
  if (Number.parseInt(obtenerTrimestresGrupo(grupoBackend), 10) !== cambios.trimestres) {
    pendientes.push("duracion");
  }
  return pendientes;
}

function extraerAprendizRespuesta(data, fallback) {
  if (!data || typeof data !== "object") return fallback;
  return data.aprendiz || data.data?.aprendiz || data.data || data;
}

function construirPerfilAprendiz(aprendiz, detalleGrupo, resumenAlertas = {}) {
  const grupoActual = obtenerGrupoActualAprendiz(aprendiz);
  const nombres = obtenerNombresAprendiz(aprendiz);
  const apellidos = obtenerApellidosAprendiz(aprendiz);

  return {
    id: obtenerIdAprendiz(aprendiz) || "-",
    nombreCompleto: obtenerNombreAprendiz(aprendiz),
    nombres: nombres || "No registrado",
    apellidos: apellidos || "No registrado",
    tipoDocumento: obtenerTipoDocumentoAprendiz(aprendiz) || "No registrado",
    documento: obtenerDocumentoAprendiz(aprendiz),
    correo: obtenerEmailAprendiz(aprendiz) || "No registrado",
    telefono: obtenerTelefonoAprendiz(aprendiz) || "No registrado",
    estadoUsuario: obtenerEstadoUsuarioAprendiz(aprendiz),
    estadoFormativo: obtenerEstadoFormativoAprendiz(aprendiz),
    ficha: grupoActual.numero_ficha || grupoActual.numero_grupo || detalleGrupo?.ficha || "No registrada",
    programa: grupoActual.programa || grupoActual.programa_formacion?.nombre_programa || detalleGrupo?.programa || "No registrado",
    jornada: grupoActual.jornada || detalleGrupo?.jornada || "No registrada",
    fechaInicio: grupoActual.fecha_inicio || detalleGrupo?.fechaInicio || "No registrada",
    fechaFin: grupoActual.fecha_fin || detalleGrupo?.fechaFin || "No registrada",
    alertas: resumenAlertas.total ?? 0,
    alertasGraves: resumenAlertas.graves ?? 0,
    alertasModeradas: resumenAlertas.moderadas ?? 0,
    inasistencias: obtenerInasistenciasAprendiz(aprendiz) || resumenAlertas.inasistencias || 0,
  };
}

function agregarValor(set, valor) {
  if (valor !== null && valor !== undefined && valor !== "") set.add(String(valor));
}

function leerUsuarioActualStorage() {
  try {
    return JSON.parse(localStorage.getItem("user_data") || "{}") || {};
  } catch {
    return {};
  }
}

function obtenerIdsInstructorActual() {
  const usuario = leerUsuarioActualStorage();
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

function esInstructorLiderGrupo(grupo) {
  const idsInstructor = obtenerIdsInstructorActual();
  const candidatos = [
    grupo?.id_instructor_lider,
    grupo?.instructor_lider?.id_instructor,
    grupo?.instructor?.id_instructor,
  ].filter(Boolean).map(String);

  return candidatos.some((idInstructor) => idsInstructor.has(idInstructor));
}

function obtenerNombreInstructor(instructor) {
  const persona = instructor?.usuario?.persona;
  return persona
    ? `${persona.nombres || ""} ${persona.apellidos || ""}`.trim()
    : instructor?.nombre || instructor?.nombre_completo || `Instructor ${instructor?.id_instructor || ""}`.trim();
}

function obtenerEtiquetaInstructor(instructor) {
  const nombre = obtenerNombreInstructor(instructor);
  const detalles = [instructor?.codigo_instructor, instructor?.especialidad]
    .filter(Boolean)
    .join(" - ");
  return detalles ? `${nombre} - ${detalles}` : nombre;
}

export default function GrupoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const rol = (localStorage.getItem("rol") || "").toLowerCase();
  const esInstructor = rol === "instructor" || rol === "instructor_lider" || rol === "instructor_asignado";
  const puedeEditarGrupo = rol === "coordinador";
  const puedeVerAlertas = puedeEditarGrupo || esInstructor;
  const puedeVerPerfilAprendiz = esInstructor;
  const rutaRegreso = esInstructor ? "/instructor/grupos" : "/fichas";
  const textoRegreso = esInstructor ? "Volver a Mis Grupos" : "Volver a Gestion de grupos";
  const grupoNavegacion = useMemo(
    () => leerGrupoNavegacion(id, location.state?.grupo),
    [id, location.state]
  );

  /* -- estado del grupo (ya existente) -- */
  const [grupo, setGrupo] = useState(null);
  const [aprendicesGrupo, setAprendicesGrupo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errorDetalle, setErrorDetalle] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [detalleForm, setDetalleForm] = useState({ numero_ficha: "", jornada: "", trimestres: "", fecha_inicio: "" });
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);

  /* -- estado para metricas del grupo -- */
  const [alertas, setAlertas] = useState(null);
  const [asistencia, setAsistencia] = useState(null);
  const [horariosBackend, setHorariosBackend] = useState([]);
  const [cargandoHorario, setCargandoHorario] = useState(false);
  const [errorHorario, setErrorHorario] = useState("");
  const [grupoHorario, setGrupoHorario] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [periodoAsist, setPeriodoAsist] = useState("Hoy");
  const [tabDetalle, setTabDetalle] = useState("resumen");
  const [aprendizEditando, setAprendizEditando] = useState(null);
  const [aprendizForm, setAprendizForm] = useState(APRENDIZ_FORM_VACIO);
  const [guardandoAprendiz, setGuardandoAprendiz] = useState(false);
  const [errorAprendiz, setErrorAprendiz] = useState("");
  const [perfilAprendiz, setPerfilAprendiz] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState("");
  const [filtrosAlertas, setFiltrosAlertas] = useState(FILTROS_ALERTAS_INICIALES);
  const [modalEstadoGrupo, setModalEstadoGrupo] = useState(false);
  const [estadoGrupoTemporal, setEstadoGrupoTemporal] = useState("");
  const [modalInstructorLider, setModalInstructorLider] = useState(false);
  const [instructorLiderTemporal, setInstructorLiderTemporal] = useState("");
  const [instructoresDisponibles, setInstructoresDisponibles] = useState([]);
  const [cargandoInstructores, setCargandoInstructores] = useState(false);
  const [guardandoInstructorLider, setGuardandoInstructorLider] = useState(false);
  const [errorInstructorLider, setErrorInstructorLider] = useState("");
  const [confirmarHorarioGrupo, setConfirmarHorarioGrupo] = useState(false);
  const [horarioReasignando, setHorarioReasignando] = useState(null);
  const rangoFechaInicio = useMemo(() => obtenerRangoFechaInicio(), []);
  const puedeGestionarHorario = puedeEditarGrupo || (esInstructor && esInstructorLiderGrupo(grupo));
  const [paginaAprendices, setPaginaAprendices] = useState(1);
  const [paginaAlertas, setPaginaAlertas] = useState(1);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        setCargando(true);
        setError("");

        const { grupoBackend, listaAprendices } = await consultarGrupoBase(id);
        const grupoSeleccionado = resolverGrupoSeleccionado(grupoBackend, grupoNavegacion);

        let alertasNormalizadas = normalizarAlertas([], listaAprendices);
        try {
          const respAlertas = await api.get("/api/alerts", { params: { id_grupo: id } });
          const listaAlertas = extraerLista(payload(respAlertas.data), "alertas");
          alertasNormalizadas = normalizarAlertas(listaAlertas, listaAprendices);
        } catch (errAlertas) {
          console.warn("No fue posible cargar alertas del grupo", errAlertas);
        }

        try {
          const respObservaciones = await api.get(`/api/observations/group/${id}`, {
            params: { estado: "ABIERTA", limit: 1000 },
          });
          const totalObservacionesAbiertas = contarObservacionesAbiertas(payload(respObservaciones.data));
          alertasNormalizadas = {
            ...alertasNormalizadas,
            observaciones: totalObservacionesAbiertas,
          };
        } catch (errObservaciones) {
          console.warn("No fue posible cargar observaciones abiertas del grupo", errObservaciones);
        }

        const metricasGrupo = calcularMetricasGrupo(listaAprendices, alertasNormalizadas, grupoSeleccionado);
        const asistenciaGrupo = construirAsistencia(metricasGrupo, listaAprendices, grupoSeleccionado);

        if (activo) {
          setGrupo(grupoSeleccionado);
          setAprendicesGrupo(listaAprendices);
          setAlertas(alertasNormalizadas);
          setMetricas(metricasGrupo);
          setAsistencia(asistenciaGrupo);
          setDetalleForm({
            numero_ficha: grupoSeleccionado?.numero_ficha || "",
            jornada: grupoSeleccionado?.jornada || "",
            trimestres: obtenerTrimestresGrupo(grupoSeleccionado) || "",
            fecha_inicio: normalizarFechaInput(grupoSeleccionado?.fecha_inicio),
          });
        }
      } catch (e) {
        if (activo && grupoNavegacion) {
          const alertasNormalizadas = normalizarAlertas([], []);
          const metricasGrupo = calcularMetricasGrupo([], alertasNormalizadas, grupoNavegacion);
          setGrupo(grupoNavegacion);
          setAprendicesGrupo([]);
          setAlertas(alertasNormalizadas);
          setMetricas(metricasGrupo);
          setAsistencia(construirAsistencia(metricasGrupo, [], grupoNavegacion));
          setDetalleForm({
            numero_ficha: grupoNavegacion?.numero_ficha || "",
            jornada: grupoNavegacion?.jornada || "",
            trimestres: obtenerTrimestresGrupo(grupoNavegacion) || "",
            fecha_inicio: normalizarFechaInput(grupoNavegacion?.fecha_inicio),
          });
        } else if (activo) {
          setError(e?.message || e?.error || "Error al cargar la ficha");
        }
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => { activo = false; };
  }, [id, grupoNavegacion]);

  const cargarHorarioBackend = useCallback(async () => {
    if (!grupo) {
      setHorariosBackend([]);
      setErrorHorario("");
      return;
    }

    const idGrupo = obtenerIdGrupoBackend(grupo, id);
    if (!idGrupo) {
      setHorariosBackend([]);
      setErrorHorario("");
      return;
    }

    try {
      setCargandoHorario(true);
      setErrorHorario("");
      const listaHorarios = await consultarHorariosGrupo(idGrupo);
      setHorariosBackend(listaHorarios);
    } catch (errorHorarioGrupo) {
      console.error("Error cargando horario del grupo:", errorHorarioGrupo);
      setHorariosBackend([]);
      setErrorHorario(errorHorarioGrupo.message || "No fue posible cargar el horario guardado.");
    } finally {
      setCargandoHorario(false);
    }
  }, [grupo, id]);

  useEffect(() => {
    Promise.resolve().then(cargarHorarioBackend);
  }, [cargarHorarioBackend]);

  useEffect(() => {
    if (tabDetalle === "horario") {
      Promise.resolve().then(cargarHorarioBackend);
    }
  }, [tabDetalle, cargarHorarioBackend]);

  useEffect(() => {
    function refrescarHorario(evento) {
      const idGrupo = obtenerIdGrupoBackend(grupo, id);
      const idGrupoActualizado = evento.detail?.idGrupo;

      if (!idGrupoActualizado || String(idGrupoActualizado) === String(idGrupo)) {
        setGrupoHorario(null);
        setTabDetalle("horario");
        cargarHorarioBackend();
      }
    }

    window.addEventListener("sima:horarios-actualizados", refrescarHorario);
    return () => window.removeEventListener("sima:horarios-actualizados", refrescarHorario);
  }, [grupo, id, cargarHorarioBackend]);

  const detalle = useMemo(() => {
    if (!grupo) return null;
    const estadoTexto = etiquetaEstadoGrupo(grupo.estado);
    const estadoClase = claseEstadoGrupo(grupo.estado);
    const persona = grupo.instructor_lider?.usuario?.persona;
    const instructor = persona
      ? `${persona.nombres} ${persona.apellidos}`
      : grupo.instructor || grupo.instructor_lider_nombre || "Sin asignar";
    const iniciales = persona ? `${persona.nombres[0]}${persona.apellidos[0]}` : "?";
    const areaDirecta = grupo.area?.nombre_area || grupo.nombre_area || grupo.area;
    const programaDirecto = grupo.programa?.nombre_programa || grupo.nombre_programa || grupo.programa;

    return {
      ficha: obtenerCodigoGrupo(grupo) || id,
      estadoTexto, estadoClase,
      area: grupo.programa_formacion?.area?.nombre_area || (typeof areaDirecta === "string" ? areaDirecta : "") || "No especificada",
      programa: grupo.programa_formacion?.nombre_programa || (typeof programaDirecto === "string" ? programaDirecto : "") || "No especificado",
      jornada: grupo.jornada || "No especificada",
      trimestres: obtenerTrimestresGrupo(grupo) || 0,
      fechaInicio: grupo.fecha_inicio || "No registrada",
      fechaFin: grupo.fecha_fin || "No registrada",
      inicioProductiva: grupo.inicio_etapa_productiva || "No registrada",
      instructor, iniciales,
      ambiente: grupo.ambiente?.nombre_ambiente || "Sin asignar",
      ubicacion: grupo.ambiente?.ubicacion || "No registrada",
      aprendices: aprendicesGrupo.length || grupo.total_aprendices || 0,
    };
  }, [grupo, id, aprendicesGrupo]);

  /* -- KPIs derivados de datos reales cuando lleguen -- */
  const kpis = useMemo(() => {
    const base = [
      { label: "Aprendices activos",    valor: metricas?.activos ?? detalle?.aprendices ?? 0, sub: "vinculados al grupo", cls: "gd-kpi-green" },
      { label: "Inasistencias válidas", valor: asistencia?.inasistencias ?? 0, sub: "registradas", cls: "gd-kpi-blue" },
      { label: "Inactivos",             valor: metricas?.inactivos ?? 0, sub: "aprendices", cls: "gd-kpi-gray" },
    ];
    
    if (puedeVerAlertas) {
      base.splice(1, 0, 
        { label: "Alertas activas",        valor: alertas?.total ?? 0,         sub: "activas", cls: "gd-kpi-red"   },
        { label: "Observaciones abiertas", valor: alertas?.observaciones ?? 0, sub: "abiertas", cls: "gd-kpi-yellow" }
      );
    }
    return base;
  }, [detalle, alertas, asistencia, metricas, puedeVerAlertas]);

  const tabsDetalle = useMemo(
    () => TABS_DETALLE.filter((tab) => tab.id !== "alertas" || puedeVerAlertas),
    [puedeVerAlertas]
  );
  const horarioDetalle = useMemo(
    () => ({ horarios: horariosBackend, esMuestra: false }),
    [horariosBackend]
  );
  const horariosPorDia = useMemo(() => {
    return DIAS_SEMANA.reduce((acc, dia) => {
      acc[dia] = horarioDetalle.horarios
        .filter((horario) => horario.dia === dia)
        .sort((a, b) => String(a.horaInicio).localeCompare(String(b.horaInicio)));
      return acc;
    }, {});
  }, [horarioDetalle.horarios]);
  const conteoTab = {
    horario: horarioDetalle.horarios.length,
    aprendices: detalle?.aprendices ?? 0,
    alertas: alertas?.totalHistorial ?? alertas?.total ?? 0,
  };

  const hayFiltrosAlertas = Object.values(filtrosAlertas).some(Boolean);

  const alertasFiltradas = useMemo(() => {
    const lista = alertas?.lista || [];
    const textoBusqueda = normalizarTexto(filtrosAlertas.busqueda);

    return lista.filter((alerta) => {
      const coincideTexto = !textoBusqueda || normalizarTexto(
        `${alerta.aprendiz} ${alerta.grupo} ${alerta.tipo} ${alerta.detalle}`
      ).includes(textoBusqueda);
      const coincideTipo = !filtrosAlertas.tipo || alerta.tipoValor === filtrosAlertas.tipo;
      const coincideSeveridad = !filtrosAlertas.severidad || alerta.severidadValor === filtrosAlertas.severidad;
      const coincideEstado = !filtrosAlertas.estado || alerta.estadoValor === filtrosAlertas.estado;
      const coincideFecha = !filtrosAlertas.fecha || normalizarFechaInput(alerta.fechaRaw) === filtrosAlertas.fecha;

      return coincideTexto && coincideTipo && coincideSeveridad && coincideEstado && coincideFecha;
    });
  }, [alertas, filtrosAlertas]);

  const totalPaginasAprendices = Math.max(1, Math.ceil(aprendicesGrupo.length / REGISTROS_POR_PAGINA));
  const paginaAprendicesSegura = Math.min(paginaAprendices, totalPaginasAprendices);
  const inicioAprendices = (paginaAprendicesSegura - 1) * REGISTROS_POR_PAGINA;
  const aprendicesGrupoPagina = aprendicesGrupo.slice(inicioAprendices, inicioAprendices + REGISTROS_POR_PAGINA);
  const desdeAprendices = aprendicesGrupo.length === 0 ? 0 : inicioAprendices + 1;
  const hastaAprendices = Math.min(inicioAprendices + REGISTROS_POR_PAGINA, aprendicesGrupo.length);

  const totalPaginasAlertas = Math.max(1, Math.ceil(alertasFiltradas.length / REGISTROS_POR_PAGINA));
  const paginaAlertasSegura = Math.min(paginaAlertas, totalPaginasAlertas);
  const inicioAlertas = (paginaAlertasSegura - 1) * REGISTROS_POR_PAGINA;
  const alertasPagina = alertasFiltradas.slice(inicioAlertas, inicioAlertas + REGISTROS_POR_PAGINA);
  const desdeAlertas = alertasFiltradas.length === 0 ? 0 : inicioAlertas + 1;
  const hastaAlertas = Math.min(inicioAlertas + REGISTROS_POR_PAGINA, alertasFiltradas.length);

  /* -- funciones de edición (existentes) -- */
  function cambiarForm(e) {
    const { name, value } = e.target;
    setErrorDetalle("");
    setDetalleForm(p => ({ ...p, [name]: value }));
  }

  function cambiarFiltroAlertas(campo, valor) {
    setFiltrosAlertas((prev) => ({ ...prev, [campo]: valor }));
    setPaginaAlertas(1);
  }

  function limpiarFiltrosAlertas() {
    setFiltrosAlertas({ ...FILTROS_ALERTAS_INICIALES });
    setPaginaAlertas(1);
  }

  function cambiarPaginaAprendices(nuevaPagina) {
    setPaginaAprendices(Math.min(Math.max(nuevaPagina, 1), totalPaginasAprendices));
  }

  function cambiarPaginaAlertas(nuevaPagina) {
    setPaginaAlertas(Math.min(Math.max(nuevaPagina, 1), totalPaginasAlertas));
  }

  function abrirCambioEstadoGrupo() {
    setEstadoGrupoTemporal(String(grupo?.estado || "ACTIVO").toUpperCase());
    setModalEstadoGrupo(true);
  }

  function guardarCambioEstadoGrupo() {
    if (!estadoGrupoTemporal) return;
    setGrupo((actual) => ({ ...actual, estado: estadoGrupoTemporal }));
    setErrorDetalle("Cambio de estado preparado en frontend. Falta conectar el endpoint para persistirlo.");
    setModalEstadoGrupo(false);
  }

  async function cargarInstructoresDisponibles() {
    setCargandoInstructores(true);
    setErrorInstructorLider("");
    try {
      const { data } = await api.get("/api/groups/instructores-disponibles");
      setInstructoresDisponibles(extraerLista(payload(data), "instructores"));
    } catch (errorInstructores) {
      setErrorInstructorLider(obtenerMensajeError(errorInstructores, "No fue posible cargar los instructores disponibles."));
      setInstructoresDisponibles([]);
    } finally {
      setCargandoInstructores(false);
    }
  }

  function abrirCambioInstructorLider() {
    setInstructorLiderTemporal(String(grupo?.id_instructor_lider || grupo?.instructor_lider?.id_instructor || ""));
    setErrorInstructorLider("");
    setModalInstructorLider(true);
    cargarInstructoresDisponibles();
  }

  async function guardarCambioInstructorLider() {
    const idInstructor = Number.parseInt(instructorLiderTemporal, 10);
    if (!Number.isInteger(idInstructor) || idInstructor <= 0) {
      setErrorInstructorLider("Selecciona un instructor lider valido.");
      return;
    }

    try {
      setGuardandoInstructorLider(true);
      setErrorInstructorLider("");
      setErrorDetalle("");
      setMensaje("");

      const idGrupoGuardar = obtenerIdGrupoBackend(grupo, id);
      const { data } = await api.patch(`/api/groups/${idGrupoGuardar}/instructor-lider`, {
        id_instructor: idInstructor,
      });
      const grupoActualizado = data?.data || data;

      setGrupo(grupoActualizado);
      setModalInstructorLider(false);
      setMensaje("Instructor lider actualizado correctamente.");
      setConfirmarHorarioGrupo(true);
    } catch (errorGuardarLider) {
      const dataError = errorGuardarLider?.response?.data || {};
      setErrorInstructorLider(
        dataError.message ||
        dataError.error ||
        errorGuardarLider?.message ||
        "No fue posible actualizar el instructor lider."
      );
    } finally {
      setGuardandoInstructorLider(false);
    }
  }

  function abrirHorarioDesdeConfirmacion() {
    setConfirmarHorarioGrupo(false);
    setTabDetalle("horario");
    setGrupoHorario(grupo);
  }

  function abrirReasignacionHorario(horario) {
    setHorarioReasignando(horario);
    setGrupoHorario(grupo);
  }

  function iniciarEdicionGrupo() {
    if (!puedeEditarGrupo) return;
    setMensaje("");
    setErrorDetalle("");
    setModoEdicion(true);
  }

  function cancelar() {
    setModoEdicion(false);
    setErrorDetalle("");
    setDetalleForm({
      numero_ficha: grupo?.numero_ficha || "",
      jornada: grupo?.jornada || "",
      trimestres: obtenerTrimestresGrupo(grupo) || "",
      fecha_inicio: normalizarFechaInput(grupo?.fecha_inicio),
    });
  }

  function validarDetalleGrupo() {
    const trimestres = Number.parseInt(detalleForm.trimestres, 10);
    const errorFecha = validarRangoFechaInicio(detalleForm.fecha_inicio, rangoFechaInicio);
    if (errorFecha) return errorFecha;
    if (!detalleForm.jornada) return "La jornada es obligatoria.";
    if (!Number.isInteger(trimestres) || trimestres < 1) return "La duracion debe ser un numero de trimestres mayor a 0.";
    return "";
  }

  async function guardar() {
    if (!puedeEditarGrupo) return;

    const errorValidacion = validarDetalleGrupo();
    if (errorValidacion) {
      setErrorDetalle(errorValidacion);
      return;
    }

    try {
      setGuardandoDetalle(true);
      setErrorDetalle("");
      setMensaje("");

      const payloadActualizar = {
        ...detalleForm,
        fecha_inicio: normalizarFechaInput(detalleForm.fecha_inicio),
        trimestres: Number.parseInt(detalleForm.trimestres, 10),
      };

      const idGrupoGuardar = obtenerIdGrupoBackend(grupo, id);
      await api.put(`/api/groups/${idGrupoGuardar}`, payloadActualizar);

      const { grupoBackend: grupoConfirmado, listaAprendices } = await consultarGrupoBase(idGrupoGuardar);
      const pendientes = camposNoPersistidos(grupoConfirmado, payloadActualizar);

      if (pendientes.length) {
        setGrupo(grupoConfirmado);
        throw new Error(
          `El backend recibio la solicitud, pero al consultar de nuevo no devolvio el cambio en: ${pendientes.join(", ")}.`
        );
      }

      const alertasActuales = alertas || normalizarAlertas([], listaAprendices);
      const metricasGrupo = calcularMetricasGrupo(listaAprendices, alertasActuales, grupoConfirmado);

      setGrupo({
        ...grupoConfirmado,
        fecha_fin:
          grupoConfirmado?.fecha_fin ||
          calcularFechaFinLocal(payloadActualizar.fecha_inicio, payloadActualizar.trimestres, grupo?.fecha_fin),
      });
      setAprendicesGrupo(listaAprendices);
      setMetricas(metricasGrupo);
      setAsistencia(construirAsistencia(metricasGrupo, listaAprendices, grupoConfirmado));
      setDetalleForm((actual) => ({
        ...actual,
        fecha_inicio: payloadActualizar.fecha_inicio,
        jornada: payloadActualizar.jornada,
        trimestres: payloadActualizar.trimestres,
      }));
      setModoEdicion(false);
      setMensaje("Grupo actualizado correctamente.");
    } catch (e) {
      setErrorDetalle(obtenerMensajeError(e, "No fue posible actualizar el grupo."));
    } finally {
      setGuardandoDetalle(false);
    }
  }

  function abrirEdicionAprendiz(aprendiz) {
    if (!puedeEditarGrupo) return;
    setAprendizEditando(aprendiz);
    setErrorAprendiz("");
    setAprendizForm({
      id_usuario: obtenerIdUsuarioAprendiz(aprendiz),
      nombres: obtenerPersona(aprendiz).nombres || aprendiz?.nombres || "",
      apellidos: obtenerPersona(aprendiz).apellidos || aprendiz?.apellidos || "",
      tipo_documento: obtenerTipoDocumentoAprendiz(aprendiz),
      numero_documento: obtenerDocumentoAprendiz(aprendiz) === "-" ? "" : obtenerDocumentoAprendiz(aprendiz),
      email: obtenerEmailAprendiz(aprendiz),
      telefono: obtenerTelefonoAprendiz(aprendiz),
    });
  }

  async function abrirPerfilAprendiz(aprendiz) {
    setPerfilAprendiz(aprendiz);
    setErrorPerfil("");

    const idAprendiz = obtenerIdAprendiz(aprendiz);
    if (!idAprendiz) return;

    try {
      setCargandoPerfil(true);
      const { data } = await api.get(`/api/apprentices/${idAprendiz}`);
      setPerfilAprendiz(extraerAprendizRespuesta(payload(data), aprendiz));
    } catch (e) {
      setErrorPerfil(obtenerMensajeError(e, "No fue posible cargar el perfil completo del aprendiz."));
    } finally {
      setCargandoPerfil(false);
    }
  }

  function cerrarPerfilAprendiz() {
    setPerfilAprendiz(null);
    setCargandoPerfil(false);
    setErrorPerfil("");
  }

  function cerrarEdicionAprendiz() {
    setAprendizEditando(null);
    setAprendizForm(APRENDIZ_FORM_VACIO);
    setGuardandoAprendiz(false);
    setErrorAprendiz("");
  }

  function cambiarAprendizForm(e) {
    const { name, value } = e.target;
    setAprendizForm((actual) => ({ ...actual, [name]: value }));
  }

  function aplicarCambiosAprendiz(aprendiz, payloadEditar) {
    const personaActual = obtenerPersona(aprendiz);
    return {
      ...aprendiz,
      ...payloadEditar,
      usuario: {
        ...(aprendiz.usuario || {}),
        email: payloadEditar.email,
        persona: {
          ...personaActual,
          nombres: payloadEditar.nombres,
          apellidos: payloadEditar.apellidos,
          tipo_documento: payloadEditar.tipo_documento,
          numero_documento: payloadEditar.numero_documento,
          telefono: payloadEditar.telefono,
        },
      },
    };
  }

  async function guardarEdicionAprendiz() {
    if (!aprendizForm.id_usuario) {
      setErrorAprendiz("No se encontro el usuario asociado al aprendiz.");
      return;
    }

    try {
      setGuardandoAprendiz(true);
      const token = localStorage.getItem("access") || localStorage.getItem("token");
      const payloadEditar = {
        email: aprendizForm.email.trim(),
        tipo_documento: aprendizForm.tipo_documento,
        numero_documento: aprendizForm.numero_documento.trim(),
        nombres: aprendizForm.nombres.trim(),
        apellidos: aprendizForm.apellidos.trim(),
        telefono: aprendizForm.telefono.trim(),
      };

      const res = await fetch(`/api/users/${aprendizForm.id_usuario}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadEditar),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || "No fue posible actualizar el aprendiz");

      const idEditado = String(obtenerIdAprendiz(aprendizEditando) ?? "");
      setAprendicesGrupo((actuales) =>
        actuales.map((item) =>
          String(obtenerIdAprendiz(item) ?? "") === idEditado
            ? aplicarCambiosAprendiz(item, payloadEditar)
            : item
        )
      );
      setMensaje("Aprendiz actualizado correctamente.");
      cerrarEdicionAprendiz();
    } catch (e) {
      setErrorAprendiz(e?.message || "No fue posible actualizar el aprendiz.");
      setGuardandoAprendiz(false);
    }
  }

  if (cargando) return <div className="fichas-modulo fichas-detail-state"><p>Cargando información de la ficha...</p></div>;
  if (error || !detalle) return (
    <div className="fichas-modulo fichas-detail-state">
      <div className="fichas-alerta error">{error || "No se pudo cargar la información del grupo."}</div>
      <button className="fichas-btn-cancelar" onClick={() => navigate(rutaRegreso)}>Volver a Grupos</button>
    </div>
  );

  /* -- render -- */
  const asistenciaPeriodo = asistencia?.[periodoAsist.toLowerCase()];
  const hayDatosAsistencia = Boolean(asistencia?.tieneDatos && asistenciaPeriodo);
  const idPerfilAprendiz = String(obtenerIdAprendiz(perfilAprendiz) ?? "");
  const datosPerfilAprendiz = perfilAprendiz
    ? construirPerfilAprendiz(perfilAprendiz, detalle, alertas?.porAprendiz?.[idPerfilAprendiz] || {})
    : null;

  return (
    <div className="fichas-modulo fichas-detail-page fichas-detail-page-v2">
      <button className="fichas-detail-back" onClick={() => navigate(rutaRegreso)}><ArrowLeft size={16} /> {textoRegreso}</button>
      {mensaje && <div className="grupos-alert info">{mensaje}</div>}
      {errorDetalle && <div className="grupos-alert danger">{errorDetalle}</div>}

      {confirmarHorarioGrupo && (
        <div className="grupos-alert info grupos-confirmacion-horario">
          <span>¿Quieres agregarle un horario a la ficha {detalle.ficha}</span>
          <div>
            <button type="button" className="grupos-primary-btn" onClick={abrirHorarioDesdeConfirmacion}>Si</button>
            <button type="button" className="grupos-secondary-btn" onClick={() => setConfirmarHorarioGrupo(false)}>No</button>
          </div>
        </div>
      )}

      {/* -- BANNER -- */}
      <section className="fichas-banner">
        <div className="gd-banner-inner">
          <div>
            <div className="fichas-banner-title-row">
              <h1>{detalle.programa}</h1>
              <span className={`fichas-banner-badge ${detalle.estadoClase}`}>{detalle.estadoTexto}</span>
            </div>
            <p>Ficha {detalle.ficha} · {detalle.jornada} · Instructor: {detalle.instructor}</p>
          </div>
        </div>
      </section>

      {/* -- KPIs -- */}
      <section className="gd-kpi-grid">
        {kpis.map(({ label, valor, sub, cls }) => (
          <article key={label} className={`gd-kpi-card ${cls}`}>
            <span className="gd-kpi-label">{label}</span>
            <strong className="gd-kpi-valor">{valor}</strong>
            <small className="gd-kpi-sub">{sub}</small>
          </article>
        ))}
      </section>

      <nav className="gd-tabs" aria-label="Secciones de la ficha">
        {tabsDetalle.map(({ id: tabId, label, Icono }) => (
          <button
            key={tabId}
            type="button"
            className={tabDetalle === tabId ? "active" : ""}
            onClick={() => setTabDetalle(tabId)}
          >
            <Icono size={16} />
            <span>{label}</span>
            {tabId !== "resumen" && <small>{conteoTab[tabId] ?? 0}</small>}
          </button>
        ))}
      </nav>

      {tabDetalle === "resumen" && (
        <section className="gd-tab-panel gd-resumen-grid">
          <article className="fichas-panel gd-chart-card gd-panel-priority">
            <div className="gd-card-header">
              <h2>Asistencia - {periodoAsist}</h2>
              <div className="gd-period-btns">
                {["Hoy", "Semana", "Mes"].map(p => (
                  <button key={p} type="button" className={`gd-period-btn${periodoAsist === p ? " active" : ""}`} onClick={() => setPeriodoAsist(p)}>{p}</button>
                ))}
              </div>
            </div>
            {hayDatosAsistencia ? (
              <div className="gd-bar-chart">
                <div className="gd-bar-scale">
                  {["100%","75%","50%","25%","0%"].map(v => <span key={v}>{v}</span>)}
                </div>
                <div className="gd-bars-wrap">
                  {BARRA_ASISTENCIA.map(({ clave, label, color }) => {
                    const pct = asistenciaPeriodo?.[clave] ?? 0;
                    return (
                      <div key={clave} className="gd-bar-item">
                        <span>{pct}%</span>
                        <div className="gd-bar-track">
                          <span className="gd-bar-fill" style={{ height: `${pct}%`, background: color }} />
                        </div>
                        <small>{label}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="gd-chart-empty">
                No hay datos de asistencia registrados para este periodo.
              </div>
            )}
          </article>

          <article className="fichas-panel gd-summary-card">
            <div className="gd-card-header">
              <div>
                <h2>Datos clave</h2>
                <p className="gd-card-kicker">Ficha {detalle.ficha} · {detalle.programa}</p>
              </div>
              {puedeEditarGrupo && (
              <div className="gd-header-actions">
                {modoEdicion ? (
                  <>
                    <button type="button" className="grupos-secondary-btn" onClick={cancelar} disabled={guardandoDetalle}>Cancelar</button>
                    <button type="button" className="grupos-primary-btn" onClick={guardar} disabled={guardandoDetalle}>
                      <Save size={15} /> {guardandoDetalle ? "Guardando..." : "Guardar"}
                    </button>
                  </>
                ) : (
                  <button type="button" className="grupos-secondary-btn" onClick={iniciarEdicionGrupo}><Edit3 size={15} /> Editar</button>
                )}
              </div>
              )}
            </div>

            <div className="gd-summary-grid">
              <div className="gd-summary-item">
                <span>Instructor lider</span>
                <strong>{detalle.instructor}</strong>
              </div>
              <div className="gd-summary-item">
                <span>Area</span>
                <strong>{detalle.area}</strong>
              </div>
              <div className="gd-summary-item">
                <span>Fecha inicio</span>
                {puedeEditarGrupo && modoEdicion ? (
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={detalleForm.fecha_inicio}
                    min={rangoFechaInicio.min}
                    max={rangoFechaInicio.max}
                    onChange={cambiarForm}
                    className="gd-inline-input"
                  />
                ) : <strong>{detalle.fechaInicio}</strong>}
              </div>
              <div className="gd-summary-item">
                <span>Fecha fin</span>
                <strong>{detalle.fechaFin}</strong>
              </div>
              <div className="gd-summary-item">
                <span>Jornada</span>
                {puedeEditarGrupo && modoEdicion ? (
                  <select name="jornada" value={detalleForm.jornada} onChange={cambiarForm} className="gd-inline-input">
                    <option value="Manana">Manana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                ) : <strong>{detalle.jornada}</strong>}
              </div>
              <div className="gd-summary-item">
                <span>Duracion</span>
                {puedeEditarGrupo && modoEdicion ? <input type="number" name="trimestres" value={detalleForm.trimestres} onChange={cambiarForm} className="gd-inline-input" /> : <strong>{detalle.trimestres} trimestres</strong>}
              </div>
            </div>

            <div className="gd-summary-timeline">
              <div className="gd-mini-timeline-head">
                <span>Progreso de ficha</span>
                <strong>{formatearTotalTrimestres(detalle.trimestres)}</strong>
              </div>
              <div className="gd-trimestre-track gd-trimestre-track-compact">
                {Array.from({ length: detalle.trimestres || 6 }).map((_, i) => (
                  <div key={i} className="gd-trimestre-step">
                    <div className="gd-trimestre-dot">T{i + 1}</div>
                    {i < (detalle.trimestres || 6) - 1 && <div className="gd-trimestre-line" />}
                  </div>
                ))}
              </div>
              <div className="gd-summary-foot">
                <span>Etapa productiva</span>
                <strong>{detalle.inicioProductiva}</strong>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* -- FICHA DETALLE / INFO GENERAL -- */}
      {tabDetalle === "horario" && (
        <article className="fichas-panel gd-tab-panel gd-horario-detail">
          <div className="gd-card-header">
            <div>
              <h2>Horario de la ficha</h2>
              <p className="gd-card-kicker">Ficha {detalle.ficha} - {detalle.jornada}</p>
            </div>
            <div className="gd-header-actions">
              <button type="button" className="grupos-secondary-btn" onClick={cargarHorarioBackend} disabled={cargandoHorario}>
                <RefreshCw size={15} />
                {cargandoHorario ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>

          {cargandoHorario && (
            <div className="grupos-horario-sample">
              Cargando horario guardado...
            </div>
          )}

          {errorHorario && <div className="grupos-horario-form-msg error">{errorHorario}</div>}

          <div className="grupos-horario-week">
            {DIAS_SEMANA.map((dia) => (
              <article key={dia} className="grupos-horario-day">
                <h3>{dia}</h3>
                {horariosPorDia[dia]?.length ? (
                  horariosPorDia[dia].map((horario) => (
                      <div
                        className={`grupos-horario-slot ${puedeGestionarHorario ? "editable" : ""}`}
                        key={horario.id}
                        role={puedeGestionarHorario ? "button" : undefined}
                        tabIndex={puedeGestionarHorario ? 0 : undefined}
                        title={puedeGestionarHorario ? "Clic para reasignar horario" : undefined}
                        onClick={() => {
                          if (puedeGestionarHorario) abrirReasignacionHorario(horario);
                        }}
                        onKeyDown={(evento) => {
                          if (!puedeGestionarHorario) return;
                          if (evento.key === "Enter" || evento.key === " ") {
                            evento.preventDefault();
                            abrirReasignacionHorario(horario);
                          }
                        }}
                      >
                        <div className="grupos-horario-slot-head">
                          <strong>{horario.horaInicio} - {horario.horaFin}</strong>
                          {puedeGestionarHorario && <span className="grupos-horario-edit-chip">Editar</span>}
                        </div>
                        <span>{horario.actividad}</span>
                        <small>
                          <b>{obtenerInicialesHorario(horario.instructor)}</b>
                          <span>{horario.instructor}</span>
                        </small>
                      </div>
                  ))
                ) : (
                  <p>Sin bloques</p>
                )}
              </article>
            ))}
          </div>
        </article>
      )}

      <article className="fichas-panel gd-legacy-hidden">
        <div className="gd-card-header" style={{ marginBottom: 18 }}>
          <h2>Ficha {detalle.ficha} - {detalle.programa}</h2>
          {puedeEditarGrupo && (
          <div className="gd-header-actions">
            <span className={`fichas-banner-badge ${detalle.estadoClase}`}>{detalle.estadoTexto}</span>
            {modoEdicion ? (
              <>
                <button type="button" className="grupos-secondary-btn" onClick={cancelar} disabled={guardandoDetalle}>Cancelar</button>
                <button type="button" className="grupos-primary-btn" onClick={guardar} disabled={guardandoDetalle}>
                  <Save size={15} /> {guardandoDetalle ? "Guardando..." : "Guardar"}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="grupos-secondary-btn" onClick={abrirCambioEstadoGrupo}>Cambiar estado</button>
                <button type="button" className="grupos-secondary-btn" onClick={abrirCambioInstructorLider} data-testid="group-leader-change-button">Cambiar lider</button>
                <button type="button" className="grupos-secondary-btn" onClick={iniciarEdicionGrupo}><Edit3 size={15} /> Editar</button>
              </>
            )}
          </div>
          )}
        </div>
        <div style={{ width: '100%' }}>
          {/* columna izquierda */}
          <div className="gd-info-col" style={{ flex: 1 }}>
            <p className="gd-info-section-label" style={{ textAlign: 'center', fontSize: '13px', marginBottom: '24px' }}>Información General</p>
            <div className="gd-info-rows" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px 16px' }}>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Instructor líder</span><strong style={{ fontSize: '15px', textAlign: 'center' }}>{detalle.instructor}</strong></div>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Área</span><strong style={{ textAlign: 'center', fontSize: '15px' }}>{detalle.area}</strong></div>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Fecha inicio</span>
                {puedeEditarGrupo && modoEdicion ? (
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={detalleForm.fecha_inicio}
                    min={rangoFechaInicio.min}
                    max={rangoFechaInicio.max}
                    onChange={cambiarForm}
                    className="gd-inline-input"
                  />
                ) : <strong style={{ fontSize: '15px', textAlign: 'center' }}>{detalle.fechaInicio}</strong>}
              </div>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Fecha fin</span><strong style={{ fontSize: '15px', textAlign: 'center' }}>{detalle.fechaFin}</strong></div>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Etapa productiva</span><strong style={{ fontSize: '15px', textAlign: 'center' }}>{detalle.inicioProductiva}</strong></div>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Duración</span>
                {puedeEditarGrupo && modoEdicion ? <input type="number" name="trimestres" value={detalleForm.trimestres} onChange={cambiarForm} className="gd-inline-input" style={{ width: 80 }} /> : <strong style={{ fontSize: '15px', textAlign: 'center' }}>{detalle.trimestres} trimestres</strong>}
              </div>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Jornada</span>
                {puedeEditarGrupo && modoEdicion ? (
                  <select name="jornada" value={detalleForm.jornada} onChange={cambiarForm} className="gd-inline-input">
                    <option value="Manana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                ) : <strong style={{ fontSize: '15px', textAlign: 'center' }}>{detalle.jornada}</strong>}
              </div>
              <div className="gd-info-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'center', gap: '6px' }}><span>Trimestre actual</span><strong style={{ fontSize: '15px', textAlign: 'center' }}>{metricas?.trimestreActual ?? "-"}</strong></div>
            </div>
          </div>
        </div>
      </article>

      {/* -- FILA PRINCIPAL: asistencia + línea de tiempo -- */}
      <section className="gd-main-grid gd-legacy-hidden">
        {/* Asistencia */}
        <article className="fichas-panel gd-chart-card">
          <div className="gd-card-header">
            <h2>Asistencia - {periodoAsist}</h2>
            <div className="gd-period-btns">
              {["Hoy", "Semana", "Mes"].map(p => (
                <button key={p} type="button" className={`gd-period-btn${periodoAsist === p ? " active" : ""}`} onClick={() => setPeriodoAsist(p)}>{p}</button>
              ))}
            </div>
          </div>
          {hayDatosAsistencia ? (
            <div className="gd-bar-chart">
              <div className="gd-bar-scale">
                {["100%","75%","50%","25%","0%"].map(v => <span key={v}>{v}</span>)}
              </div>
              <div className="gd-bars-wrap">
                {BARRA_ASISTENCIA.map(({ clave, label, color }) => {
                  const pct = asistenciaPeriodo?.[clave] ?? 0;
                  return (
                    <div key={clave} className="gd-bar-item">
                      <span>{pct}%</span>
                      <div className="gd-bar-track">
                        <span className="gd-bar-fill" style={{ height: `${pct}%`, background: color }} />
                      </div>
                      <small>{label}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="gd-chart-empty">
              No hay datos de asistencia registrados para este periodo.
            </div>
          )}
        </article>

        {/* Línea de tiempo */}
        <article className="fichas-panel gd-timeline-card">
          <div className="gd-card-header">
            <h2>Línea de Tiempo - Ficha {detalle.ficha}</h2>
            <span className={`fichas-banner-badge ${detalle.estadoClase}`}>{detalle.estadoTexto}</span>
          </div>
          <p className="gd-timeline-sub">{detalle.programa} · {detalle.jornada} · Instructor: {detalle.instructor}</p>
          <div className="gd-trimestre-track">
            {Array.from({ length: detalle.trimestres || 6 }).map((_, i) => (
              <div key={i} className="gd-trimestre-step">
                <div className="gd-trimestre-dot">T{i + 1}</div>
                {i < (detalle.trimestres || 6) - 1 && <div className="gd-trimestre-line" />}
              </div>
            ))}
          </div>
          <div className="gd-timeline-rows">
            <div className="gd-timeline-row"><span>Inicio de ficha</span><strong>{detalle.fechaInicio}</strong></div>
            <div className="gd-timeline-row"><span>Fin de ficha</span><strong>{detalle.fechaFin}</strong></div>
            <div className="gd-timeline-row"><span>Inicio etapa productiva</span><strong>{detalle.inicioProductiva}</strong></div>
          </div>
        </article>
      </section>

      {/* -- TABLA APRENDICES -- */}
      {tabDetalle === "aprendices" && (
      <article className="fichas-panel gd-tab-panel">
        <div className="fichas-panel-header-actions">
          <h2>Aprendices de la Ficha {detalle.ficha}</h2>
          <span className="gd-count-chip">Mostrando {desdeAprendices}-{hastaAprendices} de {aprendicesGrupo.length}</span>
        </div>
        <div className="gd-table-wrap">
          <table className="gd-table">
            <thead>
              <tr>
                <th>Aprendiz</th>
                <th>Documento</th>
                <th>Estado Formativo</th>
                <th>Alertas</th>
                <th>Inasistencias</th>
                {(puedeEditarGrupo || puedeVerPerfilAprendiz) && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {aprendicesGrupoPagina.length > 0 ? aprendicesGrupoPagina.map((item) => {
                const idAprendiz = String(obtenerIdAprendiz(item) ?? "");
                const resumenAlertas = alertas?.porAprendiz?.[idAprendiz] || {};
                const nombre = obtenerNombreAprendiz(item);
                const doc = obtenerDocumentoAprendiz(item);
                const estado = obtenerEstadoFormativoAprendiz(item);
                const alertasCnt = resumenAlertas.total ?? numeroSeguro(item.alertas) ?? 0;
                const inasis = obtenerInasistenciasAprendiz(item) || resumenAlertas.inasistencias || 0;
                const puedeEditar = puedeEditarGrupo && Boolean(obtenerIdUsuarioAprendiz(item));
                return (
                  <tr key={item.id_aprendiz || item.id || doc}>
                    <td><strong>{nombre}</strong></td>
                    <td>{doc}</td>
                    <td>{estado}</td>
                    <td className={alertasCnt > 0 ? "gd-num-alerta" : ""}>{alertasCnt}</td>
                    <td className={inasis > 0 ? "gd-num-inasis" : ""}>{inasis}</td>
                    {(puedeEditarGrupo || puedeVerPerfilAprendiz) && (
                    <td>
                      {puedeVerPerfilAprendiz ? (
                        <button
                          type="button"
                          className="gd-action-btn gd-action-btn-icon"
                          onClick={() => abrirPerfilAprendiz(item)}
                          title="Ver perfil"
                          aria-label={`Ver perfil de ${nombre}`}
                        >
                          <Eye size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="gd-action-btn"
                          onClick={() => abrirEdicionAprendiz(item)}
                          disabled={!puedeEditar}
                          title={puedeEditar ? "Editar aprendiz" : "Sin usuario asociado"}
                        >
                          <Edit3 size={14} />
                          Editar
                        </button>
                      )}
                    </td>
                    )}
                  </tr>
                );
              }) : (
                <tr><td colSpan={(puedeEditarGrupo || puedeVerPerfilAprendiz) ? 6 : 5} className="gd-empty">No hay aprendices registrados en esta ficha.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {aprendicesGrupo.length > 0 && (
          <SimaPagination
            desde={desdeAprendices}
            hasta={hastaAprendices}
            total={aprendicesGrupo.length}
            entidad="aprendices"
            paginaActual={paginaAprendicesSegura}
            totalPaginas={totalPaginasAprendices}
            onCambiarPagina={cambiarPaginaAprendices}
          />
        )}
      </article>
      )}

      {/* -- TABLA ALERTAS (Solo Instructor) -- */}
      {puedeVerAlertas && tabDetalle === "alertas" && (
        <article className="fichas-panel gd-tab-panel">
        <div className="fichas-panel-header-actions">
          <h2>Alertas de la Ficha {detalle.ficha}</h2>
          <span className="gd-count-chip">Mostrando {desdeAlertas}-{hastaAlertas} de {alertasFiltradas.length}</span>
        </div>

        <div className="gd-alertas-toolbar">
          <div className="gd-alertas-search">
            <Search size={16} />
            <input
              value={filtrosAlertas.busqueda}
              onChange={(e) => cambiarFiltroAlertas("busqueda", e.target.value)}
              placeholder="Buscar aprendiz o descripcion"
            />
          </div>

          <select
            value={filtrosAlertas.tipo}
            onChange={(e) => cambiarFiltroAlertas("tipo", e.target.value)}
            aria-label="Filtrar por tipo de alerta"
          >
            <option value="">Todos los tipos</option>
            <option value="ASISTENCIAL">Asistencial</option>
            <option value="OBSERVACIONES_RECURRENTES">Observaciones recurrentes</option>
            <option value="CONVIVENCIAL">Convivencial</option>
          </select>

          <select
            value={filtrosAlertas.severidad}
            onChange={(e) => cambiarFiltroAlertas("severidad", e.target.value)}
            aria-label="Filtrar por severidad"
          >
            <option value="">Todas las severidades</option>
            <option value="LEVE">Leve</option>
            <option value="MODERADA">Moderada</option>
            <option value="GRAVE">Grave</option>
            <option value="CRITICA">Critica</option>
          </select>

          <select
            value={filtrosAlertas.estado}
            onChange={(e) => cambiarFiltroAlertas("estado", e.target.value)}
            aria-label="Filtrar por estado"
            data-testid="alert-filter-status"
          >
            <option value="">Todos los estados</option>
            <option value="ABIERTA">Abierta</option>
            <option value="CERRADA">Cerrada</option>
          </select>

          <input
            type="date"
            value={filtrosAlertas.fecha}
            onChange={(e) => cambiarFiltroAlertas("fecha", e.target.value)}
            aria-label="Filtrar por fecha"
          />

          <button type="button" onClick={limpiarFiltrosAlertas}>
            <FilterX size={15} />
            Limpiar
          </button>
        </div>
        <div className="gd-table-wrap">
          <table className="gd-table gd-alerts-table" data-testid="alert-table">
            <thead>
              <tr>
                <th>Aprendiz</th>
                <th>Grupo</th>
                <th>Tipo</th>
                <th>Detalle</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Fuente</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {alertasPagina.length > 0 ? alertasPagina.map((a, i) => {
                const esManual  = a.fuente === "Manual";
                const esTardio  = typeof a.fecha === "string" && (a.fecha.toLowerCase().startsWith("hoy") || a.fecha.toLowerCase().startsWith("ayer"));
                return (
                  <tr key={inicioAlertas + i} data-testid="alert-row">
                    <td><strong>{a.aprendiz}</strong></td>
                    <td>{a.grupo || detalle.ficha}</td>
                    <td>{a.tipo}</td>
                    <td className={esManual ? "gd-td-link" : ""}>{a.detalle}</td>
                    <td><SeveridadLabel valor={a.severidad} /></td>
                    <td><span data-testid="alert-status-badge">{a.estado}</span></td>
                    <td className={esManual ? "gd-td-link" : ""}>{a.fuente}</td>
                    <td className={esTardio ? "gd-td-link" : ""}>{a.fecha}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="gd-empty">
                    {hayFiltrosAlertas ? "No hay alertas para los filtros aplicados." : "No hay alertas registradas para esta ficha."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {alertasFiltradas.length > 0 && (
          <SimaPagination
            desde={desdeAlertas}
            hasta={hastaAlertas}
            total={alertasFiltradas.length}
            entidad="alertas"
            paginaActual={paginaAlertasSegura}
            totalPaginas={totalPaginasAlertas}
            onCambiarPagina={cambiarPaginaAlertas}
          />
        )}
        </article>
      )}

      {/* -- GRÁFICAS: severidad (Solo Instructor) -- */}
      {puedeVerAlertas && tabDetalle === "alertas" && (
        <section className="gd-tab-panel">
        {/* Alertas por Severidad */}
        <article className="fichas-panel gd-sev-chart-card">
          <div className="gd-card-header"><h2>Alertas por Severidad</h2></div>
          <div className="gd-sev-chart">
            <div className="gd-sev-scale">
              {[8, 6, 4, 2, 0].map(v => <span key={v}>{v}</span>)}
            </div>
            <div className="gd-sev-bars" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {BARRAS_SEVERIDAD.map(({ clave, label, color }) => {
                const val = alertas?.porSeveridad?.[clave] ?? 0;
                const max = Math.max(...BARRAS_SEVERIDAD.map(b => alertas?.porSeveridad?.[b.clave] ?? 0), 1);
                return (
                  <div key={clave} className="gd-sev-bar-item">
                    <span className="gd-sev-bar-val">{val}</span>
                    <div className="gd-sev-bar-track">
                      <span className="gd-sev-bar-fill" style={{ height: `${(val / max) * 100}%`, background: color }} />
                    </div>
                    <small>{label}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        </section>
      )}

      {datosPerfilAprendiz && (
        <div className="grupos-modal-backdrop" role="presentation" onClick={cerrarPerfilAprendiz}>
          <section
            className="grupos-modal gd-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfil-aprendiz-title"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="grupos-modal-header">
              <div>
                <span className="grupos-eyebrow">Perfil del aprendiz</span>
                <h2 id="perfil-aprendiz-title">{datosPerfilAprendiz.nombreCompleto}</h2>
                <p>Ficha {datosPerfilAprendiz.ficha} · {datosPerfilAprendiz.programa}</p>
              </div>
              <button type="button" className="grupos-close-btn" onClick={cerrarPerfilAprendiz} aria-label="Cerrar ventana">
                <X size={18} />
              </button>
            </div>

            <div className="gd-profile-body">
              <aside className="gd-profile-card">
                <div className="gd-profile-avatar">
                  {(datosPerfilAprendiz.nombres[0] || "A")}{(datosPerfilAprendiz.apellidos[0] || "")}
                </div>
                <span>{datosPerfilAprendiz.estadoFormativo}</span>
                <strong>{datosPerfilAprendiz.nombreCompleto}</strong>
                <small>{datosPerfilAprendiz.correo}</small>
              </aside>

              <div className="gd-profile-grid">
                <div><span>ID aprendiz</span><strong>{datosPerfilAprendiz.id}</strong></div>
                <div><span>Estado usuario</span><strong>{datosPerfilAprendiz.estadoUsuario}</strong></div>
                <div><span>Nombres</span><strong>{datosPerfilAprendiz.nombres}</strong></div>
                <div><span>Apellidos</span><strong>{datosPerfilAprendiz.apellidos}</strong></div>
                <div><span>Tipo documento</span><strong>{datosPerfilAprendiz.tipoDocumento}</strong></div>
                <div><span>Documento</span><strong>{datosPerfilAprendiz.documento}</strong></div>
                <div><span>Correo</span><strong>{datosPerfilAprendiz.correo}</strong></div>
                <div><span>Telefono</span><strong>{datosPerfilAprendiz.telefono}</strong></div>
                <div><span>Ficha</span><strong>{datosPerfilAprendiz.ficha}</strong></div>
                <div><span>Jornada</span><strong>{datosPerfilAprendiz.jornada}</strong></div>
                <div className="gd-profile-wide"><span>Programa</span><strong>{datosPerfilAprendiz.programa}</strong></div>
                <div><span>Fecha inicio</span><strong>{datosPerfilAprendiz.fechaInicio}</strong></div>
                <div><span>Fecha fin</span><strong>{datosPerfilAprendiz.fechaFin}</strong></div>
                <div><span>Alertas</span><strong>{datosPerfilAprendiz.alertas}</strong></div>
                <div><span>Alertas graves</span><strong>{datosPerfilAprendiz.alertasGraves}</strong></div>
                <div><span>Alertas moderadas</span><strong>{datosPerfilAprendiz.alertasModeradas}</strong></div>
                <div><span>Inasistencias</span><strong>{datosPerfilAprendiz.inasistencias}</strong></div>
              </div>
            </div>

            {cargandoPerfil && <div className="gd-profile-status">Cargando perfil completo...</div>}
            {errorPerfil && <div className="gd-edit-error">{errorPerfil}</div>}

            <div className="gd-edit-actions">
              <button type="button" className="grupos-primary-btn" onClick={cerrarPerfilAprendiz}>Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {aprendizEditando && (
        <div className="grupos-modal-backdrop" role="presentation" onClick={cerrarEdicionAprendiz}>
          <section
            className="grupos-modal gd-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editar-aprendiz-title"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="grupos-modal-header">
              <div>
                <span className="grupos-eyebrow">Editar aprendiz</span>
                <h2 id="editar-aprendiz-title">{`${aprendizForm.nombres} ${aprendizForm.apellidos}`.trim() || "Aprendiz"}</h2>
                <p>Ficha {detalle.ficha}</p>
              </div>
              <button type="button" className="grupos-close-btn" onClick={cerrarEdicionAprendiz} aria-label="Cerrar ventana">
                <X size={18} />
              </button>
            </div>

            <div className="gd-edit-form">
              <label>
                <span>Nombres</span>
                <input name="nombres" value={aprendizForm.nombres} onChange={cambiarAprendizForm} />
              </label>
              <label>
                <span>Apellidos</span>
                <input name="apellidos" value={aprendizForm.apellidos} onChange={cambiarAprendizForm} />
              </label>
              <label>
                <span>Tipo documento</span>
                <select name="tipo_documento" value={aprendizForm.tipo_documento} onChange={cambiarAprendizForm}>
                  <option value="">Seleccione</option>
                  <option value="CC">CC</option>
                  <option value="TI">TI</option>
                  <option value="CE">CE</option>
                  <option value="PEP">PEP</option>
                </select>
              </label>
              <label>
                <span>Documento</span>
                <input name="numero_documento" value={aprendizForm.numero_documento} onChange={cambiarAprendizForm} />
              </label>
              <label>
                <span>Correo</span>
                <input name="email" type="email" value={aprendizForm.email} onChange={cambiarAprendizForm} />
              </label>
              <label>
                <span>Telefono</span>
                <input name="telefono" value={aprendizForm.telefono} onChange={cambiarAprendizForm} />
              </label>
            </div>

            {errorAprendiz && (
              <div className="gd-edit-error">
                {errorAprendiz}
              </div>
            )}

            <div className="gd-edit-actions">
              <button type="button" className="grupos-secondary-btn" onClick={cerrarEdicionAprendiz}>
                Cancelar
              </button>
              <button type="button" className="grupos-primary-btn" onClick={guardarEdicionAprendiz} disabled={guardandoAprendiz}>
                <Save size={15} />
                {guardandoAprendiz ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {grupoHorario && puedeGestionarHorario && (
        <HorarioGrupoModal
          grupo={grupoHorario}
          onClose={() => {
            setGrupoHorario(null);
            setHorarioReasignando(null);
          }}
          horarioReasignando={horarioReasignando}
          onSaved={() => {
            setGrupoHorario(null);
            setHorarioReasignando(null);
            setTabDetalle("horario");
            setMensaje("Horario actualizado correctamente.");
          }}
        />
      )}

      {modalEstadoGrupo && (
        <div className="grupos-modal-backdrop" role="presentation">
          <section className="grupos-modal compact" role="dialog" aria-modal="true" aria-labelledby="estado-grupo-title">
            <div className="grupos-modal-header">
              <div>
                <span className="grupos-eyebrow">Estado de ficha</span>
                <h2 id="estado-grupo-title">Cambiar estado</h2>
                <p>Accion preparada en frontend hasta conectar el endpoint definitivo.</p>
              </div>
              <button type="button" className="grupos-close-btn" onClick={() => setModalEstadoGrupo(false)} aria-label="Cerrar ventana">
                <X size={18} />
              </button>
            </div>
            <div className="gd-edit-form">
              <label>
                <span>Estado</span>
                <select value={estadoGrupoTemporal} onChange={(e) => setEstadoGrupoTemporal(e.target.value)}>
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="CERRADO">CERRADO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                </select>
              </label>
            </div>
            <div className="gd-edit-actions">
              <button type="button" className="grupos-secondary-btn" onClick={() => setModalEstadoGrupo(false)}>Cancelar</button>
              <button type="button" className="grupos-primary-btn" onClick={guardarCambioEstadoGrupo}>Aplicar en vista</button>
            </div>
          </section>
        </div>
      )}

      {modalInstructorLider && (
        <div className="grupos-modal-backdrop" role="presentation">
          <section className="grupos-modal compact" role="dialog" aria-modal="true" aria-labelledby="lider-grupo-title" data-testid="group-leader-modal">
            <div className="grupos-modal-header">
              <div>
                <span className="grupos-eyebrow">Instructor lider</span>
                <h2 id="lider-grupo-title">Cambiar instructor lider</h2>
                <p>Selecciona el instructor activo que quedara como lider del grupo.</p>
              </div>
              <button type="button" className="grupos-close-btn" onClick={() => setModalInstructorLider(false)} aria-label="Cerrar ventana" disabled={guardandoInstructorLider}>
                <X size={18} />
              </button>
            </div>
            <div className="gd-edit-form">
              <label>
                <span>Instructor lider</span>
                <select
                  value={instructorLiderTemporal}
                  onChange={(e) => setInstructorLiderTemporal(e.target.value)}
                  disabled={cargandoInstructores || guardandoInstructorLider}
                  data-testid="group-leader-select"
                >
                  <option value="">
                    {cargandoInstructores ? "Cargando instructores..." : "Seleccione un instructor"}
                  </option>
                  {instructoresDisponibles.map((instructor) => (
                    <option key={instructor.id_instructor} value={instructor.id_instructor}>
                      {obtenerEtiquetaInstructor(instructor)}
                    </option>
                  ))}
                </select>
              </label>
              {errorInstructorLider && <div className="grupos-horario-form-msg error">{errorInstructorLider}</div>}
            </div>
            <div className="gd-edit-actions">
              <button
                type="button"
                className="grupos-secondary-btn"
                onClick={() => setModalInstructorLider(false)}
                disabled={guardandoInstructorLider}
                data-testid="group-leader-cancel-button"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="grupos-primary-btn"
                onClick={guardarCambioInstructorLider}
                disabled={cargandoInstructores || guardandoInstructorLider}
                data-testid="group-leader-save-button"
              >
                {guardandoInstructorLider ? "Guardando..." : "Guardar lider"}
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}

