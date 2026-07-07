export const API_URL = "/api";
export const APRENDICES_POR_PAGINA = 5;
export const HISTORIAL_POR_PAGINA = 4;

export const ESTADOS = {
  PRESENTE: { label: "Presente", color: "#238500", className: "presente" },
  TARDE: { label: "Tarde", color: "#f5b400", className: "retardado" },
  INASISTENTE: { label: "Ausente", color: "#ef4444", className: "ausente" },
  JUSTIFICADA: { label: "Justificada", color: "#0b2442", className: "justificado" },
  PENDIENTE: { label: "Sin registro", color: "#94a3b8", className: "pendiente" }
};

export const ESTADOS_REGISTRABLES = ["PRESENTE", "INASISTENTE", "TARDE", "JUSTIFICADA"];
export const ESTADOS_FILTRO = [...ESTADOS_REGISTRABLES, "PENDIENTE"];

export const METODOS = [
  { value: "manual", label: "Manual" },
  { value: "huella", label: "Huella" },
  { value: "qr", label: "QR" },
  { value: "sin-registro", label: "Sin registro" }
];

export const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" }
];

