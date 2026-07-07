import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, User, Users, AlertCircle, 
  Info, History, CheckCircle2, ShieldAlert, NotebookText
} from 'lucide-react';
import { obtenerAlertaPorId } from '../../services/alertasService';
import { getRolActual } from '../../services/alertasService';
import BadgeSeveridad from '../../components/alertas/BadgeSeveridad';
import BadgeEstado from '../../components/alertas/BadgeEstado';
import AvatarAprendiz from '../../components/alertas/AvatarAprendiz';
import ModalCerrarAlerta from '../../components/alertas/ModalCerrarAlerta';
import './detalleAlerta.css';

function formatFechaLarga(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleString('es-CO', { 
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function DetalleAlerta() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [alerta, setAlerta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalCerrarAbierto, setModalCerrarAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    const { data, error: err } = await obtenerAlertaPorId(id);
    if (err) setError(err);
    else setAlerta(data);
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const esCoordinador = getRolActual() === 'coordinador';
  const puedeCerrar = esCoordinador && alerta?.estado === 'ABIERTA';

  if (loading) return (
    <div className="da-estado-carga">
      <div className="da-spinner" />
      <span>Cargando detalle de la alerta...</span>
    </div>
  );

  if (error || !alerta) return (
    <div className="da-estado-error">
      <AlertCircle size={40} />
      <h2>Error al cargar la alerta</h2>
      <p>{error || 'No se encontró la información solicitada'}</p>
      <button className="ca-btn-outline" onClick={() => navigate('/alertas/consultar')}>
        Volver a la lista
      </button>
    </div>
  );

  const nombreAprendiz = alerta.aprendizNombre || alerta.aprendiz?.nombre || '-';

  return (
    <div className="da-page">
      <header className="da-header">
        <div className="da-header-izq">
          <nav className="ca-breadcrumb">
            <span>Inicio</span> <span className="ca-bread-sep">&gt;</span>
            <span>Alertas</span> <span className="ca-bread-sep">&gt;</span>
            <span onClick={() => navigate('/alertas/consultar')} style={{ cursor: 'pointer' }}>Consultar</span>
            <span className="ca-bread-sep">&gt;</span>
            <span className="ca-bread-active">Detalle</span>
          </nav>
          <div className="da-titulo-wrap">
            <button className="da-btn-back" onClick={() => navigate('/alertas/consultar')}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="da-title">Detalle de alerta #{alerta.id}</h1>
          </div>
        </div>

        <div className="da-header-der">
          {puedeCerrar && (
            <button className="da-btn-cerrar" onClick={() => setModalCerrarAbierto(true)} data-testid="alert-close-button">
              <CheckCircle2 size={16} /> Cerrar alerta
            </button>
          )}
        </div>
      </header>

      <div className="da-grid">
        <div className="da-col-main">
          <section className="da-card">
            <div className="da-card-header">
              <div className="da-card-titulo"><Info size={18} /> Información general</div>
              <div className="da-header-badges">
                <BadgeSeveridad severidad={alerta.severidad} />
                <BadgeEstado estado={alerta.estado} />
              </div>
            </div>

            <div className="da-info-grid">
              <div className="da-info-item da-info-item--full">
                <label><User size={14} /> Aprendiz</label>
                <div className="da-aprendiz-info">
                  <AvatarAprendiz nombre={nombreAprendiz} size="lg" />
                  <div>
                    <strong>{nombreAprendiz}</strong>
                    <span>{alerta.aprendizDocumento || alerta.aprendiz?.documento || 'No registrado'}</span>
                  </div>
                </div>
              </div>
              <div className="da-info-item">
                <label><Users size={14} /> Grupo</label>
                <p>{alerta.grupoCodigo || alerta.grupo?.codigo || '-'}</p>
              </div>
              <div className="da-info-item">
                <label><ShieldAlert size={14} /> Tipo de alerta</label>
                <p>{(alerta.tipoAlerta ?? '').replace(/_/g, ' ')}</p>
              </div>
              <div className="da-info-item">
                <label><Info size={14} /> Origen</label>
                <div className="da-origen-tag">{alerta.origen || 'MANUAL'}</div>
              </div>
              <div className="da-info-item">
                <label><Calendar size={14} /> Fecha creación</label>
                <p>{formatFechaLarga(alerta.fechaCreacion)}</p>
              </div>
              <div className="da-info-item">
                <label><User size={14} /> Creado por</label>
                <p>{alerta.responsableNombre || 'Sistema'}</p>
              </div>
            </div>
          </section>

          <section className="da-card">
            <div className="da-card-header">
              <div className="da-card-titulo"><NotebookText size={18} /> Descripción</div>
            </div>
            <div className="da-descripcion-content">{alerta.descripcion}</div>
          </section>

          {alerta.observacionesVinculadas && alerta.observacionesVinculadas.length > 0 && (
            <section className="da-card">
              <div className="da-card-header">
                <div className="da-card-titulo" style={{ color: '#0b2442' }}><Info size={18} /> Observaciones Vinculadas ({alerta.observacionesVinculadas.length})</div>
              </div>
              <div className="da-observaciones-list" style={{ padding: '20px' }}>
                {alerta.observacionesVinculadas.map((obs, index) => (
                  <div key={obs.id} style={{ 
                    padding: '12px 16px', 
                    background: '#f8fafc', 
                    borderLeft: '4px solid #0b2442', 
                    borderRadius: '0 8px 8px 0',
                    marginBottom: index === alerta.observacionesVinculadas.length - 1 ? 0 : '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#0b2442' }}>Observación {index + 1}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{formatFechaLarga(obs.fecha)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{obs.descripcion}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="da-col-aside">
          <section className="da-card">
            <div className="da-card-header">
              <div className="da-card-titulo"><History size={18} /> Historial</div>
            </div>
            <div className="da-timeline">
              <div className="da-timeline-item">
                <div className="da-timeline-dot" />
                <div className="da-timeline-content">
                  <div className="da-timeline-head">
                    <strong>{alerta.estado}</strong>
                    <span>{formatFechaLarga(alerta.fechaCreacion)}</span>
                  </div>
                  <p>Estado inicial de la alerta</p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {modalCerrarAbierto && (
        <ModalCerrarAlerta
          isOpen={modalCerrarAbierto}
          onClose={() => setModalCerrarAbierto(false)}
          alertaId={alerta.id}
          aprendizNombre={nombreAprendiz}
          onCerradaExitosamente={() => {
            setModalCerrarAbierto(false);
            setAlerta(prev => ({ ...prev, estado: 'CERRADA' }));
          }}
        />
      )}
    </div>
  );
}


