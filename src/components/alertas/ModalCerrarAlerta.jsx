import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, X, Info } from 'lucide-react';
import { cerrarAlerta } from '../../services/alertasService';
import './modal.css';

export default function ModalCerrarAlerta({ isOpen, onClose, alertaId, aprendizNombre, onCerradaExitosamente }) {
  const [justificacion, setJustificacion] = useState('');
  const [errorJustificacion, setErrorJustificacion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [yaCerrada, setYaCerrada] = useState(false);
  const [toast, setToast] = useState(null);
  
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  async function handleConfirmar() {
    if (yaCerrada) {
      onClose();
      return;
    }

    if (justificacion.trim().length < 20) {
      setErrorJustificacion(true);
      return;
    }
    
    setErrorJustificacion(false);
    setLoading(true);
    setErrorGlobal(null);

    const { error: err } = await cerrarAlerta(alertaId, justificacion);

    if (err) {
      setLoading(false);
      if (err === 404) {
        setErrorGlobal("No se encontró la alerta. Puede haber sido eliminada.");
      } else if (err === 409 || err === 400) {
        setErrorGlobal("Esta alerta ya fue cerrada anteriormente.");
        setYaCerrada(true);
      } else if (err === 403) {
        setErrorGlobal("No tienes permisos para cerrar esta alerta.");
      } else {
        setErrorGlobal("Ocurrió un error al cerrar la alerta. Intenta nuevamente.");
      }
      return;
    }

    setToast("Alerta cerrada correctamente");
    setLoading(false);
    
    setTimeout(() => {
      onCerradaExitosamente();
    }, 1500);
  }

  return (
    <>
      <div 
        className="mcal-overlay" 
        onClick={() => !loading && onClose()} 
        aria-hidden="true" 
      />
      <div 
        className="mcal-modal" 
        role="dialog" 
        aria-modal="true" 
        data-testid="alert-close-modal"
        style={{ 
          maxWidth: '480px', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0
        }}
      >
        <div className="mcal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e5e7eb', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ color: '#f5b400', display: 'flex', alignItems: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <h2 className="mcal-titulo" style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0b2442' }}>Cerrar alerta</h2>
          </div>
          <button type="button" className="mcal-btn-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <div className="mcal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
            Estás a punto de gestionar la alerta de <strong>{aprendizNombre}</strong>. 
            Proporciona la justificación del cierre.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Justificación del cierre <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              ref={textareaRef}
              placeholder="Describe brevemente cómo fue atendida la situación..."
              value={justificacion}
              onChange={(e) => {
                if (e.target.value.length <= 300) {
                  setJustificacion(e.target.value);
                  if (errorJustificacion && e.target.value.trim().length >= 20) {
                    setErrorJustificacion(false);
                  }
                }
              }}
              style={{
                width: '100%', minHeight: '100px', padding: '12px',
                borderRadius: '6px', border: `1px solid ${errorJustificacion ? '#ef4444' : '#d1d5db'}`,
                fontSize: '14px', resize: 'vertical', fontFamily: 'inherit',
                outline: 'none',
                boxShadow: errorJustificacion ? '0 0 0 1px #ef4444' : 'none'
              }}
              onFocus={(e) => {
                if (!errorJustificacion) e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                e.target.style.borderColor = errorJustificacion ? '#ef4444' : '#0b2442';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = errorJustificacion ? '0 0 0 1px #ef4444' : 'none';
                e.target.style.borderColor = errorJustificacion ? '#ef4444' : '#d1d5db';
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: errorJustificacion ? '#ef4444' : 'transparent', fontWeight: '500' }}>
                {errorJustificacion ? 'Mínimo 20 caracteres requeridos' : ' '}
              </span>
              <span style={{ color: '#6b7280' }}>
                {justificacion.length} / 300
              </span>
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#f3f4f6', padding: '12px 14px', borderRadius: '6px', 
            display: 'flex', gap: '10px', alignItems: 'flex-start' 
          }}>
            <Info size={18} color="#4b5563" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.4' }}>
              La alerta permanecerá visible en el historial del aprendiz pero no podrá ser modificada.
            </span>
          </div>

          {errorGlobal && (
            <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>
              {errorGlobal}
            </div>
          )}
        </div>

        <div className="mcal-footer" style={{ 
          padding: '16px 24px', borderTop: '1px solid #e5e7eb', 
          display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 0 
        }}>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={loading}
            style={{ 
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', 
              backgroundColor: '#fff', color: '#374151', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' 
            }}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleConfirmar}
            disabled={loading}
            data-testid="alert-close-submit"
            style={{ 
              padding: '8px 16px', borderRadius: '6px', border: 'none', 
              backgroundColor: yaCerrada ? '#0b2442' : '#ef4444', color: '#fff', 
              fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cerrando...</>
            ) : yaCerrada ? (
              'Entendido'
            ) : (
              'Confirmar cierre'
            )}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          backgroundColor: '#238500', color: 'white', padding: '12px 24px',
          borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999,
          fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'mcal-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <Info size={18} />
          {toast}
        </div>
      )}
      <style>{`
        @keyframes mcal-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}


