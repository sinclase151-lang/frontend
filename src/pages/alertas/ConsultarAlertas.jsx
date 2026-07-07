import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Eye, RefreshCw,
  ChevronsUpDown
} from 'lucide-react';
import { useAlertas } from '../../hooks/useAlertas';
import BadgeSeveridad from '../../components/alertas/BadgeSeveridad';
import BadgeEstado from '../../components/alertas/BadgeEstado';
import ModalCrearAlerta from '../../components/alertas/ModalCrearAlerta';
import ModalDetalleAlerta from '../../components/alertas/ModalDetalleAlerta';
import SimaPagination from '../../components/common/SimaPagination';
import { obtenerAprendicesPorGrupo, obtenerGrupos } from '../../services/alertasService';
import './consultarAlertas.css';

// -- Helpers ------------------------------------------------------------------
function formatFecha(isoStr) {
  if (!isoStr) return { fecha: '-', hora: '' };
  const d = new Date(isoStr);
  return {
    fecha: d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora:  d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  };
}

function rolDesdeStorage() {
  return (localStorage.getItem('rol') || '').toUpperCase();
}

function puedeCrearAlerta() {
  const rol = rolDesdeStorage();
  return rol === 'INSTRUCTOR_LIDER' || rol === 'INSTRUCTOR_ASIGNADO' || rol === 'INSTRUCTOR';
}

function obtenerIdGrupo(grupo) {
  return grupo?.id_grupo ?? grupo?.id ?? '';
}

function obtenerEtiquetaGrupo(grupo) {
  const ficha = grupo?.numero_ficha ?? grupo?.numero_grupo ?? grupo?.codigo ?? obtenerIdGrupo(grupo);
  const programa = grupo?.programa_formacion?.nombre_programa ?? grupo?.programa ?? grupo?.nombre_programa ?? '';
  return programa ? `${ficha} - ${programa}` : `Ficha ${ficha}`;
}

function formatearTipoAlerta(tipo) {
  const etiquetas = {
    ASISTENCIAL: 'Asistencial',
    OBSERVACIONES_RECURRENTES: 'Observaciones recurrentes',
    CONVIVENCIAL: 'Convivencial',
  };
  return etiquetas[tipo] || (tipo ?? '').replace(/_/g, ' ');
}

// -- Paginación ----------------------------------------------------------------
function Paginacion({ paginaActual, total, limite, onCambiarPagina }) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  const desde = total === 0 ? 0 : ((paginaActual - 1) * limite) + 1;
  const hasta = Math.min(paginaActual * limite, total);

  return (
    <SimaPagination
      desde={desde}
      hasta={hasta}
      total={total}
      entidad="alertas"
      paginaActual={paginaActual}
      totalPaginas={totalPaginas}
      onCambiarPagina={onCambiarPagina}
    />
  );
}
// =============================================================================
export default function ConsultarAlertas() {
  const [modalOpen, setModalOpen] = useState(false);
  const [detalleAlertaId, setDetalleAlertaId] = useState(null);
  const [gruposFiltro, setGruposFiltro] = useState([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [errorGrupos, setErrorGrupos] = useState('');
  const [aprendicesGrupo, setAprendicesGrupo] = useState([]);
  const [cargandoAprendices, setCargandoAprendices] = useState(false);
  const [errorAprendices, setErrorAprendices] = useState('');
  const [mostrarSugerenciasAprendiz, setMostrarSugerenciasAprendiz] = useState(false);

  const { 
    alertas, total, paginaActual, loading, error, limite,
    cambiarPagina, cambiarLimite, filtros, aplicarFiltrosCompletos, limpiarFiltros,
    cargarAlertas 
  } = useAlertas();

  // -- Filtros locales (se aplican al hacer clic en Buscar) ------------------
  const [filtrosLocales, setFiltrosLocales] = useState({ ...filtros });

  const aprendicesFiltrados = useMemo(() => {
    if (!filtrosLocales.grupoId) return [];

    const texto = (filtrosLocales.aprendizBusqueda || '').trim().toLowerCase();
    if (!texto) return aprendicesGrupo.slice(0, 8);

    return aprendicesGrupo
      .filter(aprendiz => (
        aprendiz.nombre?.toLowerCase().includes(texto) ||
        String(aprendiz.documento || '').includes(texto)
      ))
      .slice(0, 8);
  }, [aprendicesGrupo, filtrosLocales.aprendizBusqueda, filtrosLocales.grupoId]);

  useEffect(() => {
    let activo = true;

    async function cargarGruposFiltro() {
      setCargandoGrupos(true);
      setErrorGrupos('');

      const { data, error: errorCarga } = await obtenerGrupos();
      if (!activo) return;

      if (errorCarga) {
        setGruposFiltro([]);
        setErrorGrupos(errorCarga);
      } else {
        setGruposFiltro(Array.isArray(data) ? data : []);
      }

      setCargandoGrupos(false);
    }

    cargarGruposFiltro();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarAprendicesGrupo() {
      if (!filtrosLocales.grupoId) {
        setAprendicesGrupo([]);
        setErrorAprendices('');
        setCargandoAprendices(false);
        return;
      }

      setCargandoAprendices(true);
      setErrorAprendices('');

      const { data, error: errorCarga } = await obtenerAprendicesPorGrupo(filtrosLocales.grupoId);
      if (!activo) return;

      setAprendicesGrupo(Array.isArray(data) ? data : []);
      setErrorAprendices(errorCarga || '');
      setCargandoAprendices(false);
    }

    cargarAprendicesGrupo();

    return () => {
      activo = false;
    };
  }, [filtrosLocales.grupoId]);

  function handleFiltroLocal(campo, valor) {
    setFiltrosLocales(prev => {
      if (campo === 'grupoId') {
        return { ...prev, grupoId: valor, aprendizId: '', aprendizBusqueda: '' };
      }
      return { ...prev, [campo]: valor };
    });
  }

  function handleBusquedaAprendiz(valor) {
    setFiltrosLocales(prev => ({ ...prev, aprendizBusqueda: valor, aprendizId: '' }));
    setMostrarSugerenciasAprendiz(true);
  }

  function seleccionarAprendiz(aprendiz) {
    setFiltrosLocales(prev => ({
      ...prev,
      aprendizId: aprendiz.id,
      aprendizBusqueda: `${aprendiz.nombre} ${aprendiz.documento}`,
    }));
    setMostrarSugerenciasAprendiz(false);
  }

  function aplicarFiltros() {
    aplicarFiltrosCompletos(filtrosLocales);
  }

  function handleLimpiar() {
    const vacios = Object.fromEntries(Object.keys(filtrosLocales).map(k => [k, '']));
    setFiltrosLocales(vacios);
    limpiarFiltros();
  }

  return (
    <div className="ca-page">

      {/* -- Header -- */}
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Consultar alertas</h1>
          <p className="ca-page-description">
            Revisa, filtra y gestiona las alertas activas o en seguimiento de los aprendices.
          </p>
        </div>

        <div className="ca-header-acciones">
          {puedeCrearAlerta() && (
            <button type="button" className="ca-btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> Nueva alerta manual
            </button>
          )}
        </div>
      </div>

      {/* -- Filtros -- */}
      <div className="ca-filtros-card">
        <div className="ca-filtros-fila">
          {/* Buscar aprendiz */}
          <div className="ca-filtro-grupo ca-filtro-grupo--wide">
            <label className="ca-filtro-label">Buscar aprendiz</label>
            <div className="ca-search-wrap ca-aprendiz-search">
              <Search size={14} className="ca-search-icon" />
              <input
                type="text"
                className="ca-input ca-input--search"
                placeholder={filtrosLocales.grupoId ? 'Nombre o documento...' : 'Selecciona un grupo primero'}
                value={filtrosLocales.aprendizBusqueda}
                onChange={e => handleBusquedaAprendiz(e.target.value)}
                onFocus={() => setMostrarSugerenciasAprendiz(true)}
                onBlur={() => setTimeout(() => setMostrarSugerenciasAprendiz(false), 120)}
                onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                disabled={cargandoAprendices}
              />
              {mostrarSugerenciasAprendiz && filtrosLocales.grupoId && (
                <div className="ca-aprendiz-dropdown">
                  {cargandoAprendices && (
                    <div className="ca-aprendiz-option ca-aprendiz-option--empty">Cargando aprendices...</div>
                  )}
                  {!cargandoAprendices && errorAprendices && (
                    <div className="ca-aprendiz-option ca-aprendiz-option--empty">{errorAprendices}</div>
                  )}
                  {!cargandoAprendices && !errorAprendices && aprendicesFiltrados.length === 0 && (
                    <div className="ca-aprendiz-option ca-aprendiz-option--empty">No hay coincidencias en este grupo</div>
                  )}
                  {!cargandoAprendices && !errorAprendices && aprendicesFiltrados.map(aprendiz => (
                    <button
                      type="button"
                      key={aprendiz.id}
                      className="ca-aprendiz-option"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => seleccionarAprendiz(aprendiz)}
                    >
                      <span>{aprendiz.nombre}</span>
                      <small>{aprendiz.documento}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Estado */}
          <div className="ca-filtro-grupo">
            <label className="ca-filtro-label">Estado</label>
            <select
              className="ca-select"
              value={filtrosLocales.estado}
              onChange={e => handleFiltroLocal('estado', e.target.value)}
              data-testid="alert-filter-status"
            >
              <option value="">Todos</option>
              <option value="ABIERTA">Abierta</option>
              <option value="CERRADA">Cerrada</option>
            </select>
          </div>

          {/* Severidad */}
          <div className="ca-filtro-grupo">
            <label className="ca-filtro-label">Severidad</label>
            <select className="ca-select" value={filtrosLocales.severidad} onChange={e => handleFiltroLocal('severidad', e.target.value)}>
              <option value="">Todas</option>
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="GRAVE">Grave</option>
              <option value="CRITICA">Crítica</option>
            </select>
          </div>

          {/* Tipo de alerta */}
          <div className="ca-filtro-grupo">
            <label className="ca-filtro-label">Tipo de alerta</label>
            <select className="ca-select" value={filtrosLocales.tipoAlerta} onChange={e => handleFiltroLocal('tipoAlerta', e.target.value)}>
              <option value="">Todos</option>
              <option value="ASISTENCIAL">Asistencial</option>
              <option value="OBSERVACIONES_RECURRENTES">Observaciones recurrentes</option>
              <option value="CONVIVENCIAL">Convivencial</option>
            </select>
          </div>

          {/* Grupo */}
          <div className="ca-filtro-grupo">
            <label className="ca-filtro-label">Grupo</label>
            <select
              className="ca-select"
              value={filtrosLocales.grupoId}
              onChange={e => handleFiltroLocal('grupoId', e.target.value)}
              disabled={cargandoGrupos}
            >
              <option value="">
                {cargandoGrupos ? 'Cargando grupos...' : 'Todos mis grupos'}
              </option>
              {errorGrupos && (
                <option value="" disabled>No se pudieron cargar los grupos</option>
              )}
              {gruposFiltro.map(grupo => {
                const idGrupo = obtenerIdGrupo(grupo);
                return (
                  <option key={idGrupo} value={idGrupo}>
                    {obtenerEtiquetaGrupo(grupo)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Fecha desde */}
          <div className="ca-filtro-grupo">
            <label className="ca-filtro-label">Desde</label>
            <input
              type="date"
              className="ca-input"
              value={filtrosLocales.fechaInicio}
              onChange={e => handleFiltroLocal('fechaInicio', e.target.value)}
            />
          </div>

          {/* Fecha hasta */}
          <div className="ca-filtro-grupo">
            <label className="ca-filtro-label">Hasta</label>
            <input
              type="date"
              className="ca-input"
              value={filtrosLocales.fechaFin}
              onChange={e => handleFiltroLocal('fechaFin', e.target.value)}
            />
          </div>
        </div>

        {/* Acciones de filtro */}
        <div className="ca-filtros-acciones">
          <button type="button" className="ca-btn-outline" onClick={handleLimpiar}>
            Limpiar
          </button>
          <button type="button" className="ca-btn-primary" onClick={aplicarFiltros}>
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      {/* -- Resultados -- */}
      <div className="ca-resultados-header">
        <span className="ca-resultados-count">
          Resultados <strong>({total})</strong>
        </span>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="ca-estado-error">
          <p>{error}</p>
          <button type="button" className="ca-btn-outline" onClick={cargarAlertas}>
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="ca-estado-loading">
          <div className="ca-spinner" />
          <span>Cargando alertas...</span>
        </div>
      )}

      {/* Sin resultados */}
      {!loading && !error && alertas.length === 0 && (
        <div className="ca-estado-vacio">
          <div className="ca-vacio-icono"><Search size={34} strokeWidth={2.4} /></div>
          <p className="ca-vacio-titulo">No se encontraron alertas</p>
          <p className="ca-vacio-sub">Prueba ajustando los filtros aplicados</p>
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && alertas.length > 0 && (
        <div className="ca-tabla-wrap">
          <table className="ca-tabla" data-testid="alert-table">
            <thead>
              <tr>
                <th>Aprendiz</th>
                <th>Grupo</th>
                <th>Tipo de alerta</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th className="ca-th-sortable">
                  Fecha creación <ChevronsUpDown size={13} />
                </th>
                <th>Responsable</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {alertas.map(alerta => {
                const { fecha, hora } = formatFecha(alerta.fechaCreacion ?? alerta.createdAt);
                const esGrave = alerta.severidad === 'GRAVE';
                const nombre  = alerta.aprendiz?.nombre ?? alerta.aprendizNombre ?? '-';
                const doc     = alerta.aprendiz?.documento ?? alerta.aprendizDocumento ?? '';

                return (
                  <tr
                    key={alerta.id ?? alerta.alertaId}
                    className={esGrave ? 'ca-fila-grave' : ''}
                    data-testid="alert-row"
                  >
                    <td>
                      <div className="ca-aprendiz-cell">
                        <div>
                          <span className="ca-aprendiz-nombre">{nombre}</span>
                          {doc && <span className="ca-aprendiz-doc">{doc}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="ca-cell-texto">
                      {alerta.grupo?.codigo ?? alerta.grupoCodigo ?? alerta.grupoId ?? '-'}
                    </td>
                    <td className="ca-cell-texto">
                      {formatearTipoAlerta(alerta.tipoAlerta)}
                    </td>
                    <td>
                      <BadgeSeveridad severidad={alerta.severidad} />
                    </td>
                    <td>
                      <BadgeEstado estado={alerta.estado} />
                    </td>
                    <td>
                      <span className="ca-fecha-linea1">{fecha}</span>
                      <span className="ca-fecha-linea2">{hora}</span>
                    </td>
                    <td className="ca-cell-texto">
                      {alerta.responsable?.nombre ?? alerta.responsableNombre ?? 'Sistema'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ca-btn-accion"
                        onClick={() => setDetalleAlertaId(alerta.id ?? alerta.alertaId)}
                        aria-label="Ver detalle"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!loading && !error && total > 0 && (
        <Paginacion
          paginaActual={paginaActual}
          total={total}
          limite={limite}
          onCambiarPagina={cambiarPagina}
          onCambiarLimite={cambiarLimite}
        />
      )}

      {/* Modal crear alerta */}
      <ModalCrearAlerta
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAlertaCreada={cargarAlertas}
      />

      {/* Modal detalle alerta */}
      <ModalDetalleAlerta
        isOpen={!!detalleAlertaId}
        onClose={() => setDetalleAlertaId(null)}
        alertaId={detalleAlertaId}
      />
    </div>
  );
}

