import { useState, useEffect, useMemo, useRef } from 'react';
import { Info, Search, Loader2, X, AlertTriangle } from 'lucide-react';
import {
  crearAlertaDesdeObservaciones,
  obtenerAprendicesPorGrupo,
  obtenerGrupos,
  obtenerObservacionesAbiertasPorAprendiz
} from '../../services/alertasService';
import Toast from '../common/Toast';
import './modal.css';

const FORM_INICIAL = {
  aprendizId: '',
  aprendizNombre: '',
  grupoId: '',
  tipoAlerta: '',
  severidad: '',
  descripcion: '',
  observationIds: [],
  notificarCoordinador: true,
  notificarInstructorLider: true
};

const MAX_DESC = 500;

export default function ModalCrearAlerta({ isOpen, onClose, onAlertaCreada }) {
  const [form, setForm] = useState({ ...FORM_INICIAL });
  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);
  const [duplicado, setDuplicado] = useState(false);
  const [toast, setToast] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [aprendices, setAprendices] = useState([]);
  const [loadingAprendices, setLoadingAprendices] = useState(false);
  const [errorAprendices, setErrorAprendices] = useState('');
  const [observaciones, setObservaciones] = useState([]);
  const [loadingObservaciones, setLoadingObservaciones] = useState(false);
  const [errorObservaciones, setErrorObservaciones] = useState('');
  const dropRef = useRef(null);

  const grupoActual = useMemo(
    () => grupos.find(g => String(g.id) === String(form.grupoId)),
    [grupos, form.grupoId]
  );

  const resultados = useMemo(() => {
    if (!form.grupoId || busqueda.length < 2) return [];
    const texto = busqueda.trim().toLowerCase();
    return aprendices.filter(ap =>
      ap.nombre.toLowerCase().includes(texto) ||
      String(ap.documento).includes(texto)
    );
  }, [aprendices, busqueda, form.grupoId]);

  useEffect(() => {
    async function cargar() {
      const { data } = await obtenerGrupos();
      if (data) {
        const mapeados = data.map(g => ({
          id: g.id_grupo || g.id,
          codigo: `${g.numero_ficha} (${g.programa_formacion?.nombre_programa || 'Sin programa'})`
        }));
        setGrupos(mapeados);
      }
    }

    if (isOpen) cargar();
  }, [isOpen]);

  useEffect(() => {
    async function cargarAprendices() {
      if (!form.grupoId) {
        setAprendices([]);
        return;
      }

      setLoadingAprendices(true);
      setErrorAprendices('');
      const { data, error } = await obtenerAprendicesPorGrupo(form.grupoId);
      setAprendices(data || []);
      if (error) setErrorAprendices(error);
      setLoadingAprendices(false);
    }

    if (isOpen) cargarAprendices();
  }, [form.grupoId, isOpen]);

  useEffect(() => {
    async function cargarObservaciones() {
      if (!form.grupoId || !form.aprendizId) {
        setObservaciones([]);
        return;
      }

      setLoadingObservaciones(true);
      setErrorObservaciones('');
      const { data, error } = await obtenerObservacionesAbiertasPorAprendiz(form.grupoId, form.aprendizId);
      setObservaciones(data || []);
      if (error) setErrorObservaciones(error);
      setLoadingObservaciones(false);
    }

    if (isOpen) cargarObservaciones();
  }, [form.grupoId, form.aprendizId, isOpen]);

  useEffect(() => {
    const fn = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  function resetear() {
    setForm({ ...FORM_INICIAL });
    setErrores({});
    setBusqueda('');
    setDropOpen(false);
    setAprendices([]);
    setObservaciones([]);
    setErrorAprendices('');
    setErrorObservaciones('');
    setDuplicado(false);
    setLoading(false);
  }

  function handleClose() {
    resetear();
    onClose();
  }

  function seleccionarGrupo(grupoId) {
    setForm(prev => ({
      ...prev,
      grupoId,
      aprendizId: '',
      aprendizNombre: '',
      observationIds: []
    }));
    setBusqueda('');
    setObservaciones([]);
    setDropOpen(false);
    setErrores(prev => ({ ...prev, grupoId: '', aprendizId: '', observationIds: '' }));
  }

  function seleccionarAprendiz(ap) {
    setBusqueda(ap.nombre);
    setForm(prev => ({
      ...prev,
      aprendizId: ap.id,
      aprendizNombre: ap.nombre,
      observationIds: []
    }));
    setDropOpen(false);
    if (errores.aprendizId) setErrores(prev => ({ ...prev, aprendizId: '' }));
  }

  function alternarObservacion(id) {
    setForm(prev => {
      const existe = prev.observationIds.includes(id);
      return {
        ...prev,
        observationIds: existe
          ? prev.observationIds.filter(item => item !== id)
          : [...prev.observationIds, id]
      };
    });
    if (errores.observationIds) setErrores(prev => ({ ...prev, observationIds: '' }));
  }

  function validar() {
    const e = {};
    if (!form.grupoId) e.grupoId = 'Selecciona un grupo';
    if (!form.aprendizId) e.aprendizId = 'Selecciona un aprendiz';
    if (!form.tipoAlerta) e.tipoAlerta = 'Selecciona el tipo';
    if (!form.severidad) e.severidad = 'Selecciona la severidad';
    if (!form.observationIds.length) e.observationIds = 'Selecciona al menos una observacion abierta';
    if (!form.descripcion.trim()) e.descripcion = 'La descripcion es obligatoria';
    else if (form.descripcion.trim().length < 20) e.descripcion = 'Minimo 20 caracteres';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function enviar(forzar = false) {
    if (!forzar && !validar()) return;
    setLoading(true);
    setDuplicado(false);

    const aprendizSeleccionado = aprendices.find(a => String(a.id) === String(form.aprendizId));
    const { error } = await crearAlertaDesdeObservaciones({
      ...form,
      aprendizDocumento: aprendizSeleccionado?.documento || '',
      grupoCodigo: grupoActual?.codigo || '',
      descripcion: form.descripcion.trim()
    });

    if (error) {
      if (String(error).includes('409') || String(error).toLowerCase().includes('duplicada')) setDuplicado(true);
      else setErrores(prev => ({ ...prev, _global: error }));
      setLoading(false);
      return;
    }

    setToast({ message: 'Alerta registrada correctamente', type: 'success' });

    setTimeout(() => {
      onAlertaCreada?.();
      handleClose();
    }, 1500);
  }

  if (!isOpen) return null;

  const descLen = form.descripcion.length;

  return (
    <>
      <div className="mcal-overlay" onClick={handleClose} />
      <div className="mcal-modal">
        <div className="mcal-header">
          <h2 className="mcal-titulo">Crear alerta manual</h2>
          <button type="button" className="mcal-btn-close" onClick={handleClose}><X size={20} /></button>
        </div>

        <div className="mcal-banner info">
          <Info size={18} className="mcal-banner-icon" />
          <p>Las alertas manuales se crean desde observaciones abiertas del aprendiz y quedan asociadas como evidencia.</p>
        </div>

        {duplicado && (
          <div className="mcal-duplicado">
            <AlertTriangle size={15} />
            <div>
              <strong>No se pudo asociar la evidencia.</strong> Revisa que las observaciones sigan abiertas y no hayan sido usadas en otra alerta.
            </div>
            <div className="mcal-duplicado-btns">
              <button type="button" className="mcal-btn-cancelar" onClick={() => setDuplicado(false)}>Entendido</button>
            </div>
          </div>
        )}

        {errores._global && (
          <div className="mcal-duplicado">
            <AlertTriangle size={15} />
            <div>{errores._global}</div>
          </div>
        )}

        <form className="mcal-form" onSubmit={e => { e.preventDefault(); enviar(); }}>
          <div className="mcal-field">
            <label className="mcal-label">Grupo <span className="mcal-req">*</span></label>
            <select
              className={`mcal-select ${errores.grupoId ? 'error' : ''}`}
              value={form.grupoId}
              onChange={e => seleccionarGrupo(e.target.value)}
            >
              <option value="">Seleccione un grupo</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.codigo}</option>)}
            </select>
            {errores.grupoId && <span className="mcal-error-msg">{errores.grupoId}</span>}
          </div>

          <div className="mcal-field" ref={dropRef}>
            <label className="mcal-label">Aprendiz <span className="mcal-req">*</span></label>
            <div className={`mcal-search-wrap ${errores.aprendizId ? 'error' : ''}`}>
              <input
                type="text"
                className="mcal-input"
                placeholder="Buscar aprendiz por nombre o documento..."
                value={busqueda}
                onChange={e => {
                  setBusqueda(e.target.value);
                  setDropOpen(e.target.value.length >= 2);
                }}
                onFocus={() => setDropOpen(busqueda.length >= 2)}
                disabled={!form.grupoId || loadingAprendices}
              />
              <Search size={18} className="mcal-search-icon" />
              {loadingAprendices && <Loader2 size={16} className="mcal-search-spin" />}
            </div>
            {dropOpen && resultados.length > 0 && (
              <ul className="mcal-dropdown">
                {resultados.map(ap => (
                  <li key={ap.id} className="mcal-dropdown-item" onClick={() => seleccionarAprendiz(ap)}>
                    <span className="mcal-drop-nombre">{ap.nombre}</span>
                    <span className="mcal-drop-doc">{ap.documento}</span>
                  </li>
                ))}
              </ul>
            )}
            {!form.grupoId && <span className="mcal-help-msg">Selecciona primero un grupo.</span>}
            {form.grupoId && !loadingAprendices && busqueda.length >= 2 && dropOpen && resultados.length === 0 && (
              <span className="mcal-help-msg">No hay aprendices que coincidan en este grupo.</span>
            )}
            {errorAprendices && <span className="mcal-error-msg">{errorAprendices}</span>}
            {errores.aprendizId && <span className="mcal-error-msg">{errores.aprendizId}</span>}
          </div>

          <div className="mcal-field">
            <label className="mcal-label">Observaciones abiertas <span className="mcal-req">*</span></label>
            <div className={`mcal-observaciones-box ${errores.observationIds ? 'error' : ''}`}>
              {loadingObservaciones ? (
                <div className="mcal-observaciones-state">
                  <Loader2 size={16} className="mcal-inline-spin" />
                  Cargando observaciones abiertas...
                </div>
              ) : errorObservaciones ? (
                <div className="mcal-observaciones-state error">{errorObservaciones}</div>
              ) : !form.aprendizId ? (
                <div className="mcal-observaciones-state">Selecciona un aprendiz para consultar sus observaciones abiertas.</div>
              ) : observaciones.length === 0 ? (
                <div className="mcal-observaciones-state">No hay observaciones abiertas para este aprendiz en {grupoActual?.codigo || 'el grupo seleccionado'}.</div>
              ) : (
                observaciones.map(obs => (
                  <label key={obs.id} className="mcal-observacion-item">
                    <input
                      type="checkbox"
                      checked={form.observationIds.includes(obs.id)}
                      onChange={() => alternarObservacion(obs.id)}
                    />
                    <span className="mcal-observacion-check" />
                    <span className="mcal-observacion-content">
                      <span className="mcal-observacion-head">
                        <strong>{obs.tipo || 'OBSERVACION'}</strong>
                        <em>{obs.severidad}</em>
                      </span>
                      <span className="mcal-observacion-desc">{obs.descripcion}</span>
                      <span className="mcal-observacion-meta">{obs.autor}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
            {errores.observationIds && <span className="mcal-error-msg">{errores.observationIds}</span>}
          </div>

          <div className="mcal-row">
            <div className="mcal-field">
              <label className="mcal-label">Tipo de alerta <span className="mcal-req">*</span></label>
              <select
                className={`mcal-select ${errores.tipoAlerta ? 'error' : ''}`}
                value={form.tipoAlerta}
                onChange={e => setForm({ ...form, tipoAlerta: e.target.value })}
              >
                <option value="">Seleccione el tipo de alerta</option>
                <option value="ASISTENCIAL">Asistencial</option>
                <option value="OBSERVACIONES_RECURRENTES">Observaciones recurrentes</option>
                <option value="CONVIVENCIAL">Convivencial</option>
              </select>
              {errores.tipoAlerta && <span className="mcal-error-msg">{errores.tipoAlerta}</span>}
            </div>
            <div className="mcal-field">
              <label className="mcal-label">Severidad <span className="mcal-req">*</span></label>
              <select
                className={`mcal-select ${errores.severidad ? 'error' : ''}`}
                value={form.severidad}
                onChange={e => setForm({ ...form, severidad: e.target.value })}
              >
                <option value="">Seleccione la severidad</option>
                <option value="LEVE">Leve</option>
                <option value="MODERADA">Moderada</option>
                <option value="GRAVE">Grave</option>
                <option value="CRITICA">Crítica</option>
              </select>
              <div className="mcal-sev-leyenda">
                <span><i className="mcal-dot leve" /> LEVE</span>
                <span><i className="mcal-dot moderada" /> MODERADA</span>
                <span><i className="mcal-dot grave" /> GRAVE</span>
                <span><i className="mcal-dot critica" /> CRITICA</span>
              </div>
              {errores.severidad && <span className="mcal-error-msg">{errores.severidad}</span>}
            </div>
          </div>

          <div className="mcal-notif-group">
            <div className="mcal-notif-check">
              <label className="mcal-checkbox-container">
                <input
                  type="checkbox"
                  checked={form.notificarCoordinador}
                  onChange={e => setForm({ ...form, notificarCoordinador: e.target.checked })}
                />
                <span className="mcal-checkmark"></span>
                <div className="mcal-check-text">
                  <strong>Notificar al Coordinador</strong>
                  <span>Genera una notificacion interna para coordinacion.</span>
                </div>
              </label>
            </div>

            <div className="mcal-notif-check">
              <label className="mcal-checkbox-container">
                <input
                  type="checkbox"
                  checked={form.notificarInstructorLider}
                  onChange={e => setForm({ ...form, notificarInstructorLider: e.target.checked })}
                />
                <span className="mcal-checkmark"></span>
                <div className="mcal-check-text">
                  <strong>Notificar al Instructor Lider</strong>
                  <span>El backend informa al responsable del grupo si aplica.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="mcal-field">
            <label className="mcal-label">Descripcion <span className="mcal-req">*</span></label>
            <textarea
              className={`mcal-textarea ${errores.descripcion ? 'error' : ''}`}
              placeholder="Describa detalladamente la situacion que requiere seguimiento..."
              maxLength={MAX_DESC}
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
            />
            <div className="mcal-desc-footer">
              {errores.descripcion && <span className="mcal-error-msg">{errores.descripcion}</span>}
              <span className="mcal-contador">{descLen} / {MAX_DESC} caracteres</span>
            </div>
          </div>

          <div className="mcal-footer">
            <button type="button" className="mcal-btn-cancelar" onClick={handleClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="mcal-btn-enviar" disabled={loading || loadingObservaciones}>
              {loading ? 'Guardando...' : 'Guardar alerta'}
            </button>
          </div>
        </form>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
