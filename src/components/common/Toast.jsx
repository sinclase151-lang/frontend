import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Espera a la animación de salida
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="toast-icon" size={20} />,
    error: <XCircle className="toast-icon" size={20} />,
    warning: <AlertTriangle className="toast-icon" size={20} />
  };

  return (
    <div className={`toast-card ${type} ${isExiting ? 'exit' : 'enter'}`}>
      <div className="toast-content">
        {icons[type]}
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={() => {
        setIsExiting(true);
        setTimeout(onClose, 300);
      }}>
        <X size={16} />
      </button>
      <div className="toast-progress-bar">
        <div className="toast-progress-fill" style={{ animationDuration: `${duration}ms` }} />
      </div>
    </div>
  );
}
