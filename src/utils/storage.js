const PREFIJOS_PERSISTENTES_LOGOUT = ["sima_aviso_asistencia_"];
const CLAVES_PERSISTENTES_LOGOUT = ["sima_asistencia_sesion_activa"];

function debePersistirAlCerrarSesion(clave) {
  return (
    CLAVES_PERSISTENTES_LOGOUT.includes(clave) ||
    PREFIJOS_PERSISTENTES_LOGOUT.some((prefijo) => clave.startsWith(prefijo))
  );
}

export function limpiarSesionUsuario() {
  const datosPersistentes = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const clave = localStorage.key(index);
    if (clave && debePersistirAlCerrarSesion(clave)) {
      datosPersistentes[clave] = localStorage.getItem(clave);
    }
  }

  localStorage.clear();
  Object.entries(datosPersistentes).forEach(([clave, valor]) => {
    if (valor !== null) localStorage.setItem(clave, valor);
  });

  sessionStorage.clear();
}
