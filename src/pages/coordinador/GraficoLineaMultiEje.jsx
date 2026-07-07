import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
} from "chart.js";
import { Line } from "react-chartjs-2";

// Registramos los elementos necesarios para el gráfico de líneas
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
);

function GraficoLineaMultiEje({ etiquetas }) {
  const data = {
    labels: etiquetas,
    datasets: [
      {
        label: "Dataset 1",
        data: [700, 0, -50, -200, 180],
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.35)",
        pointBackgroundColor: "rgba(255, 99, 132, 1)",
        pointBorderColor: "#ffffff",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
        tension: 0.3,
        yAxisID: "y"
      },
      {
        label: "Dataset 2",
        data: [50, 350, 950, 480, -100],
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.35)",
        pointBackgroundColor: "rgba(54, 162, 235, 1)",
        pointBorderColor: "#ffffff",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
        tension: 0.3,
        yAxisID: "y1"
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      title: {
        display: true,
        text: "Chart.js Line Chart - Multi Axis",
        color: "#555",
        font: {
          size: 16,
          weight: "bold"
        },
        padding: {
          bottom: 14
        }
      },
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#666",
          font: {
            size: 12,
            weight: "500"
          },
          padding: 14,
          boxWidth: 34
        }
      },
      tooltip: {
        backgroundColor: "#0b2442",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#d1d5db",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: "#e5e7eb"
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12
          }
        }
      },
      y: {
        type: "linear",
        position: "left",
        grid: {
          color: "#e5e7eb"
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12
          }
        }
      },
      y1: {
        type: "linear",
        position: "right",
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12
          }
        }
      }
    }
  };

  return (
    <div className="contenedor-grafico-chart">
      <Line data={data} options={options} />
    </div>
  );
}

export default GraficoLineaMultiEje;
