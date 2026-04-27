import { useState, useEffect } from 'react'
import './App.css'
import { 
  getDnsRecords, 
  createDnsRecord, 
  updateDnsRecord, 
  deleteDnsRecord,
  getIpCountry,
  createIpCountry,
  updateIpCountry,
  deleteIpCountry
} from './api'


// ─────────────────────────────────────────────────────────────────────────────
// Modal de Dashboard 
// ─────────────────────────────────────────────────────────────────────────────
function DashboardView() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDnsRecords()
      .then(data => { setRecords(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Métricas calculadas de los registros
  const total     = records.length
  const healthy   = records.filter(r => r.healthy).length
  const unhealthy = records.filter(r => !r.healthy).length

  // Conteo por tipo
  const byType = ['single','multi','weight','round-trip','geo'].map(type => ({
    type,
    count: records.filter(r => r.type === type).length
  }))

  // Últimos 5 registros (los primeros del array ya vienen ordenados por id desc)
  const recent = records.slice(0, 5)

  // Estado general
  const allHealthy = unhealthy === 0 && total > 0

  return (
    <div>
      {/* ── Título ── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e2a38' }}>Dashboard</h2>
        <p style={{ fontSize: 13, color: '#8a94a6', marginTop: 4 }}>
          Resumen general del sistema DNS
        </p>
      </div>

      {/* ── Tarjetas de métricas ── */}
      <div className="dashboard-metrics">
        <div className="metric-card">
          <p className="metric-label">Total registros</p>
          <p className="metric-value">{loading ? '—' : total}</p>
        </div>
        <div className="metric-card metric-card--healthy">
          <p className="metric-label">Healthy</p>
          <p className="metric-value" style={{ color: '#27ae6e' }}>{loading ? '—' : healthy}</p>
        </div>
        <div className="metric-card metric-card--unhealthy">
          <p className="metric-label">Unhealthy</p>
          <p className="metric-value" style={{ color: '#e55353' }}>{loading ? '—' : unhealthy}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Estado general</p>
          <p className="metric-value" style={{
            fontSize: 14,
            marginTop: 8,
            color: loading || total === 0
              ? '#8a94a6'
              : unhealthy === 0
              ? '#27ae6e'
              : unhealthy === total
              ? '#e55353'
              : '#f0a500'
          }}>
            {loading
              ? '—'
              : total === 0
              ? 'Sin datos'
              : unhealthy === 0
              ? 'Todo OK'
              : unhealthy === total
              ? 'Sistema caido'
              : 'Revisar'}
          </p>
        </div>
      </div>

      {/* ── Fila inferior ── */}
      <div className="bottom-grid">

        {/* Distribución por tipo */}
        <div className="card">
          <h2 className="card__title" style={{ marginBottom: 16 }}>Distribución por tipo</h2>
          {loading ? (
            <div className="loading-center"><Spinner /></div>
          ) : (
            <div>
              {byType.map(({ type, count }) => (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#3d4a5c', textTransform: 'capitalize' }}>{type}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1e2a38' }}>{count}</span>
                  </div>
                  {/* Barra de progreso */}
                  <div style={{ height: 6, background: '#eef0f4', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: total > 0 ? `${(count / total) * 100}%` : '0%',
                      background: '#3b7de9',
                      borderRadius: 4,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos registros */}
        <div className="card">
          <h2 className="card__title" style={{ marginBottom: 16 }}>Últimos registros</h2>
          {loading ? (
            <div className="loading-center"><Spinner /></div>
          ) : recent.length === 0 ? (
            <p className="health__meta">No hay registros todavía.</p>
          ) : (
            <div>
              {recent.map(r => (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 0',
                  borderBottom: '0.5px solid #eef0f4'
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#3b7de9' }}>{r.domain}</p>
                    <p style={{ fontSize: 12, color: '#8a94a6', marginTop: 2 }}>{r.type}</p>
                  </div>
                  <StatusBadge healthy={r.healthy} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────────────────────────────────────────

function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'nav-item--active' : ''}`} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      {label}
    </div>
  )
}

function StatusBadge({ healthy }) {
  return (
    <span className={`badge ${healthy ? 'badge--healthy' : 'badge--unhealthy'}`}>
      {healthy ? 'Healthy' : 'Unhealthy'}
    </span>
  )
}

function Spinner() {
  return <div className="spinner" />
}

// ─────────────────────────────────────────────────────────────────────────────
// Formulario de IPs — cambia según el tipo de registro
// ─────────────────────────────────────────────────────────────────────────────

function IpFields({ type, ips, onChange }) {
  function addIp() {
    onChange([...ips, { ip: '', weight: 1, country: '' }])
  }
  function removeIp(idx) {
    onChange(ips.filter((_, i) => i !== idx))
  }
  function setField(idx, field, value) {
    onChange(ips.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  return (
    <div className="ip-fields">
      {ips.map((entry, idx) => (
        <div key={idx} className="ip-row">

          {/* IP — siempre visible */}
          <input
            className="form-input ip-input"
            type="text"
            placeholder="IP (ej: 192.168.1.10)"
            value={entry.ip}
            onChange={(e) => setField(idx, 'ip', e.target.value)}
          />

          {/* Peso — solo para "weight" */}
          {type === 'weight' && (
            <input
              className="form-input weight-input"
              type="number"
              min={1}
              placeholder="Peso"
              value={entry.weight ?? 1}
              onChange={(e) => setField(idx, 'weight', parseInt(e.target.value) || 1)}
            />
          )}

          {/* País — solo para "geo" */}
          {type === 'geo' && (
            <input
              className="form-input country-input"
              type="text"
              maxLength={2}
              placeholder="País (ej: CR)"
              value={entry.country ?? ''}
              onChange={(e) => setField(idx, 'country', e.target.value.toUpperCase())}
            />
          )}

          {/* Botón eliminar — solo si hay más de una IP */}
          {ips.length > 1 && (
            <button
              className="action-btn action-btn--delete ip-remove"
              onClick={() => removeIp(idx)}
              title="Eliminar esta IP"
            >🗑</button>
          )}
        </div>
      ))}

      {/* Botón agregar — no aparece en "single" */}
      {type !== 'single' && (
        <button className="btn-secondary btn-add-ip" onClick={addIp}>
          + Agregar IP
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de DNS Record — crear y editar
// ─────────────────────────────────────────────────────────────────────────────

function DnsModal({ initial, onSave, onClose, saving, saveError }) {
  const isEditing = Boolean(initial?.id)

  const [domain,     setDomain]     = useState(initial?.domain ?? '')
  const [type,       setType]       = useState(initial?.type   ?? 'single')
  const [ips,        setIps]        = useState(
    initial?.ips?.length > 0
      ? initial.ips
      : [{ ip: '', weight: 1, country: '' }]
  )
  const [checkType,  setCheckType]  = useState('tcp')
  const [timeout,    setTimeout_]   = useState('3')
  const [retries,    setRetries]    = useState('2')
  const [interval,   setInterval_]  = useState('10')
  const [path,       setPath]       = useState('/health')
  const [codes,      setCodes]      = useState('200')

  // Al cambiar el tipo reseteamos las IPs
  function changeType(newType) {
    setType(newType)
    setIps([{ ip: '', weight: 1, country: '' }])
  }

  function handleSubmit() {
    if (!domain.trim())               return alert('El dominio es requerido.')
    if (ips.some(e => !e.ip.trim())) return alert('Todas las IPs son requeridas.')
    onSave({
      record: { domain: domain.trim(), type, ips, healthy: true },
      hc: {
        check_type:     checkType,
        timeout:        parseInt(timeout),
        retries:        parseInt(retries),
        interval:       parseInt(interval),
        path:           checkType === 'http' ? path : '/',
        expected_codes: checkType === 'http'
          ? codes.split(',').map(c => parseInt(c.trim())).filter(Boolean)
          : [200],
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal__header">
          <h2>{isEditing ? 'Editar DNS Record' : 'Add DNS Record'}</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        {saveError && <p className="error-msg">⚠ {saveError}</p>}

        {/* ── Registro ── */}
        <label>Domain Name</label>
        <input className="form-input" type="text" placeholder="example.com"
          value={domain} onChange={e => setDomain(e.target.value)} />

        <label>Record Type</label>
        <select className="form-input" value={type} onChange={e => changeType(e.target.value)}>
          <option value="single">Single — una IP fija</option>
          <option value="multi">Multi — round-robin entre IPs</option>
          <option value="weight">Weight — IPs con peso</option>
          <option value="round-trip">Round-trip — IP con menor latencia</option>
          <option value="geo">Geo — IP por país</option>
        </select>

        {/* Etiqueta dinámica según tipo */}
        <label>
          {type === 'single'     && 'IP Address'}
          {type === 'multi'      && 'IPs (round-robin)'}
          {type === 'weight'     && 'IPs y pesos'}
          {type === 'round-trip' && 'IPs'}
          {type === 'geo'        && 'IPs por país'}
        </label>
        <IpFields type={type} ips={ips} onChange={setIps} />

        {/* ── Health Check ── */}
        <h3 className="hc-title">Health Check</h3>

        <label>Tipo de check</label>
        <select className="form-input" value={checkType} onChange={e => setCheckType(e.target.value)}>
          <option value="tcp">TCP</option>
          <option value="http">HTTP</option>
        </select>

        {/* Campos solo HTTP */}
        {checkType === 'http' && (
          <>
            <label>Path</label>
            <input className="form-input" type="text" placeholder="/health"
              value={path} onChange={e => setPath(e.target.value)} />
            <label>Códigos HTTP esperados (separados por coma)</label>
            <input className="form-input" type="text" placeholder="200, 201"
              value={codes} onChange={e => setCodes(e.target.value)} />
          </>
        )}

        <div className="hc-row">
          <div>
            <label>Timeout (s)</label>
            <input className="form-input" type="number" min={1}
              value={timeout} onChange={e => setTimeout_(e.target.value)} />
          </div>
          <div>
            <label>Retries</label>
            <input className="form-input" type="number" min={1}
              value={retries} onChange={e => setRetries(e.target.value)} />
          </div>
          <div>
            <label>Intervalo (s)</label>
            <input className="form-input" type="number" min={1}
              value={interval} onChange={e => setInterval_(e.target.value)} />
          </div>
        </div>

        <div className="modal__actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista: DNS Records
// ─────────────────────────────────────────────────────────────────────────────

function DnsRecordsView({ onNavigate }) {
  const [records,   setRecords]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  function load() {
    setLoading(true)
    getDnsRecords()
      .then(data => { setRecords(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setSaveError(null); setShowModal(true) }
  function openEdit(r)  { setEditing(r);    setSaveError(null); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null) }

  async function handleSave({ record }) {
    setSaving(true); setSaveError(null)
    try {
      editing ? await updateDnsRecord(editing.id, record) : await createDnsRecord(record)
      closeModal(); load()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(r) {
    if (!window.confirm(`¿Eliminar "${r.domain}"?`)) return
    try { await deleteDnsRecord(r.id); load() }
    catch (err) { alert('Error: ' + err.message) }
  }

  function ipSummary(r) {
    if (!Array.isArray(r.ips) || r.ips.length === 0) return '—'
    return r.ips.map(e => e.ip).join(', ')
  }

  return (
    <>
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">DNS Records</h2>
          <button className="btn-primary" onClick={openCreate}>+ Add DNS Record</button>
        </div>

        {error && <p className="error-msg">⚠ {error}</p>}

        {loading ? (
          <div className="loading-center"><Spinner /></div>
        ) : (
          <table className="dns-table">
            <thead>
              <tr>
                <th>Domain</th><th>Type</th><th>IPs</th>
                <th>Status</th><th>IP Count</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} className="empty-row">No hay registros. Crea uno arriba.</td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td className="dns-table__domain">{r.domain}</td>
                  <td>{r.type}</td>
                  <td className="dns-table__ips">{ipSummary(r)}</td>
                  <td><StatusBadge healthy={r.healthy} /></td>
                  <td>{Array.isArray(r.ips) ? r.ips.length : 0}</td>
                  <td>
                    <button className="action-btn" onClick={() => openEdit(r)}>✏ Edit</button>
                    <button className="action-btn action-btn--delete" onClick={() => handleDelete(r)}>🗑 Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && records.length > 0 && (
          <div className="pagination">
            <span className="pagination__info">1–{records.length} of {records.length}</span>
          </div>
        )}
      </div>

      {/* Panel inferior */}
      <div className="bottom-grid">
        <HealthChecksPanel records={records} />
        <IpCountryPanel onViewAll={() => onNavigate('IP to Country')} />
      </div>

      {showModal && (
        <DnsModal
          initial={editing}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          saveError={saveError}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: Health Checks (resumen en la pantalla principal)
// ─────────────────────────────────────────────────────────────────────────────

function HealthChecksPanel({ records }) {
  const [idx, setIdx] = useState(0)
  const current = records[idx]

  return (
    <div className="card">
      <h2 className="card__title">Health Checks</h2>
      {current ? (
        <>
          <div className="health__row">
            <strong className="health__domain">{current.domain}</strong>
            <StatusBadge healthy={current.healthy} />
          </div>
          {/* Datos fijos de ejemplo hasta que health_checks esté en el API */}
          <p className="health__meta">Check Type: TCP · Timeout: 3s · Retries: 2</p>
          <p className="health__meta">Interval: 10s</p>
        </>
      ) : (
        <p className="health__meta">No hay registros.</p>
      )}
      <div className="card__footer">
        <button className="btn-secondary"
          onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
          ‹ Prev
        </button>
        <span className="pagination__info">
          {records.length > 0 ? `${idx + 1} / ${records.length}` : '—'}
        </span>
        <button className="btn-secondary"
          onClick={() => setIdx(i => Math.min(records.length - 1, i + 1))}
          disabled={idx >= records.length - 1}>
          Next ›
        </button>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// Panel: IP to Country (resumen en la pantalla principal)
// ─────────────────────────────────────────────────────────────────────────────

function IpCountryPanel({ onViewAll }) {
  const [records, setRecords] = useState([])
  const [idx, setIdx]         = useState(0)

  useEffect(() => {
    getIpCountry().then(data => setRecords(data)).catch(() => {})
  }, [])

  const current = records[idx]

  return (
    <div className="card">
      <h2 className="card__title">IP to Country</h2>

      {current ? (
        <div className="ip-country__row">
          <div>
            <p className="ip-country__addr">{current.cidr}</p>
            <p className="ip-country__label">
              {current.country_code} — {current.country_name}
            </p>
          </div>
        </div>
      ) : (
        <p className="health__meta">No hay registros IP → País.</p>
      )}

      <div className="card__footer">
        <button className="btn-secondary"
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}>‹</button>
        <span className="pagination__info">
          {records.length > 0 ? `${idx + 1} / ${records.length}` : '—'}
        </span>
        <button className="btn-secondary"
          onClick={() => setIdx(i => Math.min(records.length - 1, i + 1))}
          disabled={idx >= records.length - 1}>›</button>
        <button className="btn-secondary" onClick={onViewAll}>
          ◎ View Full List
        </button>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// Vista completa: Health Checks
// ─────────────────────────────────────────────────────────────────────────────

function HealthChecksView() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDnsRecords()
      .then(data => { setRecords(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Health Checks</h2>
      </div>
      {loading ? <div className="loading-center"><Spinner /></div> : (
        <table className="dns-table">
          <thead>
            <tr>
              <th>Dominio</th><th>Tipo registro</th><th>IPs</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={4} className="empty-row">No hay registros con health checks.</td></tr>
            ) : records.map(r => (
              <tr key={r.id}>
                <td className="dns-table__domain">{r.domain}</td>
                <td>{r.type}</td>
                <td className="dns-table__ips">
                  {Array.isArray(r.ips) ? r.ips.map(e => e.ip).join(', ') : '—'}
                </td>
                <td><StatusBadge healthy={r.healthy} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista completa: IP to Country
// ─────────────────────────────────────────────────────────────────────────────

function IpCountryView() {
  const [records,   setRecords]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [cidr,      setCidr]      = useState('')
  const [code,      setCode]      = useState('')
  const [name,      setName]      = useState('')

  function load() {
    setLoading(true)
    getIpCountry()
      .then(data => { setRecords(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null); setCidr(''); setCode(''); setName('')
    setSaveError(null); setShowModal(true)
  }
  function openEdit(r) {
    setEditing(r); setCidr(r.cidr); setCode(r.country_code); setName(r.country_name)
    setSaveError(null); setShowModal(true)
  }
  function closeModal() { setShowModal(false); setEditing(null) }

  async function handleSave() {
    if (!cidr.trim() || !code.trim() || !name.trim()) {
      setSaveError('Todos los campos son requeridos.'); return
    }
    setSaving(true); setSaveError(null)
    try {
      const body = { cidr: cidr.trim(), country_code: code.trim().toUpperCase(), country_name: name.trim() }
      editing ? await updateIpCountry(editing.id, body) : await createIpCountry(body)
      closeModal(); load()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(r) {
    if (!window.confirm(`¿Eliminar ${r.cidr}?`)) return
    try { await deleteIpCountry(r.id); load() }
    catch (err) { alert('Error: ' + err.message) }
  }

  function flag(code) {
    if (!code || code.length !== 2) return '🌐'
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
  }

  return (
    <>
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">IP to Country</h2>
          <button className="btn-primary" onClick={openCreate}>+ Agregar registro</button>
        </div>

        {loading ? <div className="loading-center"><Spinner /></div> : (
          <table className="dns-table">
            <thead>
              <tr><th>CIDR</th><th>País</th><th>Nombre</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={4} className="empty-row">No hay registros IP → País.</td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td className="dns-table__domain">{r.cidr}</td>
                  <td>{flag(r.country_code)} {r.country_code}</td>
                  <td>{r.country_name}</td>
                  <td>
                    <button className="action-btn" onClick={() => openEdit(r)}>✏ Edit</button>
                    <button className="action-btn action-btn--delete" onClick={() => handleDelete(r)}>🗑 Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && records.length > 0 && (
          <div className="pagination">
            <span className="pagination__info">1–{records.length} of {records.length}</span>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editing ? 'Editar IP → País' : 'Agregar IP → País'}</h2>
              <button className="modal__close" onClick={closeModal}>×</button>
            </div>
            {saveError && <p className="error-msg">⚠ {saveError}</p>}

            <label>CIDR</label>
            <input className="form-input" placeholder="45.32.0.0/16"
              value={cidr} onChange={e => setCidr(e.target.value)} />

            <label>Código de país (2 letras)</label>
            <input className="form-input" placeholder="CR" maxLength={2}
              value={code} onChange={e => setCode(e.target.value.toUpperCase())} />

            <label>Nombre del país</label>
            <input className="form-input" placeholder="Costa Rica"
              value={name} onChange={e => setName(e.target.value)} />

            <div className="modal__actions">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App raíz
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState('DNS Records')

  function renderPage() {
    switch (activePage) {
      case 'Dashboard':     return <DashboardView />
      case 'DNS Records': return <DnsRecordsView onNavigate={setActivePage} />
      case 'Health Checks': return <HealthChecksView />
      case 'IP to Country': return <IpCountryView />
      default: return (
        <div className="card">
          <h2 className="card__title">{activePage}</h2>
          <p className="health__meta">Sección en construcción.</p>
        </div>
      )
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">DNS Management</span>
        <input className="topbar__search" type="text" placeholder="Search..." />
      </header>

      <div className="body">
        <nav className="sidebar">
          {[
            { icon: '≡', label: 'Dashboard' },
            { icon: '≡',  label: 'DNS Records' },
            { icon: '〜', label: 'Health Checks' },
            { icon: '◎',  label: 'IP to Country' },
            { icon: '≣',  label: 'Logs' },
          ].map(({ icon, label }) => (
            <NavItem key={label} icon={icon} label={label}
              active={activePage === label}
              onClick={() => setActivePage(label)} />
          ))}
          <div className="sidebar__spacer" />
          <NavItem icon="⚙" label="Settings"
            active={activePage === 'Settings'}
            onClick={() => setActivePage('Settings')} />
        </nav>

        <main className="main">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}