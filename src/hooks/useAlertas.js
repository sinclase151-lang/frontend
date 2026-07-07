import { useState, useCallback, useEffect } from 'react';
import { obtenerAlertas } from '../services/alertasService';

const FILTROS_INICIALES = {
  estado:            '',
  severidad:         '',
  tipoAlerta:        '',
  grupoId:           '',
  aprendizId:        '',
  aprendizBusqueda:  '',
  fechaInicio:       '',
  fechaFin:          ''
};

export function useAlertas() {
  // ── Estado ───────────────────────────────────────────────────────────────
  const [alertas,       setAlertas]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [total,         setTotal]         = useState(0);
  const [paginaActual,  setPaginaActual]  = useState(1);
  const [limite,        setLimite]        = useState(5);
  const [filtros,       setFiltros]       = useState({ ...FILTROS_INICIALES });

  // ── cargarAlertas ────────────────────────────────────────────────────────
  const cargarAlertas = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await obtenerAlertas({
      ...filtros,
      pagina: paginaActual,
      limite
    });

    if (err) {
      setError(err);
      setAlertas([]);
      setTotal(0);
    } else {
      // Soporta { data: [], total: N } o un array plano
      if (Array.isArray(data)) {
        setAlertas(data);
        setTotal(data.length);
      } else {
        setAlertas(data?.data ?? data?.alertas ?? []);
        setTotal(data?.total ?? 0);
      }
    }

    setLoading(false);
  }, [filtros, paginaActual, limite]);

  // ── aplicarFiltrosCompletos ──────────────────────────────────────────────
  const aplicarFiltrosCompletos = useCallback((nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  }, []);

  // ── cambiarFiltro ────────────────────────────────────────────────────────
  const cambiarFiltro = useCallback((campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPaginaActual(1); // resetea a primera página
  }, []);

  // ── limpiarFiltros ───────────────────────────────────────────────────────
  const limpiarFiltros = useCallback(() => {
    setFiltros({ ...FILTROS_INICIALES });
    setPaginaActual(1);
  }, []);

  // ── cambiarPagina ────────────────────────────────────────────────────────
  const cambiarPagina = useCallback((numero) => {
    setPaginaActual(numero);
  }, []);

  // ── cambiarLimite ────────────────────────────────────────────────────────
  const cambiarLimite = useCallback((nuevoLimite) => {
    setLimite(nuevoLimite);
    setPaginaActual(1); // resetea a primera página al cambiar el tamaño
  }, []);

  // ── Efecto: recarga cuando cambian filtros, página o límite ──────────────
  useEffect(() => {
    cargarAlertas();
  }, [cargarAlertas]);

  // ── Retorno ──────────────────────────────────────────────────────────────
  return {
    // estado
    alertas,
    loading,
    error,
    total,
    paginaActual,
    limite,
    filtros,
    // funciones
    cargarAlertas,
    cambiarFiltro,
    aplicarFiltrosCompletos,
    limpiarFiltros,
    cambiarPagina,
    cambiarLimite
  };
}
