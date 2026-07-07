import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  UserRound
} from "lucide-react";
import "./Navbar.css";
import NotificacionCampana from "./NotificacionCampana";
import { limpiarSesionUsuario } from "../../utils/storage";

function Navbar() {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const nombreUsuario = localStorage.getItem("username") || localStorage.getItem("usuario") || "Carlos Loda";
  const rolUsuario = (localStorage.getItem("rol") || "Administrador").toLowerCase();
  const esInstructor = rolUsuario === "instructor";
  const esCoordinador = rolUsuario === "coordinador";
  const esSuperAdmin = rolUsuario === "super_admin";

  const manejarCerrarSesion = () => {
    limpiarSesionUsuario();
    navigate("/");
    window.location.reload();
  };

  const toggleProfileMenu = (e) => {
    e.stopPropagation();
    setIsProfileOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".profile-menu") &&
        !e.target.closest(".profile-section")
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const initials = nombreUsuario
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className={`sima-navbar-main ${esInstructor ? "navbar-instructor" : ""} ${esSuperAdmin ? "navbar-superadmin" : ""}`}>
      <div className="sima-navbar-right">
        <NotificacionCampana esCoordinador={esCoordinador} />

        <button className="profile-section" type="button" onClick={toggleProfileMenu}>
          <span className="profile-avatar-circle">{initials || "CL"}</span>
          <span className="profile-info">
            <span className="profile-name">{nombreUsuario}</span>
            <span className="profile-role">
              {rolUsuario ? rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1) : "Administrador"}
            </span>
          </span>
          <ChevronDown size={18} className="profile-arrow" />
        </button>

        {isProfileOpen && (
          <div className="profile-menu">
            <button type="button" onClick={() => navigate("/perfil")}>
              <UserRound size={17} />
              <span>Mi perfil</span>
            </button>
            <hr />
            <button type="button" className="logout-btn" onClick={manejarCerrarSesion}>
              <LogOut size={17} />
              <span>Cerrar sesion</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
