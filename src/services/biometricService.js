import api from "./api";

export async function listarHuellas(params = {}) {
  const response = await api.get("/api/biometrics/fingerprints", { params });
  return response.data?.data || [];
}

export async function enrolarHuella(payload) {
  const response = await api.post("/api/biometrics/fingerprints/enroll", payload);
  return response.data?.data;
}

export async function revocarHuella(idHuella, motivo) {
  const response = await api.post(`/api/biometrics/fingerprints/${idHuella}/revoke`, { motivo });
  return response.data?.data;
}

export async function reemplazarHuella(idHuella, payload) {
  const response = await api.post(`/api/biometrics/fingerprints/${idHuella}/replace`, payload);
  return response.data?.data;
}
