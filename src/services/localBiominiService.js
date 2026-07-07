const DEFAULT_LOCAL_URL = "http://127.0.0.1:8765";

const localBaseUrl = () => {
  return (import.meta.env.VITE_BIOMINI_LOCAL_URL || DEFAULT_LOCAL_URL).replace(/\/+$/, "");
};

const requestLocal = async (path, options = {}) => {
  const response = await fetch(`${localBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const backend = payload.data?.backend_response || {};
    const detail = payload.detalle
      || payload.message
      || backend.mensaje
      || backend.message
      || backend.codigo
      || payload.codigo
      || "Servicio local BioMini no disponible";
    throw new Error(detail);
  }
  return payload.data || payload;
};

export const verificarServicioBiomini = () => requestLocal("/health");

export const capturarHuellaEnrolamiento = (payload = {}) => {
  return requestLocal("/capture/enrollment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const registrarAsistenciaPorHuellaLocal = (payload = {}) => {
  return requestLocal("/attendance/match", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
