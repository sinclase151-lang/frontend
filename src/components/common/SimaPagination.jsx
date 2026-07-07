import { ChevronLeft, ChevronRight } from "lucide-react";

export default function SimaPagination({
  desde = 0,
  hasta = 0,
  total = 0,
  entidad = "registros",
  paginaActual = 1,
  totalPaginas = 1,
  onCambiarPagina,
  className = ""
}) {
  const paginaSegura = Math.min(Math.max(paginaActual, 1), Math.max(totalPaginas, 1));
  const totalPaginasSeguro = Math.max(totalPaginas, 1);

  return (
    <div className={`sima-pagination ${className}`.trim()}>
      <span>
        Mostrando {desde}-{hasta} de {total} {entidad}
      </span>

      <div className="sima-pagination-controls">
        <button
          type="button"
          onClick={() => onCambiarPagina?.(paginaSegura - 1)}
          disabled={paginaSegura === 1}
          aria-label="Pagina anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <strong>Pagina {paginaSegura} de {totalPaginasSeguro}</strong>

        <button
          type="button"
          onClick={() => onCambiarPagina?.(paginaSegura + 1)}
          disabled={paginaSegura === totalPaginasSeguro}
          aria-label="Pagina siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
