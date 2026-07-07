import { useState } from "react";
import "./Login.css";

export default function OlvidePassword({ onVolver }) {
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [mensaje, setMensaje] = useState("");

  function restablecerPassword(e) {
    e.preventDefault();
    setMensaje(
      "La recuperacion de contrasena aun no esta conectada porque el backend actual no expone ese endpoint. Cuando lo tengas, esta pantalla ya queda lista para enlazarlo."
    );
    setNumeroDocumento("");
  }

  return (
    <div className="login-sima-container">
      <section className="login-sima-hero" aria-label="Recuperacion de acceso">
        <div className="login-sima-brand" aria-label="SENA">
          <span className="login-sima-brand-dot"></span>
          <span>SENA</span>
        </div>

        <div className="login-sima-copy">
          <p className="login-sima-eyebrow">Recuperacion de acceso</p>
          <h1>Restablece tu contrasena</h1>
          <p>
            Valida tu documento institucional. En cuanto el backend tenga el endpoint,
            aqui mismo podremos ejecutar el restablecimiento real.
          </p>
        </div>
      </section>

      <main className="login-sima-panel">
        <div className="login-sima-card" role="region" aria-labelledby="olvide-title">
          <h2 className="login-sima-title" id="olvide-title">Recuperar contrasena</h2>
          <p className="login-sima-subtitle">Ingresa tu numero de documento para continuar</p>

          {mensaje && (
            <div className="login-sima-message" role="status">
              {mensaje}
            </div>
          )}

          <form onSubmit={restablecerPassword} className="login-sima-form">
            <div className="login-sima-field">
              <label className="login-sima-label" htmlFor="recovery-document">Documento</label>
              <div className="login-sima-input-wrap">
                <input
                  id="recovery-document"
                  type="text"
                  className="login-sima-input"
                  placeholder="Ingresa tu numero de documento"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="usuarios-modal-actions">
              <button type="button" className="usuarios-secondary-btn" onClick={onVolver}>
                Volver
              </button>
              <button type="submit" className="login-sima-btn">
                Solicitar restablecimiento
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
