import api from './api';

export function getRolActual() {
  return (localStorage.getItem('rol') || '').toLowerCase();
}

function mensajeError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message || 'Error en la comunicación con el servidor';
}

function limpiarParams(filtros = {}) {
  const p = {};
  Object.keys(filtros).forEach(k => {
    if (filtros[k] !== '' && filtros[k] !== null && filtros[k] !== undefined) {
      p[k] = k === 'estado' && filtros[k] === 'ACTIVA' ? 'ABIERTA' : filtros[k];
    }
  });
  return p;
}

function extraerListaRespuesta(res, llaves = []) {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];

  for (const llave of llaves) {
    if (Array.isArray(res[llave])) return res[llave];
  }

  if (res.data && res.data !== res) {
    return extraerListaRespuesta(res.data, llaves);
  }

  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.results)) return res.results;
  return [];
}

function nombreCompletoPersona(persona) {
  if (!persona) return '';
  return `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
}

function mapBackendAlerta(alerta) {
  if (!alerta) return alerta;

  const persona = alerta.aprendiz?.usuario?.persona;
  const nombreAprendiz = persona 
    ? `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() 
    : (alerta.aprendizNombre || '—');
  
  const documentoAprendiz = persona?.numero_documento || alerta.aprendizDocumento || '—';

  const creadorPersona = alerta.usuario_creador?.persona;
  const nombreResponsable = nombreCompletoPersona(creadorPersona)
    || alerta.usuario_creador?.email
    || (alerta.creada_por ? `ID Usuario ${alerta.creada_por}` : 'Sistema');

  return {
    ...alerta,
    id: alerta.id_alerta || alerta.id,
    fechaCreacion: alerta.fecha_alerta || alerta.fechaCreacion,
    tipoAlerta: alerta.tipo_alerta || alerta.tipoAlerta,
    origen: alerta.origen || alerta.origenAlerta,
    grupoCodigo: alerta.grupo?.numero_ficha || alerta.grupoCodigo,
    idGrupo: alerta.id_grupo || alerta.idGrupo,
    responsableNombre: nombreResponsable,
    responsable: {
      id: alerta.usuario_creador?.id_usuario || alerta.creada_por || null,
      nombre: nombreResponsable,
      email: alerta.usuario_creador?.email || '',
      documento: creadorPersona?.numero_documento || '',
    },
    aprendizNombre: nombreAprendiz,
    aprendizDocumento: documentoAprendiz,
    observacionesVinculadas: (alerta.alerta_observaciones || []).map(ao => ({
      id: ao.id_observacion,
      fecha: ao.observacion?.fecha_observacion || ao.fecha_asociacion,
      tipoObservacion: ao.observacion?.tipo_observacion || '',
      descripcion: ao.observacion?.descripcion || '—'
    }))
  };
}

export async function crearAlertaManual(payload) {
  try {
    const backendPayload = {
      id_aprendiz: payload.aprendizId,
      id_grupo: payload.grupoId,
      tipo_alerta: payload.tipoAlerta || 'CONVIVENCIAL',
      severidad: payload.severidad,
      descripcion: payload.descripcion
    };
    const { data } = await api.post('/api/alerts/manual', backendPayload);
    return { data: mapBackendAlerta(data.data || data), error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function crearAlertaDesdeObservaciones(payload) {
  try {
    const backendPayload = {
      id_aprendiz: Number(payload.aprendizId),
      id_grupo: Number(payload.grupoId),
      tipo_alerta: payload.tipoAlerta || 'CONVIVENCIAL',
      severidad: payload.severidad,
      descripcion: payload.descripcion,
      observationIds: (payload.observationIds || []).map(Number),
      notificar_coordinador: Boolean(payload.notificarCoordinador)
    };
    const { data } = await api.post('/api/alerts/from-observations', backendPayload);
    return { data: mapBackendAlerta(data.data || data), error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function obtenerAlertas(filtros = {}) {
  try {
    const params = limpiarParams(filtros);
    
    if (params.aprendizId) {
      params.id_aprendiz = params.aprendizId;
      delete params.aprendizId;
      delete params.aprendizBusqueda;
    }
    if (params.aprendizBusqueda) {
      params.q = params.aprendizBusqueda;
      delete params.aprendizBusqueda;
    }
    if (params.grupoId) {
      params.id_grupo = params.grupoId;
      delete params.grupoId;
    }
    if (params.tipoAlerta) {
      params.tipo_alerta = params.tipoAlerta;
      delete params.tipoAlerta;
    }
    if (params.fechaInicio) {
      params.fecha_desde = params.fechaInicio;
      delete params.fechaInicio;
    }
    if (params.fechaFin) {
      params.fecha_hasta = params.fechaFin;
      delete params.fechaFin;
    }
    
    if (params.pagina) {
      params.page = params.pagina;
      delete params.pagina;
    }
    if (params.limite) {
      params.limit = params.limite;
      delete params.limite;
    }

    const { data } = await api.get('/api/alerts', { params });
    const res = data?.data || data;
    let arr = res.alerts || res.alertas || res.data || (Array.isArray(res) ? res : []);

    if (Array.isArray(arr)) {
      arr = arr.map(mapBackendAlerta);
    }
    return { 
      data: { 
        data: arr, 
        total: res.total || arr.length,
        pagina: res.pagina || 1,
        totalPaginas: res.total_paginas || 1
      }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function obtenerAlertaPorId(id) {
  try {
    const { data } = await api.get(`/api/alerts/${id}`);
    const res = data?.data || data;
    return { data: mapBackendAlerta(res), error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function actualizarEstadoAlerta(id, nuevoEstado, justificacion = '') {
  try {
    const payload = { estado: nuevoEstado };
    if (justificacion) payload.justificacion_cierre = justificacion;
    
    const { data } = await api.patch(`/api/alerts/${id}/status`, payload);
    const res = data.data || data;
    return { data: mapBackendAlerta(res), error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function cerrarAlerta(id, justificacion) {
  return actualizarEstadoAlerta(id, 'CERRADA', justificacion);
}

export async function obtenerGruposAlertasCoordinador() {
  try {
    const { data: respGrupos } = await api.get('/api/groups', { params: { limit: 50 } });
    const listaGrupos = extraerListaRespuesta(respGrupos, ['grupos', 'fichas']);

    const { data: respAlertas } = await api.get('/api/alerts', { params: { limit: 50 } });
    const arrAlertas = extraerListaRespuesta(respAlertas, ['alerts', 'alertas']);

    const resumen = {};

    listaGrupos.forEach(grupo => {
      const idGrupo = grupo.id_grupo || grupo.id;
      const instructor = grupo.instructor_lider?.usuario?.persona;
      const nombreInstructor = instructor ? `${instructor.nombres} ${instructor.apellidos}`.trim() : (grupo.instructor_lider_nombre || 'Sin asignar');

      resumen[idGrupo] = {
        idGrupo: idGrupo,
        grupoCodigo: grupo.numero_ficha || String(idGrupo),
        instructorLider: nombreInstructor,
        totalAlertas: 0,
        leves: 0, moderadas: 0, graves: 0,
        ultimaAlerta: null
      };
    });

    const alertasMapeadas = arrAlertas.map(mapBackendAlerta);

    alertasMapeadas.forEach(alerta => {
      const idGrupo = alerta.id_grupo;
      if (!idGrupo) return;

      if (!resumen[idGrupo]) {
        resumen[idGrupo] = {
          idGrupo: idGrupo,
          grupoCodigo: alerta.grupoCodigo || String(idGrupo),
          instructorLider: alerta.responsableNombre || 'Sistema',
          totalAlertas: 0,
          leves: 0, moderadas: 0, graves: 0,
          ultimaAlerta: null
        };
      }

      if (alerta.estado !== 'CERRADA' && alerta.estado !== 'RESUELTA') {
        resumen[idGrupo].totalAlertas++;
        if (alerta.severidad === 'LEVE') resumen[idGrupo].leves++;
        if (alerta.severidad === 'MODERADA') resumen[idGrupo].moderadas++;
        if (alerta.severidad === 'GRAVE' || alerta.severidad === 'CRITICA') resumen[idGrupo].graves++;
      }
      
      const fechaAlerta = new Date(alerta.fechaCreacion);
      if (!resumen[idGrupo].ultimaAlerta || fechaAlerta > new Date(resumen[idGrupo].ultimaAlerta)) {
        resumen[idGrupo].ultimaAlerta = alerta.fechaCreacion;
      }
    });

    return { data: Object.values(resumen), error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function obtenerAlertasPorGrupo(grupoCodigo) {
  try {
    const { data } = await api.get('/api/alerts', { params: { id_grupo: grupoCodigo } });
    const res = data.data || data;
    let arr = res.alerts || res.alertas || res.data || (Array.isArray(res) ? res : []);
    if (Array.isArray(arr)) arr = arr.map(mapBackendAlerta);
    return { data: arr, error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function obtenerGrupos() {
  try {
    const { data } = await api.get('/api/groups');
    const lista = data.data?.grupos || data.data || data;
    return { data: Array.isArray(lista) ? lista : [], error: null };
  } catch (error) {
    return { data: [], error: mensajeError(error) };
  }
}

function mapAprendiz(aprendiz) {
  const persona = aprendiz?.usuario?.persona;
  const nombre = persona
    ? `${persona.nombres || ''} ${persona.apellidos || ''}`.trim()
    : aprendiz?.nombre;

  return {
    id: aprendiz?.id_aprendiz || aprendiz?.id,
    nombre: nombre || `ID ${aprendiz?.id_aprendiz || aprendiz?.id || ''}`,
    documento: persona?.numero_documento || aprendiz?.documento || '---',
    email: aprendiz?.usuario?.email || aprendiz?.email || '',
    raw: aprendiz
  };
}

export async function obtenerAprendicesPorGrupo(grupoId, filtros = {}) {
  try {
    const params = limpiarParams(filtros);
    if (params.busqueda) {
      params.q = params.busqueda;
      delete params.busqueda;
    }
    const { data } = await api.get(`/api/apprentices/grupo/${grupoId}`, { params });
    // El backend retorna { aprendices: [...], total, pagina, grupo }
    // dentro de la envoltura estándar { success, message, data: { ... } }
    const payload = data.data || data;
    const lista = payload.aprendices || payload.data || (Array.isArray(payload) ? payload : []);
    return { data: lista.map(mapAprendiz), error: null };
  } catch (error) {
    return { data: [], error: mensajeError(error) };
  }
}

export async function obtenerObservacionesAbiertasPorAprendiz(grupoId, aprendizId) {
  try {
    const { data } = await api.get(`/api/observations/apprentice/${aprendizId}`, {
      params: { estado: 'ABIERTA', id_grupo: grupoId }
    });
    const lista = data.data?.observaciones || data.data || data;
    if (Array.isArray(lista)) {
      return {
        data: lista.map(obs => ({
          id: obs.id_observacion || obs.id,
          tipo: obs.tipo_observacion,
          severidad: obs.severidad,
          descripcion: obs.descripcion,
          fecha: obs.fecha_observacion || obs.createdAt
        })),
        error: null
      };
    }
    return { data: [], error: null };
  } catch (error) {
    return { data: [], error: mensajeError(error) };
  }
}

export async function obtenerNotificaciones() {
  try {
    const { data } = await api.get('/api/notifications');
    const res = data.data || data;
    const lista = res?.notificaciones || res?.data || (Array.isArray(res) ? res : []);
    return { data: lista, error: null };
  } catch {
    return { data: [], error: null };
  }
}

export async function marcarNotificacionLeida(id) {
  try {
    const { data } = await api.patch(`/api/notifications/${id}/read`);
    return { data: data?.data || data, error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

export async function marcarTodasComoLeidas() {
  try {
    const { data } = await api.patch('/api/notifications/read-all');
    return { data, error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

function obtenerPayloadJustificacion(fuente = {}) {
  return fuente.data || fuente.metadata || fuente.detalle || fuente.payload || {};
}

function obtenerIdJustificacion(fuente = {}) {
  const payload = obtenerPayloadJustificacion(fuente);
  return (
    fuente.id_justificacion ||
    fuente.idJustificacion ||
    fuente.justificacion_id ||
    fuente.id_justificacion_asistencia ||
    fuente.idJustificacionAsistencia ||
    payload.id_justificacion ||
    payload.idJustificacion ||
    payload.justificacion_id ||
    payload.id_justificacion_asistencia ||
    payload.idJustificacionAsistencia ||
    ''
  );
}

function obtenerEndpointJustificacion(fuente = {}) {
  const payload = obtenerPayloadJustificacion(fuente);
  return (
    fuente.endpoint_resolucion ||
    fuente.endpointResolver ||
    fuente.resolver_endpoint ||
    fuente.url_resolucion ||
    payload.endpoint_resolucion ||
    payload.endpointResolver ||
    payload.resolver_endpoint ||
    payload.url_resolucion ||
    ''
  );
}

function endpointsResolverJustificacion(justificacion) {
  const idJustificacion = obtenerIdJustificacion(justificacion);
  const endpointNotificacion = obtenerEndpointJustificacion(justificacion);

  if (!idJustificacion && !endpointNotificacion) {
    throw new Error('No se encontro la justificacion para resolver.');
  }

  return [
    endpointNotificacion,
    idJustificacion ? `/api/attendance-justifications/${idJustificacion}/resolve` : '',
    idJustificacion ? `/api/attendance-justifications/${idJustificacion}/status` : '',
    idJustificacion ? `/api/justifications/${idJustificacion}/resolve` : '',
    idJustificacion ? `/api/justificaciones/${idJustificacion}/resolver` : ''
  ].filter(Boolean);
}

export async function resolverJustificacionAsistencia(justificacion, decision, observacion = '') {
  const estado = String(decision || '').toUpperCase();
  const aceptada = estado === 'ACEPTADA' || estado === 'APROBADA' || estado === 'ACEPTAR';
  const estadoSolicitud = aceptada ? 'ACEPTADA' : 'RECHAZADA';
  const payload = {
    decision: estadoSolicitud,
    estado: estadoSolicitud,
    observacion,
    observacion_instructor: observacion,
    estado_asistencia: aceptada ? 'JUSTIFICADO' : 'INASISTENCIA'
  };

  try {
    const endpoints = endpointsResolverJustificacion(justificacion);
    let ultimoError = null;

    for (const endpoint of endpoints) {
      try {
        const { data } = await api.patch(endpoint, payload);
        return { data: data?.data || data, error: null };
      } catch (error) {
        ultimoError = error;
        if (error.response?.status !== 404) break;
      }
    }

    throw ultimoError || new Error('No fue posible resolver la justificacion.');
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}
