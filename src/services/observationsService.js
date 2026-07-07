import api from './api';

// ─── HELPER: Mensajes de error ────────────────────────────────────────────────
function mensajeError(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message || 'Error en la comunicación con el servidor';
}

function limpiarParams(obj = {}) {
  const p = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== '' && obj[k] !== null && obj[k] !== undefined) p[k] = obj[k];
  });
  return p;
}

// ─── MAPEO: Convierte la respuesta del backend al formato del frontend ─────────
function mapObservacion(obs) {
  const persona = obs?.aprendiz?.usuario?.persona;
  const instructorPersona = obs?.instructor?.usuario?.persona;

  const aprendizNombre = persona
    ? `${persona.nombres || ''} ${persona.apellidos || ''}`.trim()
    : `Aprendiz ID ${obs?.id_aprendiz ?? ''}`;

  const autorNombre = instructorPersona
    ? `${instructorPersona.nombres || ''} ${instructorPersona.apellidos || ''}`.trim()
    : 'Instructor';

  return {
    id: obs.id_observacion,
    idAprendiz: obs.id_aprendiz,
    idGrupo: obs.id_grupo,
    tipo: obs.tipo_observacion,
    severidad: obs.severidad,
    estado: obs.estado,
    descripcion: obs.descripcion || '',
    fecha: obs.fecha_observacion,
    autor: autorNombre,
    aprendizNombre,
    aprendizDocumento: persona?.numero_documento || '',
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  GRUPOS DEL INSTRUCTOR (para poblar el select de "Mis fichas")
// ════════════════════════════════════════════════════════════════════════════

export async function obtenerMisGrupos() {
  try {
    const { data } = await api.get('/api/groups', { params: { limit: 100 } });
    const lista = data?.data?.grupos || data?.data || data?.grupos || [];
    return { data: Array.isArray(lista) ? lista : [], error: null };
  } catch (error) {
    return { data: [], error: mensajeError(error) };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  APRENDICES DEL GRUPO (para poblar el select del modal)
// ════════════════════════════════════════════════════════════════════════════

export async function obtenerAprendicesPorGrupo(idGrupo) {
  try {
    const { data } = await api.get(`/api/apprentices/grupo/${idGrupo}`, {
      params: { estado: 'ACTIVO', limit: 1000 },
    });
    const res = data?.data || data;
    const lista = res?.aprendices || res?.data || res;

    if (!Array.isArray(lista)) return { data: [], error: null };

    const mapeados = lista.map((a) => {
      const persona = a?.usuario?.persona;
      return {
        id: a.id_aprendiz,
        nombre: persona
          ? `${persona.nombres || ''} ${persona.apellidos || ''}`.trim()
          : `ID ${a.id_aprendiz}`,
        documento: persona?.numero_documento || '',
      };
    });

    return { data: mapeados, error: null };
  } catch (error) {
    return { data: [], error: mensajeError(error) };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  OBSERVACIONES POR GRUPO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene las observaciones de un grupo formativo.
 * Soporta filtros: id_aprendiz, tipo_observacion, severidad, estado, fecha_desde, fecha_hasta, page, limit
 */
export async function obtenerObservacionesPorGrupo(idGrupo, filtros = {}) {
  try {
    const params = limpiarParams(filtros);
    const { data } = await api.get(`/api/observations/group/${idGrupo}`, { params });

    const res = data?.data || data;
    const lista = res?.observaciones || res?.data || res;

    return {
      data: {
        observaciones: Array.isArray(lista) ? lista.map(mapObservacion) : [],
        total: res?.total ?? (Array.isArray(lista) ? lista.length : 0),
        observaciones_abiertas: res?.observaciones_abiertas ?? 0,
        grupo: res?.grupo ?? null,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  CREAR OBSERVACIÓN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Registra una nueva observación formativa.
 * Requiere: idAprendiz, idGrupo, tipo, severidad, descripcion
 * Opcional: notificar_lider (boolean)
 */
export async function crearObservacion({ idAprendiz, idGrupo, tipo, severidad, descripcion, notificarLider = false }) {
  try {
    const payload = {
      id_aprendiz: Number(idAprendiz),
      id_grupo: Number(idGrupo),
      tipo_observacion: tipo,
      severidad,
      descripcion,
      notificar_lider: notificarLider,
    };

    const { data } = await api.post('/api/observations', payload);
    const obs = data?.data?.observation || data?.data || data;
    return { data: mapObservacion(obs), error: null };
  } catch (error) {
    return { data: null, error: mensajeError(error) };
  }
}
