'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { UserButton, useUser } from '@clerk/nextjs'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Emitter {
  business: string
  tagline: string
  legalName: string
  dni: string
  email: string
  phone: string
}

interface Client {
  company: string
  name: string
  email: string
}

interface DocData {
  docNumber: string
  issueDate: string
  validityDays: number
  discount: number
  taxEnabled: boolean
  taxRate: number
  emitter: Emitter
  client: Client
  conditions: string
}

interface Service {
  id: string
  name: string
  note: string
  qty: number
  price: number
}

interface Totals {
  subtotal: number
  discount: number
  taxed: number
  taxAmount: number
  grand: number
}

interface Tweaks {
  preset: 'minimal' | 'editorial' | 'mono' | 'brutal'
  theme: 'light' | 'dark'
  accent: string
  density: 'comodo' | 'compact'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEED_DATA: DocData = {
  docNumber: 'PRE-2026-014',
  issueDate: new Date().toISOString().slice(0, 10),
  validityDays: 7,
  discount: 0,
  taxEnabled: true,
  taxRate: 21,
  emitter: {
    business: 'FyF Construcciones',
    tagline: 'Construcción · Reformas · Presupuestos',
    legalName: 'Fueyo, Cristian David',
    dni: '25.215.040',
    email: 'cdfueyo@live.com.ar',
    phone: '+54 291 405 1282',
  },
  client: { company: '', name: '', email: '' },
  conditions:
    'Este presupuesto tiene validez de 7 días desde la fecha de emisión. Los precios no incluyen IVA salvo indicación. El inicio de los trabajos queda sujeto a la conformidad del cliente por escrito.',
}

const SEED_SERVICES: Service[] = []

const TWEAK_DEFAULTS: Tweaks = {
  preset: 'minimal',
  theme: 'light',
  accent: '#d97757',
  density: 'comodo',
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function formatARS(n: number): string {
  if (isNaN(n)) n = 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  const paths: Record<string, React.ReactNode> = {
    edit: (
      <>
        <path d="M4 20h4l10-10-4-4L4 16v4z" />
        <path d="M13 7l4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
    sliders: (
      <>
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </>
    ),
  }
  return <svg {...props}>{paths[name] ?? null}</svg>
}

// ─── Tweaks Panel ─────────────────────────────────────────────────────────────

const TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:60px;z-index:2000;width:280px;
    max-height:calc(100vh - 80px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.92);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none;border-bottom:.5px solid rgba(0,0,0,.08)}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:8px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:8px 0 0}
  .twk-sect-sub{font-size:10px;color:rgba(41,38,27,.45);margin-top:2px;font-weight:400;text-transform:none;letter-spacing:0}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72);font-weight:500}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:pointer;padding:4px 6px;line-height:1.2}
  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:40px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:pointer;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s,box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 2px rgba(0,0,0,.85),0 2px 6px rgba(0,0,0,.15)}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
  @media(max-width:768px){.twk-panel{bottom:calc(72px + env(safe-area-inset-bottom,0px))}}
`

function TweakSection({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <>
      <div>
        <div className="twk-sect">{title}</div>
        {subtitle && <div className="twk-sect-sub">{subtitle}</div>}
      </div>
      {children}
    </>
  )
}

function TweakRadio({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const n = options.length
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="twk-seg" role="radiogroup">
      <div
        className="twk-seg-thumb"
        style={{
          left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
          width: `calc((100% - 4px) / ${n})`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TweakColor({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="twk-chips" role="radiogroup">
      {options.map((color, i) => {
        const on = color.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={i}
            type="button"
            className="twk-chip"
            role="radio"
            aria-checked={on}
            data-on={on ? '1' : '0'}
            style={{ background: color }}
            onClick={() => onChange(color)}
          >
            {on && (
              <svg viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M3 7.2 5.8 10 11 4.2"
                  fill="none"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke="rgba(255,255,255,0.9)"
                />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}

function TweaksPanel({
  open,
  onClose,
  tweaks,
  setTweak,
}: {
  open: boolean
  onClose: () => void
  tweaks: Tweaks
  setTweak: (key: keyof Tweaks, value: string) => void
}) {
  const dragRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef({ x: 16, y: 60 })

  const clamp = useCallback(() => {
    const panel = dragRef.current
    if (!panel) return
    const w = panel.offsetWidth, h = panel.offsetHeight
    const maxX = Math.max(16, window.innerWidth - w - 16)
    const maxY = Math.max(16, window.innerHeight - h - 16)
    offsetRef.current = {
      x: Math.min(maxX, Math.max(16, offsetRef.current.x)),
      y: Math.min(maxY, Math.max(16, offsetRef.current.y)),
    }
    panel.style.right = offsetRef.current.x + 'px'
    panel.style.bottom = offsetRef.current.y + 'px'
  }, [])

  useEffect(() => {
    if (open) clamp()
  }, [open, clamp])

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current
    if (!panel) return
    const r = panel.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY
    const startRight = window.innerWidth - r.right
    const startBottom = window.innerHeight - r.bottom
    const move = (ev: MouseEvent) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      }
      clamp()
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  if (!open) return null

  const presetOptions = [
    { value: 'minimal', label: 'Minimal' },
    { value: 'editorial', label: 'Editorial' },
    { value: 'mono', label: 'Mono' },
    { value: 'brutal', label: 'Brutal' },
  ]

  return (
    <>
      <style>{TWEAKS_STYLE}</style>
      <div
        ref={dragRef}
        className="twk-panel"
        style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
      >
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>Apariencia</b>
          <button className="twk-x" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="twk-body">
          <TweakSection title="Estética" subtitle="Tipografía, bordes y peso visual">
            <TweakRadio
              value={tweaks.preset}
              onChange={(v) => setTweak('preset', v)}
              options={presetOptions}
            />
          </TweakSection>
          <TweakSection title="Tema">
            <TweakRadio
              value={tweaks.theme}
              onChange={(v) => setTweak('theme', v)}
              options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]}
            />
          </TweakSection>
          <TweakSection title="Acento">
            <TweakColor
              value={tweaks.accent}
              onChange={(v) => setTweak('accent', v)}
              options={['#d97757', '#1f6b4a', '#2747d9', '#b53a4a', '#1a1a1a']}
            />
          </TweakSection>
          <TweakSection title="Densidad">
            <TweakRadio
              value={tweaks.density}
              onChange={(v) => setTweak('density', v)}
              options={[{ value: 'comodo', label: 'Cómodo' }, { value: 'compact', label: 'Compacto' }]}
            />
          </TweakSection>
        </div>
      </div>
    </>
  )
}

// ─── Date Input ──────────────────────────────────────────────────────────────

function DateInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const isoToDisplay = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const [display, setDisplay] = useState(() => isoToDisplay(value))

  useEffect(() => {
    setDisplay(isoToDisplay(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
    else if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2)
    setDisplay(formatted)

    if (digits.length === 8) {
      const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8)
      const date = new Date(`${y}-${m}-${d}`)
      if (!isNaN(date.getTime())) onChange(`${y}-${m}-${d}`)
    }
  }

  const handleBlur = () => {
    if (display.replace(/\D/g, '').length !== 8) setDisplay(isoToDisplay(value))
  }

  return (
    <input
      className="field-input mono"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="DD/MM/AAAA"
      maxLength={10}
    />
  )
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

function PdfDocument({ data, services, totals }: { data: DocData; services: Service[]; totals: Totals }) {
  const e = data.emitter
  return (
    <div className="doc-frame">
      {/* Header */}
      <div className="fyf-head">
        <div className="fyf-brand">
          <div className="fyf-mark">FyF</div>
          <div>
            <div className="fyf-biz">{e.business}</div>
            <div className="fyf-tagline">{e.tagline}</div>
          </div>
        </div>
        <div className="fyf-meta">
          <div className="fyf-kind">Presupuesto</div>
          <div className="fyf-num">Nº {data.docNumber}</div>
        </div>
      </div>

      {/* Contact line */}
      <div className="fyf-contact-line">
        {[e.business, e.email, e.phone].filter(Boolean).join(' · ')}
      </div>

      {/* Parties */}
      <div className="fyf-parties">
        <div>
          <div className="fyf-section-label">De</div>
          <div className="fyf-party-name">{e.legalName || e.business}</div>
          {e.dni && <div className="fyf-party-lines">DNI {e.dni}</div>}
          <div className="fyf-party-lines">{[e.email, e.phone].filter(Boolean).join('\n')}</div>
        </div>
        <div>
          <div className="fyf-section-label">Para</div>
          <div className="fyf-party-name">
            {data.client.company || data.client.name || (
              <span className="fyf-placeholder">_________________________________</span>
            )}
          </div>
          <div className="fyf-party-lines">
            {data.client.company && data.client.name
              ? `Att. ${data.client.name}\n`
              : !data.client.company && !data.client.name
              ? 'Att. _____________________________\n'
              : ''}
            {data.client.email || '_________________________________'}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="fyf-dates">
        <div>
          <div className="fyf-section-label">Emisión</div>
          <div className="fyf-date-v">{formatDate(data.issueDate)}</div>
        </div>
        <div>
          <div className="fyf-section-label">Validez</div>
          <div className="fyf-date-v">{data.validityDays} días</div>
        </div>
        <div>
          <div className="fyf-section-label">Moneda</div>
          <div className="fyf-date-v">ARS</div>
        </div>
      </div>

      {/* Table */}
      <table className="fyf-table">
        <thead>
          <tr>
            <th className="fyf-c-idx">#</th>
            <th>Concepto</th>
            <th className="r fyf-c-qty">Cant.</th>
            <th className="r fyf-c-price">Precio unit.</th>
            <th className="r fyf-c-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {services.length === 0
            ? [1, 2, 3, 4, 5].map((n) => (
                <tr key={n} className="fyf-empty-row">
                  <td className="fyf-c-idx">{String(n).padStart(2, '0')}</td>
                  <td><span className="fyf-placeholder">____________________________________________</span></td>
                  <td className="r">1</td>
                  <td className="r"><span className="fyf-placeholder">$ ___________,00</span></td>
                  <td className="r"><span className="fyf-placeholder">$ ___________,00</span></td>
                </tr>
              ))
            : services.map((s, i) => (
                <tr key={s.id}>
                  <td className="fyf-c-idx">{String(i + 1).padStart(2, '0')}</td>
                  <td>
                    <div className="fyf-svc-name">
                      {s.name || <span className="fyf-placeholder">____________________________________________</span>}
                    </div>
                    {s.note && <div className="fyf-svc-note">{s.note}</div>}
                  </td>
                  <td className="r">{s.qty}</td>
                  <td className="r">{formatARS(s.price)}</td>
                  <td className="r"><strong>{formatARS(s.qty * s.price)}</strong></td>
                </tr>
              ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="fyf-totals">
        <div className="fyf-totals-stack">
          <div className="fyf-tot-row">
            <span>Subtotal</span>
            <span>{formatARS(totals.subtotal)}</span>
          </div>
          {data.taxEnabled && (
            <div className="fyf-tot-row">
              <span>IVA ({data.taxRate}%)</span>
              <span>{formatARS(totals.taxAmount)}</span>
            </div>
          )}
          <div className="fyf-tot-row fyf-tot-grand">
            <span>Total</span>
            <span>{formatARS(totals.grand)}</span>
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="fyf-conditions">
        <div className="fyf-section-label">Condiciones</div>
        <p className="fyf-cond-text">{data.conditions}</p>
      </div>

      {/* Watermark */}
      <div className="doc-watermark" aria-hidden="true">FyF</div>
    </div>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function Editor({
  data,
  setData,
  services,
  setServices,
}: {
  data: DocData
  setData: React.Dispatch<React.SetStateAction<DocData>>
  services: Service[]
  setServices: React.Dispatch<React.SetStateAction<Service[]>>
}) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const updateClient = (k: keyof Client, v: string) =>
    setData((d) => ({ ...d, client: { ...d.client, [k]: v } }))

  const updateService = (id: string, patch: Partial<Service>) =>
    setServices((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const addService = () =>
    setServices((arr) => [
      ...arr,
      { id: 'svc-' + Date.now(), name: '', note: '', qty: 1, price: 0 },
    ])

  const removeService = (id: string) =>
    setServices((arr) => arr.filter((s) => s.id !== id))

  const totals = useMemo((): Totals => {
    const subtotal = services.reduce((acc, s) => acc + (Number(s.qty) || 0) * (Number(s.price) || 0), 0)
    const discount = (subtotal * (Number(data.discount) || 0)) / 100
    const taxed = subtotal - discount
    const taxAmount = data.taxEnabled ? (taxed * (Number(data.taxRate) || 0)) / 100 : 0
    const grand = taxed + taxAmount
    return { subtotal, discount, taxed, taxAmount, grand }
  }, [services, data.discount, data.taxRate, data.taxEnabled])

  const handleDownload = () => window.print()

  return (
    <>
      <div className="topbar">
        <div className="crumbs">
          <span className="scope">Editor</span>
          <span className="sep">/</span>
          <span className="doc">{data.docNumber}</span>
        </div>
        <span className="status-pill">
          <span className="dot" />
          Borrador
        </span>
        <div className="spacer" />
        <button
          className="btn btn-sm mobile-peek"
          onClick={() => setPreviewOpen((v) => !v)}
        >
          {previewOpen ? 'Ocultar PDF' : 'Ver PDF'}
        </button>
        <button className="btn btn-sm mob-hide" onClick={() => {
          const next = { ...data, docNumber: `PRE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100)).padStart(3, '0')}` }
          setData(next)
        }}>
          <Icon name="copy" /> Duplicar
        </button>
        <button className="btn btn-sm btn-primary mob-icon-only" onClick={handleDownload}>
          <Icon name="download" /> <span>Descargar PDF</span>
        </button>
      </div>

      <div className="split">
        {/* ── Editor pane ── */}
        <div className="pane-editor">

          {/* 01 — Cliente */}
          <section className="section">
            <header className="section-head">
              <span className="section-num">01</span>
              <h2 className="section-title">Para quién</h2>
              <span className="section-sub">El cliente que recibe el presupuesto</span>
            </header>
            <div className="field-grid">
              <div className="field">
                <label className="field-label">Empresa</label>
                <input
                  className="field-input"
                  value={data.client.company}
                  onChange={(e) => updateClient('company', e.target.value)}
                  placeholder="Cooperativa La Buena Tierra"
                />
              </div>
              <div className="field">
                <label className="field-label">Persona de contacto</label>
                <input
                  className="field-input"
                  value={data.client.name}
                  onChange={(e) => updateClient('name', e.target.value)}
                  placeholder="Lucía Méndez"
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  value={data.client.email}
                  onChange={(e) => updateClient('email', e.target.value)}
                  placeholder="lucia@labuena.coop"
                  type="email"
                />
              </div>
            </div>
          </section>

          {/* 02 — Servicios */}
          <section className="section">
            <header className="section-head">
              <span className="section-num">02</span>
              <h2 className="section-title">Servicios</h2>
              <span className="section-sub">
                {services.length} ítem{services.length === 1 ? '' : 's'}
              </span>
            </header>
            <div className="services">
              <div className="svc-head">
                <div />
                <div>Concepto</div>
                <div className="r">Cant.</div>
                <div className="r">Precio (ARS)</div>
                <div className="r">Total</div>
                <div />
              </div>
              {services.map((s, i) => (
                <div className="svc-row" key={s.id}>
                  <div className="idx">{String(i + 1).padStart(2, '0')}</div>
                  <div className="svc-name">
                    <input
                      value={s.name}
                      placeholder="Ej: Revoque exterior"
                      onChange={(e) => updateService(s.id, { name: e.target.value })}
                    />
                    <input
                      value={s.note}
                      placeholder="Nota o detalle (opcional)"
                      style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}
                      onChange={(e) => updateService(s.id, { note: e.target.value })}
                    />
                  </div>
                  <div className="num qty" data-label="Cant.">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={s.qty}
                      onChange={(e) => updateService(s.id, { qty: Number(e.target.value) })}
                    />
                  </div>
                  <div className="num price" data-label="Precio (ARS)">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={s.price}
                      onChange={(e) => updateService(s.id, { price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="total">{formatARS((s.qty || 0) * (s.price || 0))}</div>
                  <div className="del">
                    <button className="svc-del-btn" onClick={() => removeService(s.id)} title="Eliminar">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button className="svc-add" onClick={addService}>
                <Icon name="plus" size={14} /> Agregar servicio
              </button>
            </div>

            {/* Totals */}
            <div className="totals">
              <div className="total-row">
                <span className="l">Subtotal</span>
                <span className="v">{formatARS(totals.subtotal)}</span>
              </div>
              <div className="total-row">
                <span className="l">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={data.taxEnabled}
                      onChange={(e) => setData((d) => ({ ...d, taxEnabled: e.target.checked }))}
                    />
                    IVA ({data.taxRate}%)
                  </label>
                </span>
                <span className="v">{formatARS(totals.taxAmount)}</span>
              </div>
              <div className="total-row grand">
                <span className="l">Total a cobrar</span>
                <span className="v">{formatARS(totals.grand)}</span>
              </div>
            </div>
          </section>

          {/* 03 — Fecha */}
          <section className="section">
            <header className="section-head">
              <span className="section-num">03</span>
              <h2 className="section-title">Fecha de emisión</h2>
              <span className="section-sub">Número y validez se asignan automáticamente</span>
            </header>
            <div className="field-grid">
              <div className="field">
                <label className="field-label">Fecha</label>
                <DateInput
                  value={data.issueDate}
                  onChange={(iso) => setData((d) => ({ ...d, issueDate: iso }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Número (auto)</label>
                <input
                  className="field-input mono"
                  value={data.docNumber}
                  disabled
                />
              </div>
            </div>
          </section>
        </div>

        {/* ── Preview pane ── */}
        <div className={'pane-preview' + (previewOpen ? ' is-open' : '')}>
          <div className="preview-toolbar">
            <span className="label">Vista previa</span>
            <span className="zoom-pill">A4</span>
            <div style={{ flex: 1 }} />
            <span className="live-dot mob-hide">
              <span className="dot" />
              En vivo
            </span>
            <button
              className="btn btn-sm btn-primary preview-download"
              onClick={handleDownload}
              aria-label="Descargar PDF"
            >
              <Icon name="download" size={14} /> <span>PDF</span>
            </button>
            <button
              className="btn btn-sm btn-ghost preview-close"
              onClick={() => setPreviewOpen(false)}
              aria-label="Cerrar vista previa"
            >
              ✕
            </button>
          </div>
          <div className="doc-scroll">
            <PdfDocument data={data} services={services} totals={totals} />
          </div>
        </div>
      </div>
    </>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const { user } = useUser()
  const [tweaks, setTweaksState] = useState<Tweaks>(TWEAK_DEFAULTS)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [data, setData] = useState<DocData>(SEED_DATA)
  const [services, setServices] = useState<Service[]>(SEED_SERVICES)

  const setTweak = useCallback((key: keyof Tweaks, value: string) => {
    setTweaksState((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Apply tweaks to <html>
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', tweaks.theme)
    root.setAttribute('data-preset', tweaks.preset)
    root.setAttribute('data-density', tweaks.density)
    root.style.setProperty('--accent', tweaks.accent)
  }, [tweaks])

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div className="brand-name">FyF Construcciones</div>
        </div>

        <div className="nav-section-label">Trabajar</div>
        <button className="nav-item is-active">
          <Icon name="edit" />
          Editor
          <span className="count">{services.length}</span>
        </button>

        <div className="nav-section-label">Apariencia</div>
        <button
          className="nav-item"
          onClick={() => setTweak('theme', tweaks.theme === 'light' ? 'dark' : 'light')}
        >
          <Icon name={tweaks.theme === 'light' ? 'moon' : 'sun'} />
          {tweaks.theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        </button>

        {/* Mobile-only tab slot for user button */}
        <div className="nav-item nav-user-tab">
          <UserButton />
          <span className="nav-user-label">Cuenta</span>
        </div>

        <div className="sidebar-foot">
          <UserButton />
          <div className="user-meta">
            <span className="name">
              {user?.fullName ?? user?.firstName ?? 'Usuario'}
            </span>
            <span className="role">FyF · Admin</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <Editor data={data} setData={setData} services={services} setServices={setServices} />
      </main>

      {/* Tweaks FAB */}
      <button
        className="tweaks-fab"
        onClick={() => setTweaksOpen((v) => !v)}
        aria-label="Apariencia"
        title="Ajustar apariencia"
      >
        <Icon name="sliders" size={15} />
      </button>

      {/* Tweaks Panel */}
      <TweaksPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        tweaks={tweaks}
        setTweak={setTweak}
      />
    </div>
  )
}
