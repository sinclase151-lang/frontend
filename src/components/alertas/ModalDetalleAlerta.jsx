import { useState, useEffect } from 'react';
import {
  Calendar, User, Users, AlertCircle,
  Info, History, CheckCircle2, ShieldAlert, NotebookText, X
} from 'lucide-react';
import { obtenerAlertaPorId } from '../../services/alertasService';
import { getRolActual } from '../../services/alertasService';
import BadgeSeveridad from './BadgeSeveridad';
import BadgeEstado from './BadgeEstado';
import AvatarAprendiz from './AvatarAprendiz';
import ModalCerrarAlerta from './ModalCerrarAlerta';
import './modal.css';
import '../../pages/alertas/detalleAlerta.css';

function formatFechaLarga(isoStr) {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function ModalDetalleAlerta({ isOpen, onClose, alertaId, onAlertaCerrada }) {
  const [alerta, setAlerta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalCerrarAbierto, setModalCerrarAbierto] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    setAlerta(null);
    const { data, error: err } = await obtenerAlertaPorId(alertaId);
    if (err) setError(err);
    else setAlerta(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && alertaId) {
      cargarDatos();
    }
  }, [isOpen, alertaId]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const esCoordinador = getRolActual() === 'coordinador';
  const puedeCerrar = esCoordinador && alerta?.estado === 'ABIERTA';
  const nombreAprendiz = alerta?.aprendizNombre || alerta?.aprendiz?.nombre || '-';

  return (
    <>
      {/* Overlay */}
      <div className="mcal-overlay" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        className="mcal-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '900px', padding: 0 }}
      >
        {/* Header del modal */}
        <div className="mcal-header" style={{
          padding: '20px 28px',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 className="mcal-titulo" style={{ fontSize: '18px' }}>
            {alerta ? `Detalle de alerta #${alerta.id}` : 'Detalle de alerta'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {puedeCerrar && (
              <button className="da-btn-cerrar" onClick={() => setModalCerrarAbierto(true)} data-testid="alert-close-button">
                <CheckCircle2 size={16} /> Cerrar alerta
              </button>
            )}
            <button type="button" className="mcal-btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo del modal */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>

          {/* Estado: cargando */}
          {loading && (
            <div className="da-estado-carga">
              <div className="da-spinner" />
              <span>Cargando detalle de la alerta...</span>
            </div>
          )}

          {/* Estado: error */}
          {!loading && (error || !alerta) && (
            <div className="da-estado-error">
              <AlertCircle size={40} />
              <h2>Error al cargar la alerta</h2>
              <p>{error || 'No se encontró la información solicitada'}</p>
              <button className="mcal-btn-cancelar" onClick={onClose}>
                Cerrar
              </button>
            </div>
          )}

          {/* Contenido principal */}
          {!loading && !error && alerta && (
            <div className="da-grid">
              <div className="da-col-main">
                {/* Información general */}
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

                {/* Descripción */}
                <section className="da-card">
                  <div className="da-card-header">
                    <div className="da-card-titulo"><NotebookText size={18} /> Descripción</div>
                  </div>
                  <div className="da-descripcion-content">{alerta.descripcion}</div>
                </section>

                {/* Observaciones vinculadas */}
                {alerta.observacionesVinculadas && alerta.observacionesVinculadas.length > 0 && (
                  <section className="da-card">
                    <div className="da-card-header">
                      <div className="da-card-titulo" style={{ color: '#0b2442' }}>
                        <Info size={18} /> Observaciones Vinculadas ({alerta.observacionesVinculadas.length})
                      </div>
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

              {/* Historial */}
              <aside className="da-col-aside">
                <section className="da-card">
                  <div className="da-card-header">
                    <div className="da-card-titulo"><History size={18} /> Historial</div>
                  </div>
                  <div className="da-timeline">
                    {alerta.estado === 'CERRADA' && alerta.fecha_cierre && (
                      <div className="da-timeline-item">
                        <div className="da-timeline-dot" style={{ background: '#238500', borderColor: '#dcfce7' }} />
                        <div className="da-timeline-content">
                          <div className="da-timeline-head">
                            <strong style={{ color: '#238500' }}>CERRADA</strong>
                            <span>{formatFechaLarga(alerta.fecha_cierre)}</span>
                          </div>
                          <p style={{ marginTop: '8px', fontStyle: 'italic', color: '#475569' }}>
                            "{alerta.justificacion_cierre}"
                          </p>
                          {alerta.cerrada_por && (
                            <p style={{ fontSize: '11px', marginTop: '4px', color: '#94a3b8' }}>
                              Cerrada por: ID Usuario {alerta.cerrada_por}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="da-timeline-item">
                      <div className="da-timeline-dot" />
                      <div className="da-timeline-content">
                        <div className="da-timeline-head">
                          <strong>ABIERTA</strong>
                          <span>{formatFechaLarga(alerta.fechaCreacion)}</span>
                        </div>
                        <p>Estado inicial de la alerta</p>
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* Modal cerrar alerta (anidado) */}
      {modalCerrarAbierto && (
        <ModalCerrarAlerta
          isOpen={modalCerrarAbierto}
          onClose={() => setModalCerrarAbierto(false)}
          alertaId={alerta?.id}
          aprendizNombre={nombreAprendiz}
          onCerradaExitosamente={() => {
            setModalCerrarAbierto(false);
            setAlerta(prev => ({ ...prev, estado: 'CERRADA' }));
            if (onAlertaCerrada) onAlertaCerrada(alerta?.id);
          }}
        />
      )}
    </>
  );
}


