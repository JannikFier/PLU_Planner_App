/* Variant B — Ein einheitlicher Stream mit Herkunfts-Badge
   (Manuell vs. Regel als Chip in derselben Zeile). Keine Tabs —
   stattdessen Herkunfts-Filter-Chips oben. Warengruppen kompakt
   als horizontaler Scroller. */

function VariantB({ density2 = "normal" }) {
  const { CATEGORIES, PRODUCTS } = window.HubData;

  const [brand, setBrand] = React.useState("all");
  const [origin, setOrigin] = React.useState("all"); // all | manual | rule
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState(null);
  const [selected, setSelected] = React.useState(() => new Set());

  const filtered = React.useMemo(() => {
    return PRODUCTS.filter(p => {
      if (brand !== "all" && p.brand !== brand) return false;
      if (origin !== "all" && p.origin !== origin) return false;
      if (cat && p.cat !== cat) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.plu.includes(q)) return false;
      }
      return true;
    });
  }, [brand, origin, cat, query]);

  const catCounts = React.useMemo(() => {
    const m = {};
    CATEGORIES.forEach(c => {
      m[c.id] = PRODUCTS.filter(p => p.cat === c.id &&
        (brand === "all" || p.brand === brand) &&
        (origin === "all" || p.origin === origin)).length;
    });
    return m;
  }, [brand, origin]);

  const originCounts = React.useMemo(() => ({
    all: PRODUCTS.length,
    manual: PRODUCTS.filter(p => p.origin === "manual").length,
    rule: PRODUCTS.filter(p => p.origin === "rule").length,
  }), []);

  const brandCounts = React.useMemo(() => {
    const m = { all: PRODUCTS.length };
    ["E","H","A","O"].forEach(b => { m[b] = PRODUCTS.filter(p => p.brand === b).length; });
    return m;
  }, []);

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

  return (
    <div className="hub-root" data-density={density2}>
      <TopBar />
      <div className="hub-page">
        <PageHeader
          title="Ausgeblendete Produkte (Backshop)"
          sub="Alle ausgeblendeten und gefilterten Artikel dieses Markts in einer einheitlichen Liste. Herkunft (Manuell / Regel) siehst du pro Zeile."
          right={<>
            <button className="btn"><Icon.Info /> Hilfe</button>
            <button className="btn btn--primary"><Icon.EyeOff /> Produkte ausblenden</button>
          </>}
        />

        {/* Filter row */}
        <div className="panel" style={{ marginBottom: 14 }}>
          <div style={{ padding: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <SearchField value={query} onChange={setQuery} placeholder="Suche PLU oder Artikelname…" style={{ flex: "1 1 300px", maxWidth: 380 }} />
            <div className="chip-row">
              {[
                { id: "all", label: "Alle", icon: null },
                { id: "manual", label: "Manuell", icon: <Icon.Hand /> },
                { id: "rule", label: "Regel", icon: <Icon.Filter /> },
              ].map(i => (
                <button key={i.id} className="chip" aria-pressed={origin === i.id} onClick={() => setOrigin(i.id)}>
                  {i.icon}<span>{i.label}</span>
                  <span className="chip-count">{originCounts[i.id]}</span>
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 22, background: "var(--border)" }} />
            <BrandChips value={brand} onChange={setBrand} counts={brandCounts} />
          </div>

          {/* Horizontal category scroller */}
          <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px" }}>
            <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="nice-scroll">
              <button
                className="chip"
                aria-pressed={!cat}
                onClick={() => setCat(null)}
                style={{ flexShrink: 0 }}
              >
                Alle Gruppen <span className="chip-count">{PRODUCTS.length}</span>
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className="chip"
                  aria-pressed={cat === c.id}
                  onClick={() => setCat(cat === c.id ? null : c.id)}
                  style={{ flexShrink: 0 }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: 4, overflow: "hidden", display: "inline-block", background: "var(--bg-sunken)" }}>
                    <BreadThumb cat={c.id} size={18} />
                  </span>
                  {c.name}
                  <span className="chip-count">{catCounts[c.id] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk bar */}
        <BulkBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          actions={<>
            <button className="btn btn--primary"><Icon.Eye /> In Hauptliste anzeigen</button>
            <button className="btn"><Icon.Swap /> Marken wählen</button>
            <button className="btn"><Icon.Filter /> Regel bearbeiten</button>
          </>}
        />

        {/* Unified stream */}
        <div className="panel">
          <div className="prow-head" style={{ gridTemplateColumns: "20px 44px 64px 1fr 120px 150px auto" }}>
            <div><CheckBox checked={allSel} onChange={toggleAll} /></div>
            <div></div>
            <div>PLU</div>
            <div>Artikel</div>
            <div>Herkunft</div>
            <div>Gruppe · Marke</div>
            <div style={{ textAlign: "right" }}>Aktionen</div>
          </div>
          {filtered.length === 0 ? (
            <div className="empty">Keine Produkte entsprechen den Filterkriterien.</div>
          ) : filtered.map(p => (
            <div key={p.id} className={`stream-row${selected.has(p.id) ? " selected" : ""}`}>
              <div><CheckBox checked={selected.has(p.id)} onChange={() => toggleRow(p.id)} /></div>
              <div className="prow-thumb"><BreadThumb cat={p.cat} size={40} /></div>
              <div className="prow-plu">{p.plu}</div>
              <div>
                <div className="prow-name">{p.name}</div>
                <div className="prow-name-sub">
                  {p.origin === "manual"
                    ? <>ausgeblendet von <b style={{ color: "var(--n-600)" }}>{p.by}</b> · {p.since}</>
                    : p.hint
                  }
                </div>
              </div>
              <div>
                {p.origin === "manual"
                  ? <OriginChip kind="manual" />
                  : <RuleChip ruleId={p.ruleId} />
                }
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BBadge brand={p.brand} />
                <span className="prow-cat">{window.HubData.CATEGORIES.find(c => c.id === p.cat)?.name}</span>
              </div>
              <div className="prow-actions">
                <button className="btn btn--primary btn--sm"><Icon.Eye /> Anzeigen</button>
                <button className="btn btn--icon btn--sm" aria-label="Mehr"><Icon.More /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.VariantB = VariantB;
