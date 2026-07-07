import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Registramos los elementos necesarios para el gráfico de barras apiladas
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

function GraficoBarrasApiladas({ etiquetas }) {
  const data = {
    labels: etiquetas,
    datasets: [
      {
        label: "Dataset 1",
        data: [700, -200, -400, 150],
        backgroundColor: "rgba(255, 99, 132, 0.7)"
      },
      {
        label: "Dataset 2",
        data: [-600, 200, 800, -100],
        backgroundColor: "rgba(75, 192, 192, 0.7)"
      },
      {
        label: "Dataset 3",
        data: [-800, -900, -200, -500],
        backgroundColor: "rgba(54, 162, 235, 0.7)"
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "Chart.js Bar Chart - Stacked",
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
        stacked: true,
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
        stacked: true,
        grid: {
          color: "#e5e7eb"
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
      <Bar data={data} options={options} />
    </div>
  );
}

export default GraficoBarrasApiladas;
