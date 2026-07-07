import './badges.css';

const CONFIG = {
  ABIERTA:        { label: 'ABIERTA',        clase: 'badge-est badge-est--abierta'   },
  CERRADA:        { label: 'CERRADA',        clase: 'badge-est badge-est--cerrada'   }
};

export default function BadgeEstado({ estado }) {
  const estadoNormalizado = estado === 'ACTIVA' ? 'ABIERTA' : estado;
  const cfg = CONFIG[estadoNormalizado] ?? CONFIG.ABIERTA;

  return (
    <span className={cfg.clase} data-testid="alert-status-badge">
      {cfg.label}
    </span>
  );
}
