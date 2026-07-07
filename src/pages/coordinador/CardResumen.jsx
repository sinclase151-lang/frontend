export default function CardResumen({
  titulo,
  valor = 0,
  descripcion,
  icono,
  color = "verde"
}) {
  const numero = Number(valor);
  const valorFormateado = Number.isFinite(numero)
    ? numero.toLocaleString("es-CO")
    : valor;

  return (
    <article className={`card-resumen card-resumen-${color}`}>
      <div className="card-resumen-superior">
        <div className="card-resumen-icono">{icono}</div>

        <div className="card-resumen-info">
          <div className="card-resumen-valor">{valorFormateado}</div>
          <h3 className="card-resumen-titulo">{titulo}</h3>
        </div>
      </div>

      <p className="card-resumen-descripcion">{descripcion}</p>
    </article>
  );
}
