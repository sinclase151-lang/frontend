import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard";
import PanelCoordinador from "./pages/coordinador/PanelCoordinador";
import PanelSuperAdmin from "./pages/superadmin/PanelSuperAdmin";
import RegistroAprendices from "./pages/instructor/RegistroAprendices";
import PanelInstructor from "./pages/instructor/PanelInstructor";
import InstructorSeccion from "./pages/instructor/InstructorSeccion";
import MisGrupos from "./pages/instructor/MisGrupos";
import HistorialAsistenciaGrupo from "./pages/instructor/HistorialAsistenciaGrupo";
import AsistenciaInstructor from "./pages/instructor/AsistenciaInstructor";
import Fichas from "./pages/fichas/Fichas";
import GrupoDetalle from "./pages/fichas/GrupoDetalle";
import Perfil from "./pages/perfil/Perfil";
import Usuario from "./pages/usuarios/Usuario";
import Observaciones from "./pages/observador/Observaciones";
import ConsultarAlertas from "./pages/alertas/ConsultarAlertas";
import AlertasCoordinador from "./pages/alertas/AlertasCoordinador";
import DetalleAlerta from "./pages/alertas/DetalleAlerta";
import NotificacionesPage from "./pages/notificaciones/NotificacionesPage";
import HuellasBiometricas from "./pages/biometria/HuellasBiometricas";
import { limpiarSesionUsuario } from "./utils/storage";

function App() {
  const [token, setToken] = useState(localStorage.getItem("access"));
  const [rol, setRol] = useState(
    (localStorage.getItem("rol") || "").toLowerCase()
  );

  function manejarLogin() {
    setToken(localStorage.getItem("access"));
    setRol((localStorage.getItem("rol") || "").toLowerCase());
  }

  function manejarLogout() {
    limpiarSesionUsuario();
    setToken(null);
    setRol("");
  }

  const esInstructor = rol === "instructor" || rol === "instructor_lider" || rol === "instructor_asignado";
  const esCoordinador = rol === "coordinador";
  const esSuperAdmin = rol === "super_admin";
  const esRolWebValido = esInstructor || esCoordinador || esSuperAdmin;
  const rutaInicio = esInstructor
    ? "/instructor/dashboard"
    : esSuperAdmin
      ? "/dashboard"
      : esCoordinador
      ? "/dashboard"
      : "/login";

  useEffect(() => {
    if (token && rol && !esRolWebValido) {
      const timeout = window.setTimeout(manejarLogout, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [token, rol, esRolWebValido]);

  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={false}
        closeOnClick={false}
        draggable={false}
        newestOnTop
        hideProgressBar
      />
      <Routes>
        {token ? (
          <>
            <Route
              path="/"
              element={<Navigate to="/login" replace />}
            />

            <Route
              path="/login"
              element={<Login onLogin={manejarLogin} />}
            />

            <Route
              path="/dashboard"
              element={
                esInstructor ? (
                  <Navigate to="/instructor/dashboard" replace />
                ) : esSuperAdmin ? (
                  <Dashboard onLogout={manejarLogout}>
                    <PanelSuperAdmin />
                  </Dashboard>
                ) : (
                  <Dashboard onLogout={manejarLogout}>
                    <PanelCoordinador />
                  </Dashboard>
                )
              }
            />

            <Route
              path="/instructor/dashboard"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <PanelInstructor />
                </Dashboard>
              }
            />

            {/* APRENDICES INSTRUCTOR */}
            <Route
              path="/instructor/aprendices"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <RegistroAprendices />
                </Dashboard>
              }
            />

            <Route
              path="/instructor/grupos"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <MisGrupos />
                </Dashboard>
              }
            />

            <Route
              path="/instructor/grupos/:id"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <GrupoDetalle />
                </Dashboard>
              }
            />

            <Route
              path="/instructor/grupos/:id/asistencias"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <HistorialAsistenciaGrupo />
                </Dashboard>
              }
            />

            <Route
              path="/instructor/asistencia"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <AsistenciaInstructor />
                </Dashboard>
              }
            />

            <Route
              path="/instructor/asistencias"
              element={<Navigate to="/instructor/asistencia" replace />}
            />

            <Route
              path="/instructor/observaciones"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <Observaciones />
                </Dashboard>
              }
            />

            <Route
              path="/instructor/reportes"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <InstructorSeccion
                    titulo="Reportes"
                    descripcion="Consulta reportes de asistencia, observaciones y consolidado de tus grupos."
                  />
                </Dashboard>
              }
            />

            <Route
              path="/instructor/eventos"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <InstructorSeccion
                    titulo="Eventos de acceso"
                    descripcion="Revisa actividad reciente del instructor y eventos importantes del sistema."
                  />
                </Dashboard>
              }
            />

            {/* APRENDICES COORDINADOR */}
            <Route
              path="/aprendices"
              element={
                esInstructor ? (
                  <Navigate to="/instructor/aprendices" replace />
                ) : (
                  <Dashboard onLogout={manejarLogout}>
                    <RegistroAprendices />
                  </Dashboard>
                )
              }
            />

            <Route
              path="/usuarios"
              element={
                esInstructor ? (
                  <Navigate to="/instructor/dashboard" replace />
                ) : (
                  <Dashboard onLogout={manejarLogout}>
                    <Usuario />
                  </Dashboard>
                )
              }
            />

            <Route
              path="/biometria/huellas"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <HuellasBiometricas />
                </Dashboard>
              }
            />

            <Route
              path="/fichas"
              element={
                esInstructor ? (
                  <Navigate to="/instructor/grupos" replace />
                ) : (
                  <Dashboard onLogout={manejarLogout}>
                    <Fichas />
                  </Dashboard>
                )
              }
            />

            <Route
              path="/fichas/:id"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <GrupoDetalle />
                </Dashboard>
              }
            />

            <Route
              path="/perfil"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <Perfil />
                </Dashboard>
              }
            />

            <Route
              path="/alertas"
              element={<Navigate to="/alertas/consultar" replace />}
            />

            <Route
              path="/alertas/consultar"
              element={
                <Dashboard onLogout={manejarLogout}>
                  {rol === 'coordinador' ? <AlertasCoordinador /> : <ConsultarAlertas />}
                </Dashboard>
              }
            />

            <Route
              path="/alertas/:id"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <DetalleAlerta />
                </Dashboard>
              }
            />

            <Route
              path="/notificaciones"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <NotificacionesPage />
                </Dashboard>
              }
            />

            <Route
              path="/configuracion"
              element={
                <Dashboard onLogout={manejarLogout}>
                  <InstructorSeccion
                    titulo="Configuracion"
                    descripcion="Administra las preferencias generales del sistema y las opciones disponibles para tu rol."
                  />
                </Dashboard>
              }
            />

            <Route
              path="*"
              element={<Navigate to={rutaInicio} replace />}
            />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={<Navigate to="/login" replace />}
            />

            <Route
              path="/login"
              element={<Login onLogin={manejarLogin} />}
            />

            <Route
              path="*"
              element={<Navigate to="/login" replace />}
            />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
