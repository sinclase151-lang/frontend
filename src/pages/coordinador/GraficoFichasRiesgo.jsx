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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

function GraficoFichasRiesgo() {
  const data = {
    labels: ["ADSO-2501", "ADSO-2502", "ADSO-2503", "ADSO-2504"],
    datasets: [
      {
        label: "Nivel de riesgo",
        data: [38, 25, 18, 12],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)"
        ],
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: "Top fichas con mayor riesgo",
        font: {
          size: 16,
          weight: "bold"
        }
      },
      legend: {
        display: true,
        position: "top"
      },
      tooltip: {
        backgroundColor: "#0b2442",
        titleColor: "#ffffff",
        bodyColor: "#ffffff"
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Puntaje de riesgo"
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

export default GraficoFichasRiesgo;
