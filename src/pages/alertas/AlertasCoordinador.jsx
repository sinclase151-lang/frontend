import { useState, useEffect, useMemo } from 'react';
import {
  Users, ShieldAlert, ChevronRight,
  Search, ExternalLink, Calendar, Loader2, ArrowLeft, History
} from 'lucide-react';
import { obtenerGruposAlertasCoordinador, obtenerAlertasPorGrupo } from '../../services/alertasService';
import BadgeSeveridad from '../../components/alertas/BadgeSeveridad';
import ModalDetalleAlerta from '../../components/alertas/ModalDetalleAlerta';
import SimaPagination from '../../components/common/SimaPagination';
import './alertasCoordinador.css';

const ITEMS_POR_PAGINA = 5;

function PaginacionAlertas({ paginaActual, total, limite, onCambiarPagina, entidad = 'registros' }) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  const desde = total === 0 ? 0 : ((paginaActual - 1) * limite) + 1;
  const hasta = Math.min(paginaActual * limite, total);

  return (
    <SimaPagination
      desde={desde}
      hasta={hasta}
      total={total}
      entidad={entidad}
      paginaActual={paginaActual}
      totalPaginas={totalPaginas}
      onCambiarPagina={onCambiarPagina}
    />
  );
}

export default function AlertasCoordinador() {
  const [detalleAlertaId, setDetalleAlertaId] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // Vista: 'GRUPOS' | 'APRENDICES'
  const [vistaActual, setVistaActual] = useState('GRUPOS');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);

  // Datos
  const [grupos, setGrupos] = useState([]);
  const [aprendices, setAprendices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginaGrupos, setPaginaGrupos] = useState(1);
  const [paginaAprendices, setPaginaAprendices] = useState(1);

  // -- Filtros vista GRUPOS --------------------------------------------------
  const [busquedaGrupo, setBusquedaGrupo] = useState('');
  const [filtroSevGrupo, setFiltroSevGrupo] = useState(''); // 'graves'|'moderadas'|'leves'|''

  // -- Filtros vista APRENDICES ----------------------------------------------
  const [busquedaAprendiz, setBusquedaAprendiz] = useState('');
  const [filtroSev, setFiltroSev] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  // Cargar grupos al montar
  useEffect(() => { cargarGrupos(); }, []);

  const cargarGrupos = async () => {
    setLoading(true);
    const { data } = await obtenerGruposAlertasCoordinador();
    if (data) setGrupos(data);
    setLoading(false);
  };

  const manejarSeleccionGrupo = async (grupo) => {
    setGrupoSeleccionado(grupo);
    setVistaActual('APRENDICES');
    setPaginaAprendices(1);
    // Limpiar filtros de aprendices al cambiar de grupo
    setBusquedaAprendiz('');
    setFiltroSev('');
    setFiltroTipo('');
    setFiltroFecha('');
    setLoading(true);
    const { data } = await obtenerAlertasPorGrupo(grupo.idGrupo ?? grupo.grupoCodigo);
    if (data) setAprendices(data);
    setLoading(false);
  };

  const volverAGrupos = () => {
    setVistaActual('GRUPOS');
    setGrupoSeleccionado(null);
    setAprendices([]);
    setMostrarHistorial(false);
    setPaginaGrupos(1);
    cargarGrupos();
  };

  const limpiarFiltrosGrupos = () => {
    setBusquedaGrupo('');
    setFiltroSevGrupo('');
    setPaginaGrupos(1);
  };

  const limpiarFiltrosAprendices = () => {
    setBusquedaAprendiz('');
    setFiltroSev('');
    setFiltroTipo('');
    setFiltroFecha('');
    setPaginaAprendices(1);
  };

  const formatearFecha = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // -- Filtrado local: GRUPOS ------------------------------------------------
  const gruposFiltrados = useMemo(() => {
    return grupos.filter(g => {
      const texto = busquedaGrupo.toLowerCase();
      const coincideTexto = !texto ||
        g.grupoCodigo?.toLowerCase().includes(texto) ||
        g.instructorLider?.toLowerCase().includes(texto);

      const coincideSev = !filtroSevGrupo ||
        (filtroSevGrupo === 'graves' && g.graves > 0) ||
        (filtroSevGrupo === 'moderadas' && g.moderadas > 0) ||
        (filtroSevGrupo === 'leves' && g.leves > 0);

      return coincideTexto && coincideSev;
    });
  }, [grupos, busquedaGrupo, filtroSevGrupo]);

  // -- Filtrado local: APRENDICES --------------------------------------------
  const aprendicesFiltrados = useMemo(() => {
    return aprendices.filter(a => {
      const texto = busquedaAprendiz.toLowerCase();
      const coincideTexto = !texto ||
        a.aprendizNombre?.toLowerCase().includes(texto) ||
        a.aprendizDocumento?.toLowerCase().includes(texto);

      const coincideSev = !filtroSev || a.severidad === filtroSev;
      const coincideTipo = !filtroTipo || a.tipoAlerta === filtroTipo;

      const fechaA = a.fechaCreacion ? new Date(a.fechaCreacion) : null;
      let coincideFecha = true;
      if (filtroFecha && fechaA) {
        // Comprobar que sea el mismo día (ignorando la hora)
        const d = new Date(filtroFecha + 'T00:00:00');
        coincideFecha = fechaA.getFullYear() === d.getFullYear() &&
                        fechaA.getMonth() === d.getMonth() &&
                        fechaA.getDate() === d.getDate();
      }

      const coincideEstado = mostrarHistorial ? a.estado === 'CERRADA' : a.estado !== 'CERRADA';

      return coincideTexto && coincideSev && coincideTipo && coincideFecha && coincideEstado;
    });
  }, [aprendices, busquedaAprendiz, filtroSev, filtroTipo, filtroFecha, mostrarHistorial]);

  const hayFiltrosGrupo = busquedaGrupo || filtroSevGrupo;
  const hayFiltrosAprendiz = busquedaAprendiz || filtroSev || filtroTipo || filtroFecha;

  const totalPaginasGrupos = Math.max(1, Math.ceil(gruposFiltrados.length / ITEMS_POR_PAGINA));
  const totalPaginasAprendices = Math.max(1, Math.ceil(aprendicesFiltrados.length / ITEMS_POR_PAGINA));

  useEffect(() => {
    if (paginaGrupos > totalPaginasGrupos) setPaginaGrupos(totalPaginasGrupos);
  }, [paginaGrupos, totalPaginasGrupos]);

  useEffect(() => {
    if (paginaAprendices > totalPaginasAprendices) setPaginaAprendices(totalPaginasAprendices);
  }, [paginaAprendices, totalPaginasAprendices]);

  const gruposPaginados = useMemo(() => {
    const inicio = (paginaGrupos - 1) * ITEMS_POR_PAGINA;
    return gruposFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [gruposFiltrados, paginaGrupos]);

  const aprendicesPaginados = useMemo(() => {
    const inicio = (paginaAprendices - 1) * ITEMS_POR_PAGINA;
    return aprendicesFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [aprendicesFiltrados, paginaAprendices]);

  const totalVista = vistaActual === 'GRUPOS' ? gruposFiltrados.length : aprendicesFiltrados.length;
  const paginaVista = vistaActual === 'GRUPOS' ? paginaGrupos : paginaAprendices;
  const desdeVista = totalVista === 0 ? 0 : (paginaVista - 1) * ITEMS_POR_PAGINA + 1;
  const hastaVista = Math.min(paginaVista * ITEMS_POR_PAGINA, totalVista);

  const cambiarPaginaGrupos = (pagina) => {
    setPaginaGrupos(Math.min(Math.max(pagina, 1), totalPaginasGrupos));
  };

  const cambiarPaginaAprendices = (pagina) => {
    setPaginaAprendices(Math.min(Math.max(pagina, 1), totalPaginasAprendices));
  };


  return (
    <div className="grupos-page">
      
      <header className="grupos-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          {vistaActual === 'APRENDICES' && (
            <button 
              type="button" 
              className="grupos-icon-btn" 
              onClick={volverAGrupos}
              title="Volver a Gestión de Alertas"
              style={{ marginTop: '4px' }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <span className="grupos-eyebrow">
              {vistaActual === 'GRUPOS' ? 'PROGRAMACÓN ACADÉMICA' : `FICHA ${grupoSeleccionado?.grupoCodigo}`}
            </span>
            <h1>
              {vistaActual === 'GRUPOS' ? 'Gestión de Alertas' : `Alertas: Ficha ${grupoSeleccionado?.grupoCodigo}`}
            </h1>
            <p>
              {vistaActual === 'GRUPOS' 
                ? 'Consulta y gestiona las alertas academicas y convivenciales por ficha de formación.'
                : `Instructor lider: ${grupoSeleccionado?.instructorLider || '-'}`}
            </p>
          </div>
        </div>
      </header>

      {/* -- Barra de filtros -- */}
      <section className="grupos-toolbar">
        {vistaActual === 'GRUPOS' ? (
          /* Filtros para la vista de Grupos */
          <>
            <div className="grupos-search">
              <Search size={19} />
              <input
                type="text"
                placeholder="Buscar por codigo de ficha o nombre del instructor lider..."
                value={busquedaGrupo}
                onChange={e => { setBusquedaGrupo(e.target.value); setPaginaGrupos(1); }}
              />
            </div>

            <select
              className="grupos-select-filtro"
              value={filtroSevGrupo}
              onChange={e => { setFiltroSevGrupo(e.target.value); setPaginaGrupos(1); }}
            >
              <option value="">Todas las severidades</option>
              <option value="graves">Con Graves</option>
              <option value="moderadas">Con Moderadas</option>
              <option value="leves">Con Leves</option>
            </select>

            <div style={{ display: 'flex', gap: '10px' }}>
              {hayFiltrosGrupo && (
                <button type="button" className="ghost" onClick={limpiarFiltrosGrupos}>
                  Limpiar
                </button>
              )}
            </div>
          </>
        ) : (
          /* Filtros para la vista de Aprendices */
          <>
            <div className="grupos-search">
              <Search size={19} />
              <input
                type="text"
                placeholder="Buscar aprendiz por nombre o documento..."
                value={busquedaAprendiz}
                onChange={e => { setBusquedaAprendiz(e.target.value); setPaginaAprendices(1); }}
              />
            </div>

            <select className="grupos-select-filtro" value={filtroSev} onChange={e => { setFiltroSev(e.target.value); setPaginaAprendices(1); }}>
              <option value="">Todas las severidades</option>
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="GRAVE">Grave</option>
              <option value="CRITICA">Crítica</option>
            </select>

            <select className="grupos-select-filtro" value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPaginaAprendices(1); }}>
              <option value="">Todos los tipos</option>
              <option value="ASISTENCIAL">Asistencial</option>
              <option value="OBSERVACIONES_RECURRENTES">Observaciones recurrentes</option>
              <option value="CONVIVENCIAL">Convivencial</option>
            </select>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="date"
                className="grupos-select-filtro"
                style={{ width: 'auto' }}
                title="Fecha"
                value={filtroFecha}
                onChange={e => { setFiltroFecha(e.target.value); setPaginaAprendices(1); }}
              />
              {hayFiltrosAprendiz && (
                <button type="button" className="ghost" onClick={limpiarFiltrosAprendices}>
                  Limpiar
                </button>
              )}
              <button type="button" className="ghost" onClick={volverAGrupos}>
                Volver
              </button>
            </div>
          </>
        )}
      </section>

      {/* -- Panel principal -- */}
      <section className="grupos-card">
        <div className="grupos-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>
              {vistaActual === 'GRUPOS' 
                ? 'Fichas registradas' 
                : mostrarHistorial ? 'Historial de alertas cerradas' : 'Aprendices con alertas activas'}
            </h2>
            {!loading && (
              <p>
                Mostrando {desdeVista}-{hastaVista} de {totalVista}{' '}
                {vistaActual === 'GRUPOS' ? 'fichas' : 'aprendices'}
              </p>
            )}
          </div>
          {vistaActual === 'APRENDICES' && (
            <button 
              type="button" 
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                borderRadius: '6px', border: '1px solid #cbd5e1', 
                backgroundColor: mostrarHistorial ? '#f8fafc' : '#ffffff', 
                color: '#334155', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s'
              }}
            >
              <History size={16} /> 
              {mostrarHistorial ? 'Ver alertas activas' : 'Historial de cerradas'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="ac-empty-state">
            <Loader2 className="spin" size={40} style={{ color: '#0b2442', marginBottom: 16 }} />
            <p>Cargando información...</p>
          </div>
        ) : vistaActual === 'GRUPOS' ? (
          /* VISTA 1: TABLA DE GRUPOS */
          <div className="grupos-table-wrap">
            {gruposFiltrados.length > 0 ? (
              <table className="grupos-table">
                <thead>
                  <tr>
                    <th>Ficha y Programa</th>
                    <th>Instructor Líder</th>
                    <th>Total Alertas</th>
                    <th>Desglose Severidad</th>
                    <th>Último Reporte</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {gruposPaginados.map((g) => (
                    <tr key={g.grupoCodigo} className="ac-tr-clickable" onClick={() => manejarSeleccionGrupo(g)}>
                      <td>
                        <div className="ac-grupo-info">
                          <strong className="grupos-highlight">{g.grupoCodigo.split(' ')[0]}</strong>
                          <span>{g.grupoCodigo.substring(g.grupoCodigo.indexOf(' ') + 1)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Users size={16} color="#64748b" />
                          <span style={{ fontWeight: 600, color: '#334155' }}>{g.instructorLider}</span>
                        </div>
                      </td>
                      <td>
                        <span className="ac-badge-total">{g.totalAlertas}</span>
                      </td>
                      <td>
                        <div className="ac-severidad-dots">
                          {g.graves > 0 && <span className="ac-sev-dot"><i className="grave" /> {g.graves} Graves</span>}
                          {g.moderadas > 0 && <span className="ac-sev-dot"><i className="moderada" /> {g.moderadas} Moderadas</span>}
                          {g.leves > 0 && <span className="ac-sev-dot"><i className="leve" /> {g.leves} Leves</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                          <Calendar size={14} /> {formatearFecha(g.ultimaAlerta)}
                        </div>
                      </td>
                      <td>
                        <button className="ac-action-btn">
                          Ver aprendices <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="ac-empty-state">
                <ShieldAlert size={48} />
                <h3>{hayFiltrosGrupo ? 'Sin resultados' : 'No hay alertas activas'}</h3>
                <p>
                  {hayFiltrosGrupo
                    ? 'No se encontraron fichas con los filtros aplicados.'
                    : 'Todas las fichas se encuentran sin alertas académicas o convivenciales.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* VISTA 2: TABLA DE APRENDICES */
          <div className="grupos-table-wrap">
            {aprendicesFiltrados.length > 0 ? (
              <table className="grupos-table">
                <thead>
                  <tr>
                    <th>Aprendiz</th>
                    <th>Tipo de Alerta</th>
                    <th>Severidad</th>
                    <th>Reportado Por</th>
                    <th>Fecha</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {aprendicesPaginados.map((a) => (
                    <tr key={a.id} className="ac-tr-clickable" onClick={() => setDetalleAlertaId(a.id)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="ac-grupo-info">
                            <strong>{a.aprendizNombre}</strong>
                            <span>{a.aprendizDocumento}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                          {a.tipoAlerta.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <BadgeSeveridad severidad={a.severidad} />
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                          {a.responsableNombre}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                          <Calendar size={14} /> {formatearFecha(a.fechaCreacion)}
                        </div>
                      </td>
                      <td>
                        <button 
                          className={mostrarHistorial ? "ac-action-btn" : "ac-action-btn-primary"} 
                          onClick={(e) => { e.stopPropagation(); setDetalleAlertaId(a.id); }}
                        >
                          {mostrarHistorial ? 'Ver detalle' : 'Revisar y Cerrar'} <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="ac-empty-state">
                <ShieldAlert size={48} />
                <h3>{hayFiltrosAprendiz ? 'Sin resultados' : 'No hay aprendices con alertas'}</h3>
                <p>
                  {hayFiltrosAprendiz
                    ? 'Ningún aprendiz coincide con los filtros aplicados.'
                    : 'No se encontraron alertas activas para esta ficha.'}
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && vistaActual === 'GRUPOS' && gruposFiltrados.length > 0 && (
          <PaginacionAlertas
            paginaActual={paginaGrupos}
            total={gruposFiltrados.length}
            limite={ITEMS_POR_PAGINA}
            entidad="grupos"
            onCambiarPagina={cambiarPaginaGrupos}
          />
        )}

        {!loading && vistaActual === 'APRENDICES' && aprendicesFiltrados.length > 0 && (
          <PaginacionAlertas
            paginaActual={paginaAprendices}
            total={aprendicesFiltrados.length}
            limite={ITEMS_POR_PAGINA}
            entidad="aprendices"
            onCambiarPagina={cambiarPaginaAprendices}
          />
        )}
      </section>

      {/* Modal detalle alerta */}
      <ModalDetalleAlerta
        isOpen={!!detalleAlertaId}
        onClose={() => setDetalleAlertaId(null)}
        alertaId={detalleAlertaId}
        onAlertaCerrada={(id) => {
          setAprendices(prev => prev.map(a => a.id === id ? { ...a, estado: 'CERRADA' } : a));
          cargarGrupos();
        }}
      />
    </div>
  );
}

