import './badges.css';

const CONFIG = {
  LEVE: {
    label: 'LEVE',
    clase: 'badge-sev badge-sev--leve'
  },
  MODERADA: {
    label: 'MODERADA',
    clase: 'badge-sev badge-sev--moderada'
  },
  GRAVE: {
    label: 'GRAVE',
    clase: 'badge-sev badge-sev--grave'
  }
};

export default function BadgeSeveridad({ severidad }) {
  const cfg = CONFIG[severidad] ?? CONFIG.LEVE;

  return (
    <span className={cfg.clase}>
      {cfg.label}
    </span>
  );
}
