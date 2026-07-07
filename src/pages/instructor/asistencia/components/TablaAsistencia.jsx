import { ChevronDown, Eye } from "lucide-react";
import { ESTADOS, ESTADOS_REGISTRABLES } from "../asistencia.constants";

function obtenerClaseEstado(estado) {
  return ESTADOS[estado]?.className || "";
}

export default function TablaAsistencia({
  aprendices,
  cargando,
  guardando,
  modoManual,
  soloLectura = false,
  onAbrirDetalle,
  onCambiarEstado
}) {
  const mostrarAcciones = !soloLectura && !modoManual;
  const totalColumnas = 4 + (modoManual ? 1 : 0) + (mostrarAcciones ? 1 : 0);

  return (
    <div className="asistencia-table-wrap">
      <table className={`asistencia-table ${modoManual ? "manual-active" : ""}`}>
        <thead>
          <tr>
            <th>Aprendiz</th>
            <th>Hora</th>
            <th>Estado</th>
            <th>Metodo</th>
            {modoManual && <th>Asistencia manual</th>}
            {mostrarAcciones && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr>
              <td colSpan={totalColumnas} className="grupos-empty">Cargando aprendices...</td>
            </tr>
          ) : aprendices.length ? (
            aprendices.map((aprendiz, index) => (
              <tr key={`${aprendiz.idAsistencia || "sin-asistencia"}-${aprendiz.id || "sin-aprendiz"}-${index}`}>
                <td>{aprendiz.nombre}</td>
                <td>{aprendiz.hora}</td>
                <td>
                  <span className={`asistencia-status ${obtenerClaseEstado(aprendiz.estado)}`}>
                    {ESTADOS[aprendiz.estado]?.label || "Sin registro"}
                  </span>
                </td>
                <td>{aprendiz.metodo}</td>
                {modoManual && (
                  <td>
                    <label className="asistencia-manual-select">
                      <select
                        value={ESTADOS_REGISTRABLES.includes(aprendiz.estado) ? aprendiz.estado : ""}
                        onChange={(e) => onCambiarEstado(aprendiz.id, e.target.value)}
                        disabled={guardando}
                      >
                        <option value="" disabled>Sin registro</option>
                        <option value="PRESENTE">Presente</option>
                        <option value="INASISTENTE">Ausente</option>
                        <option value="TARDE">Tarde</option>
                      </select>
                      <ChevronDown size={14} />
                    </label>
                  </td>
                )}
                {mostrarAcciones && (
                  <td>
                  <button
                    type="button"
                    className="asistencia-icon-action"
                    aria-label={`Ver asistencia de ${aprendiz.nombre}`}
                    onClick={() => onAbrirDetalle(aprendiz)}
                    disabled={guardando}
                  >
                    <Eye size={15} />
                  </button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={totalColumnas} className="grupos-empty">No hay aprendices con esos filtros.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
