/* Shared UI primitives used across all three variants. */

const { useState, useMemo, useEffect, useRef, useCallback, Fragment } = React;

/* ========== Icons ========== */
const Icon = {
  Search: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  EyeOff: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>,
  Eye: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  ChevronLeft: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 18-6-6 6-6"/></svg>,
  ChevronRight: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 18 6-6-6-6"/></svg>,
  ChevronDown: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  Check: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5"/></svg>,
  Crown: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/></svg>,
  Info: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
  Hand: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>,
  Filter: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>,
  Swap: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 16V4"/><path d="m3 8 4-4 4 4"/><path d="M17 8v12"/><path d="m21 16-4 4-4-4"/></svg>,
  Trash: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  More: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  X: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Plus: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14"/><path d="M5 12h14"/></svg>,
};

/* ========== Placeholder bread thumb (SVG, per category) ========== */
function BreadThumb({ cat, size = 40 }) {
  // deterministic color + shape hint per category
  const shapes = {
    croissant: { fill: "#e7ba7a", shape: "curve" },
    baguette:  { fill: "#d9a860", shape: "bar" },
    suesses:   { fill: "#efd6b6", shape: "dome" },
    laugen:    { fill: "#a6784d", shape: "pretzel" },
    brot:      { fill: "#8c5a32", shape: "loaf" },
    broetchen: { fill: "#c9935c", shape: "round" },
    snacks:    { fill: "#d8b87a", shape: "square" },
    keine:     { fill: "#c9cdd4", shape: "round" },
  };
  const s = shapes[cat] || shapes.keine;
  const pad = size * 0.12;
  const inner = size - pad * 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <rect x="0" y="0" width={size} height={size} fill="#f1ece3" />
      {s.shape === "curve" && (
        <path d={`M ${pad} ${size*0.7} Q ${size/2} ${pad}, ${size-pad} ${size*0.7} L ${size*0.75} ${size*0.78} Q ${size/2} ${size*0.4}, ${size*0.25} ${size*0.78} Z`} fill={s.fill} />
      )}
      {s.shape === "bar" && (
        <rect x={pad} y={size*0.38} width={inner} height={size*0.3} rx={size*0.12} fill={s.fill} />
      )}
      {s.shape === "dome" && (
        <path d={`M ${pad} ${size*0.7} A ${inner/2} ${size*0.35} 0 0 1 ${size-pad} ${size*0.7} Z`} fill={s.fill} />
      )}
      {s.shape === "pretzel" && (
        <g fill="none" stroke={s.fill} strokeWidth={size*0.1} strokeLinecap="round">
          <circle cx={size/2} cy={size*0.55} r={inner*0.32} />
          <path d={`M ${size*0.35} ${size*0.7} L ${size*0.5} ${size*0.45} L ${size*0.65} ${size*0.7}`} />
        </g>
      )}
      {s.shape === "loaf" && (
        <g>
          <rect x={pad} y={size*0.35} width={inner} height={size*0.4} rx={size*0.08} fill={s.fill} />
          <path d={`M ${size*0.25} ${size*0.45} L ${size*0.35} ${size*0.6} M ${size*0.4} ${size*0.45} L ${size*0.5} ${size*0.6} M ${size*0.55} ${size*0.45} L ${size*0.65} ${size*0.6} M ${size*0.7} ${size*0.45} L ${size*0.8} ${size*0.6}`} stroke="#00000020" strokeWidth={size*0.04} />
        </g>
      )}
      {s.shape === "round" && (
        <circle cx={size/2} cy={size*0.55} r={inner*0.35} fill={s.fill} />
      )}
      {s.shape === "square" && (
        <rect x={size*0.28} y={size*0.32} width={inner*0.6} height={inner*0.5} rx={size*0.06} fill={s.fill} />
      )}
    </svg>
  );
}

/* ========== Brand badge ========== */
function BBadge({ brand, pill, label }) {
  const cls = `bbadge bbadge--${brand}${pill ? " bbadge--pill" : ""}`;
  return (
    <span className={cls} title={window.HubData.BRAND_LABELS[brand]}>
      {pill && label ? label : brand}
    </span>
  );
}

/* ========== Origin chip ========== */
function OriginChip({ kind }) {
  if (kind === "manual") {
    return (
      <span className="origin origin--manual">
        <Icon.Hand /> Manuell
      </span>
    );
  }
  return (
    <span className="origin origin--rule">
      <Icon.Filter /> Regel
    </span>
  );
}

/* Rule chip — clickable ("shows rule details") */
function RuleChip({ ruleId, onOpen }) {
  const rule = window.HubData.RULES[ruleId];
  if (!rule) return null;
  return (
    <button className="rule-chip" onClick={() => onOpen && onOpen(ruleId)} title={`${rule.kind}: ${rule.name}`}>
      <span className="rule-chip-dot">{rule.letter}</span>
      <span>{rule.short}</span>
    </button>
  );
}

/* ========== Checkbox ========== */
function CheckBox({ checked, onChange }) {
  return (
    <button
      className="prow-check"
      aria-checked={checked ? "true" : "false"}
      role="checkbox"
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    >
      {checked && <Icon.Check />}
    </button>
  );
}

/* ========== Top bar ========== */
function TopBar() {
  return (
    <header className="hub-topbar">
      <div className="hub-topbar-left">
        <button className="hub-topbar-back" aria-label="Zurück"><Icon.ChevronLeft /></button>
        <div className="hub-logo">of</div>
        <div>
          <div className="hub-brand-name">Fier Hub</div>
          <div className="hub-brand-sub">Super-Administration</div>
        </div>
      </div>
      <div className="hub-topbar-right">
        <div className="hub-admin-pill"><Icon.Crown /> Super-Admin</div>
        <div className="hub-avatar">JA</div>
      </div>
    </header>
  );
}

/* ========== Page header (shared) ========== */
function PageHeader({ title, sub, right }) {
  return (
    <div className="hub-page-head">
      <div className="hub-page-title-wrap">
        <div className="hub-eyebrow-bar" />
        <div>
          <h1 className="hub-page-title">
            <span className="hub-page-title-icon"><Icon.EyeOff /></span>
            {title}
          </h1>
          <p className="hub-page-sub">{sub}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {right}
      </div>
    </div>
  );
}

/* ========== Brand segment (original style) ========== */
function BrandSeg({ value, onChange, counts }) {
  const items = [
    { id: "all", label: "Alle" },
    { id: "E",   label: "Edeka" },
    { id: "H",   label: "Harry" },
    { id: "A",   label: "Aryzta" },
    { id: "O",   label: "Eigene" },
  ];
  return (
    <div className="seg">
      {items.map(i => (
        <button
          key={i.id}
          aria-pressed={value === i.id}
          onClick={() => onChange(i.id)}
        >{i.label}</button>
      ))}
    </div>
  );
}

/* ========== Brand chips (alt style, with counts) ========== */
function BrandChips({ value, onChange, counts }) {
  const items = [
    { id: "all", label: "Alle" },
    { id: "E",   label: "Edeka" },
    { id: "H",   label: "Harry" },
    { id: "A",   label: "Aryzta" },
    { id: "O",   label: "Eigene" },
  ];
  return (
    <div className="chip-row">
      {items.map(i => (
        <button
          key={i.id}
          className="chip"
          aria-pressed={value === i.id}
          onClick={() => onChange(i.id)}
        >
          {i.id !== "all" && <BBadge brand={i.id} />}
          <span>{i.label}</span>
          <span className="chip-count">{counts?.[i.id] ?? ""}</span>
        </button>
      ))}
    </div>
  );
}

/* ========== Search field ========== */
function SearchField({ value, onChange, placeholder, style }) {
  return (
    <div className="search" style={style}>
      <Icon.Search />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "PLU, Name, Ausgeblendet von…"}
      />
      {value && (
        <button className="btn btn--ghost btn--sm" onClick={() => onChange("")} aria-label="Löschen" style={{ padding: "2px 6px" }}>
          <Icon.X />
        </button>
      )}
    </div>
  );
}

/* ========== Category tile ========== */
function CategoryTile({ cat, count, active, onClick, compact }) {
  return (
    <button
      className={`tile${compact ? " tile--compact" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <div className="tile-thumb"><BreadThumb cat={cat.id} size={compact ? 36 : 48} /></div>
      <div className="tile-info">
        <div className="tile-title">{cat.name}</div>
        <div className="tile-meta">{count} {count === 1 ? "Produkt" : "Produkte"}</div>
      </div>
    </button>
  );
}

/* ========== Bulk toolbar ========== */
function BulkBar({ count, onClear, actions }) {
  if (count === 0) return null;
  return (
    <div className="bulkbar">
      <div className="bulkbar-count">
        <span className="bulkbar-count-num">{count}</span>
        {count === 1 ? "Produkt ausgewählt" : "Produkte ausgewählt"}
      </div>
      <div className="bulkbar-sep" />
      {actions}
      <div className="bulkbar-spacer" />
      <button className="btn btn--ghost" onClick={onClear} style={{ color: "rgba(255,255,255,0.7)", background: "transparent", border: 0 }}>
        <Icon.X /> Auswahl aufheben
      </button>
    </div>
  );
}

/* ========== Export to window ========== */
Object.assign(window, {
  Icon, BreadThumb, BBadge, OriginChip, RuleChip, CheckBox,
  TopBar, PageHeader, BrandSeg, BrandChips, SearchField,
  CategoryTile, BulkBar,
});
