import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import "./Dashboard.css";

export default function Dashboard({ children }) {
  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-body">
        <Sidebar />

        <main className="dashboard-content">
          {children || (
            <div className="dashboard-welcome">
              <h1>Bienvenido a SIMA</h1>
              <p>Sistema de Monitoreo y Administracion</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
