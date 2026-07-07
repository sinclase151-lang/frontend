import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCheck, Trash2, AlertTriangle, Bot, Info, 
  ChevronLeft, RefreshCw, Loader2, ArrowLeft
} from 'lucide-react';
import { 
  obtenerNotificaciones, 
  marcarNotificacionLeida, 
  marcarTodasComoLeidas 
} from '../../services/alertasService';
import './notificacionesPage.css';

export default function NotificacionesPage() {
  const navigate = useNavigate();
  const [notifis, setNotifis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data } = await obtenerNotificaciones();
    if (data) setNotifis(data);
    setLoading(false);
  }

  async function handleMarcarLeida(id, alertaId) {
    setProcesando(true);
    await marcarNotificacionLeida(id);
    setNotifis(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setProcesando(false);
    if (alertaId) navigate(`/alertas/${alertaId}`);
  }

  async function handleMarcarTodas() {
    setProcesando(true);
    await marcarTodasComoLeidas();
    setNotifis(prev => prev.map(n => ({ ...n, leida: true })));
    setProcesando(false);
  }

  function handleEliminar(e, id) {
    e.stopPropagation();
    const confirmar = window.confirm("Desea eliminar esta notificacion de la vista?");
    if (!confirmar) return;
    setNotifis(prev => prev.filter(n => n.id !== id));
  }

  function getIcon(tipo) {
    if (tipo === 'AUTOMATICA') return <Bot size={20} className="nt-icon-bot" />;
    if (tipo === 'SISTEMA') return <Info size={20} className="nt-icon-sys" />;
    return <AlertTriangle size={20} className="nt-icon-alert" />;
  }

  function formatTime(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleString('es-CO', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    });
  }

  const noLeidas = notifis.filter(n => !n.leida).length;

  return (
    <div className="nt-page">
      {/* Header / Breadcrumb */}
      <div className="nt-header-wrap">
        <div className="nt-title-row">
          <div className="nt-title-group">
            <button className="nt-btn-back" onClick={() => navigate(-1)} title="Volver">
              <ArrowLeft size={20} />
            </button>
            <div className="nt-bell-bg">
              <Bell size={24} />
            </div>
            <div>
              <h1>Notificaciones</h1>
              <p>Gestiona los avisos y alertas de seguimiento ({noLeidas} sin leer)</p>
            </div>
          </div>
          
          <div className="nt-actions">
            <button 
              className="nt-btn-secondary" 
              onClick={handleMarcarTodas} 
              disabled={noLeidas === 0 || procesando}
            >
              <CheckCheck size={18} /> Marcar todas como leídas
            </button>
            <button className="nt-btn-refresh" onClick={cargar} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="nt-content">
        {loading ? (
          <div className="nt-state-msg">
            <Loader2 size={40} className="spin" />
            <p>Cargando tu historial...</p>
          </div>
        ) : notifis.length === 0 ? (
          <div className="nt-state-msg empty">
            <Bell size={60} />
            <h3>No tienes notificaciones</h3>
            <p>Te avisaremos cuando ocurra algo importante.</p>
          </div>
        ) : (
          <div className="nt-list">
            {notifis.map(n => (
              <article 
                key={n.id} 
                className={`nt-item ${!n.leida ? 'unread' : ''}`}
                onClick={() => handleMarcarLeida(n.id, n.alertaId)}
              >
                <div className="nt-item-icon">
                  {getIcon(n.tipo)}
                </div>
                
                <div className="nt-item-body">
                  <div className="nt-item-main">
                    <p className="nt-item-text">{n.mensaje}</p>
                    <span className="nt-item-time">{formatTime(n.fecha)}</span>
                  </div>
                  {!n.leida && <span className="nt-badge-new">Nuevo</span>}
                </div>

                <div className="nt-item-actions">
                   <button className="nt-btn-action" aria-label="Eliminar" onClick={(e) => handleEliminar(e, n.id)}>
                     <Trash2 size={16} />
                   </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
