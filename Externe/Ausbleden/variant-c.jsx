/* Variant C — Power-user / dichte Profi-Tabelle mit Sidebar-Facets.
   Linke Spalte: alle Facetten (Herkunft, Marke, Warengruppe) als
   Zähllisten. Rechte Spalte: sehr dichte, sortierbare Tabelle. */

function VariantC({ density2 = "compact" }) {
  const { CATEGORIES, PRODUCTS } = window.HubData;

  const [brand, setBrand] = React.useState("all");
  const [origin, setOrigin] = React.useState("all");
  const [cat, setCat] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(() => new Set());
  const [sort, setSort] = React.useState({ col: "plu", dir: "asc" });

  const filtered = React.useMemo(() => {
    let rows = PRODUCTS.filter(p => {
      if (brand !== "all" && p.brand !== brand) return false;
      if (origin !== "all" && p.origin !== origin) return false;
      if (cat && p.cat !== cat) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.plu.includes(q)) return false;
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const av = String(a[sort.col] ?? "");
      const bv = String(b[sort.col] ?? "");
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return rows;
  }, [brand, origin, cat, query, sort]);

  const toggleRow = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = () => {
    const all = filtered.every(p => selected.has(p.id));
    const s = new Set(selected);
    if (all) filtered.forEach(p => s.delete(p.id));
    else filtered.forEach(p => s.add(p.id));
    setSelected(s);
  };
  const allSel = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const SortHead = ({ col, children, align }) => (
    <div
      style={{ cursor: "pointer", textAlign: align, userSelect: "none" }}
      onClick={() => setSort({ col, dir: sort.col === col && sort.dir === "asc" ? "desc" : "asc" })}
    >
      {children}
      {sort.col === col && <span style={{ marginLeft: 4, opacity: 0.6 }}>{sort.dir === "asc" ? "▲" : "▼"}</span>}
    </div>
  );

  const activeFilterCount =
    (brand !== "all" ? 1 : 0) + (origin !== "all" ? 1 : 0) + (cat ? 1 : 0) + (query ? 1 : 0);

  return (
    <div className="hub-root" data-density={density2}>
      <TopBar />
      <div className="hub-page hub-page--wide">
        <PageHeader
          title="Ausgeblendete Produkte (Backshop)"
          sub="Profi-Ansicht: alle Datensätze in einer sortier- und filterbaren Tabelle. Facetten links, Bulk-Aktionen per Mehrfachauswahl."
          right={<>
            <button className="btn"><Icon.Filter /> Export</button>
            <button className="btn btn--primary"><Icon.EyeOff /> Produkte ausblenden</button>
          </>}
        />

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* Sidebar */}
          <aside className="panel side">
            <div className="side-section">
              <SearchField value={query} onChange={setQuery} placeholder="PLU oder Name…" />
            </div>

            <div className="side-section">
              <h4 className="side-title">Herkunft</h4>
              {[
                { id: "all", label: "Alle", icon: null, count: PRODUCTS.length },
                { id: "manual", label: "Manuell ausgeblendet", icon: <Icon.Hand />, count: PRODUCTS.filter(p => p.origin === "manual").length },
                { id: "rule", label: "Durch Regel", icon: <Icon.Filter />, count: PRODUCTS.filter(p => p.origin === "rule").length },
              ].map(i => (
                <button key={i.id} className="side-row" aria-pressed={origin === i.id} onClick={() => setOrigin(i.id)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {i.icon}<span>{i.label}</span>
                  </span>
                  <span className="side-row-count">{i.count}</span>
                </button>
              ))}
            </div>

            <div className="side-section">
              <h4 className="side-title">Marke</h4>
              {[
                { id: "all", label: "Alle Marken" },
                { id: "E", label: "Edeka" },
                { id: "H", label: "Harry" },
                { id: "A", label: "Aryzta" },
                { id: "O", label: "Eigene" },
              ].map(i => (
                <button key={i.id} className="side-row" aria-pressed={brand === i.id} onClick={() => setBrand(i.id)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {i.id !== "all" && <BBadge brand={i.id} />}
                    <span>{i.label}</span>
                  </span>
                  <span className="side-row-count">
                    {i.id === "all" ? PRODUCTS.length : PRODUCTS.filter(p => p.brand === i.id).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="side-section">
              <h4 className="side-title">Warengruppe</h4>
              <button className="side-row" aria-pressed={!cat} onClick={() => setCat(null)}>
                <span>Alle Gruppen</span>
                <span className="side-row-count">{PRODUCTS.length}</span>
              </button>
              {CATEGORIES.map(c => (
                <button key={c.id} className="side-row" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, overflow: "hidden", display: "inline-block", background: "var(--bg-sunken)" }}>
                      <BreadThumb cat={c.id} size={18} />
                    </span>
                    <span>{c.name}</span>
                  </span>
                  <span className="side-row-count">{PRODUCTS.filter(p => p.cat === c.id).length}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Main */}
          <main style={{ flex: 1, minWidth: 0 }}>
            <BulkBar
              count={selected.size}
              onClear={() => setSelected(new Set())}
              actions={<>
                <button className="btn btn--primary"><Icon.Eye /> In Hauptliste anzeigen</button>
                <button className="btn"><Icon.Swap /> Marken wählen</button>
                <button className="btn"><Icon.Filter /> Regel bearbeiten</button>
              </>}
            />

            <div className="panel">
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, color: "var(--n-700)" }}>
                  <b>{filtered.length}</b> <span style={{ color: "var(--n-500)" }}>von {PRODUCTS.length} Produkten</span>
                </div>
                {activeFilterCount > 0 && (
                  <button className="btn btn--ghost btn--sm" onClick={() => { setBrand("all"); setOrigin("all"); setCat(null); setQuery(""); }}>
                    <Icon.X /> {activeFilterCount} Filter zurücksetzen
                  </button>
                )}
              </div>

              <div className="dense-head">
                <div><CheckBox checked={allSel} onChange={toggleAll} /></div>
                <div></div>
                <SortHead col="plu">PLU</SortHead>
                <SortHead col="name">Artikel</SortHead>
                <div>Mrk</div>
                <SortHead col="cat">Gruppe</SortHead>
                <SortHead col="origin">Herkunft</SortHead>
                <div>Hinweis / Quelle</div>
                <div style={{ textAlign: "right" }}>Aktion</div>
              </div>

              {filtered.length === 0 ? (
                <div className="empty">Keine Produkte entsprechen den Filterkriterien.</div>
              ) : filtered.map(p => (
                <div key={p.id} className={`dense-row${selected.has(p.id) ? " selected" : ""}`}>
                  <div><CheckBox checked={selected.has(p.id)} onChange={() => toggleRow(p.id)} /></div>
                  <div className="prow-thumb" style={{ width: 32, height: 32 }}><BreadThumb cat={p.cat} size={32} /></div>
                  <div className="prow-plu">{p.plu}</div>
                  <div>
                    <div className="prow-name" style={{ fontSize: 12.5 }}>{p.name}</div>
                  </div>
                  <div><BBadge brand={p.brand} /></div>
                  <div className="prow-cat">{window.HubData.CATEGORIES.find(c => c.id === p.cat)?.name}</div>
                  <div>
                    {p.origin === "manual"
                      ? <OriginChip kind="manual" />
                      : <RuleChip ruleId={p.ruleId} />
                    }
                  </div>
                  <div className="prow-hint" style={{ fontSize: 11.5 }}>
                    {p.origin === "manual"
                      ? <>von {p.by} · {p.since}</>
                      : p.hint?.slice(0, 60)
                    }
                  </div>
                  <div className="prow-actions">
                    <button className="btn btn--primary btn--sm"><Icon.Eye /></button>
                    <button className="btn btn--icon btn--sm" aria-label="Mehr"><Icon.More /></button>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

window.VariantC = VariantC;
