/* Variant A — Primary prototype.
   Two tabs ("Manuell" / "Regel"), brand segment + search at top,
   category tiles act as filters, product rows with bulk actions. */

const VA = window; // alias
const { useState: uA, useMemo: mA, useEffect: eA, useRef: rA } = React;

function VariantA({ density = "normal", badgeStyle = "letter", density2, dark }) {
  const { CATEGORIES, PRODUCTS, BRAND_LABELS } = window.HubData;

  const [tab, setTab] = uA("manual");       // "manual" | "rule"
  const [brand, setBrand] = uA("all");
  const [query, setQuery] = uA("");
  const [cat, setCat] = uA(null);
  const [selected, setSelected] = uA(() => new Set());
  const [expandedRule, setExpandedRule] = uA(() => new Set(["rule-brand-e", "rule-cat-baguette"]));

  // Clear selection when tab changes
  eA(() => { setSelected(new Set()); }, [tab]);

  const filteredByTab = mA(
    () => PRODUCTS.filter(p => p.origin === tab),
    [tab]
  );

  const filtered = mA(() => {
    return filteredByTab.filter(p => {
      if (brand !== "all" && p.brand !== brand) return false;
      if (cat && p.cat !== cat) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.plu.includes(q) && !(p.by || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [filteredByTab, brand, cat, query]);

  const catCounts = mA(() => {
    const m = {};
    CATEGORIES.forEach(c => { m[c.id] = filteredByTab.filter(p => p.cat === c.id).length; });
    return m;
  }, [filteredByTab]);

  const brandCounts = mA(() => {
    const m = { all: filteredByTab.length };
    ["E","H","A","O"].forEach(b => { m[b] = filteredByTab.filter(p => p.brand === b).length; });
    return m;
  }, [filteredByTab]);

  const manualCount = PRODUCTS.filter(p => p.origin === "manual").length;
  const ruleCount = PRODUCTS.filter(p => p.origin === "rule").length;

  // Group rule rows by ruleId
  const ruleGroups = mA(() => {
    if (tab !== "rule") return [];
    const groups = {};
    filtered.forEach(p => {
      const k = p.ruleId || "unknown";
      (groups[k] = groups[k] || []).push(p);
    });
    return Object.entries(groups).map(([id, items]) => ({
      id, items,
      rule: window.HubData.RULES[id] || { name: id, kind: "Regel", letter: "?" },
    }));
  }, [filtered, tab]);

  const toggleRow = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleAll = (rows) => {
    const ids = rows.map(r => r.id);
    const all = ids.every(i => selected.has(i));
    const s = new Set(selected);
    if (all) ids.forEach(i => s.delete(i));
    else ids.forEach(i => s.add(i));
    setSelected(s);
  };

  return (
    <div className="hub-root" data-density={density2}>
      <TopBar />
      <div className="hub-page">
        <PageHeader
          title="Ausgeblendete Produkte (Backshop)"
          sub="Bewusst für diesen Markt ausgeblendete Artikel und Artikel, die durch Marken- oder Warengruppen-Logik nicht in der Hauptliste erscheinen."
          right={<>
            <button className="btn btn--icon" aria-label="Suche"><Icon.Search /></button>
            <button className="btn btn--primary"><Icon.EyeOff /> Produkte ausblenden</button>
          </>}
        />

        {/* Tabs */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", marginBottom: 16 }}>
          <div className="tabs">
            <button className="tab" aria-selected={tab === "manual"} onClick={() => setTab("manual")}>
              <Icon.Hand /> Manuell ausgeblendet
              <span className="tab-count">{manualCount}</span>
            </button>
            <button className="tab" aria-selected={tab === "rule"} onClick={() => setTab("rule")}>
              <Icon.Filter /> Durch Regel gefiltert
              <span className="tab-count">{ruleCount}</span>
            </button>
            <div style={{ flex: 1 }} />
          </div>

          {/* Filter strip */}
          <div style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
            <SearchField value={query} onChange={setQuery} placeholder="PLU, Name, Ausgeblendet von…" style={{ flex: "1 1 320px", maxWidth: 420 }} />
            <BrandChips value={brand} onChange={setBrand} counts={brandCounts} />
          </div>

          {/* Category tiles — act as filter */}
          <div style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="section-label" style={{ margin: 0 }}>
                Warengruppen
                <span className="count">{cat ? "1 ausgewählt" : "Alle"}</span>
              </div>
              {cat && (
                <button className="btn btn--ghost btn--sm" onClick={() => setCat(null)}>
                  <Icon.X /> Gruppenfilter löschen
                </button>
              )}
            </div>
            <div className="tiles tiles--4">
              {CATEGORIES.map(c => (
                <CategoryTile
                  key={c.id}
                  cat={c}
                  count={catCounts[c.id] || 0}
                  active={cat === c.id}
                  onClick={() => setCat(cat === c.id ? null : c.id)}
                  compact={density2 === "compact"}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bulk bar */}
        <BulkBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          actions={tab === "manual" ? (
            <>
              <button className="btn btn--primary"><Icon.Eye /> In Hauptliste anzeigen</button>
              <button className="btn"><Icon.Swap /> Marken wählen</button>
              <button className="btn btn--danger-ghost" style={{ background: "transparent", borderColor: "transparent", color: "#ff9b9b" }}><Icon.Trash /> Ausblenden aufheben</button>
            </>
          ) : (
            <>
              <button className="btn btn--primary"><Icon.Eye /> Trotz Regel anzeigen</button>
              <button className="btn"><Icon.Filter /> Regel bearbeiten</button>
              <button className="btn"><Icon.Swap /> Marken wählen</button>
            </>
          )}
        />

        {/* Content */}
        {tab === "manual" ? (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Manuell ausgeblendet</h3>
                <p className="panel-head-sub">Artikel, die für diesen Markt explizit ausgeblendet wurden.</p>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--n-500)" }}>{filtered.length} von {manualCount}</div>
            </div>
            <ManualTable
              rows={filtered}
              selected={selected}
              toggleRow={toggleRow}
              toggleAll={() => toggleAll(filtered)}
            />
          </div>
        ) : (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Durch Regeln nicht in der Hauptliste</h3>
                <p className="panel-head-sub">Berechnete Liste. Anpassung über Gruppenregeln oder Marken-Auswahl.</p>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--n-500)" }}>{filtered.length} von {ruleCount}</div>
            </div>
            <div className="panel-body--flush">
              {ruleGroups.length === 0 ? (
                <div className="empty">Keine Produkte entsprechen den Filterkriterien.</div>
              ) : ruleGroups.map(g => (
                <RuleGroup
                  key={g.id}
                  group={g}
                  expanded={expandedRule.has(g.id)}
                  onToggle={() => {
                    const s = new Set(expandedRule);
                    s.has(g.id) ? s.delete(g.id) : s.add(g.id);
                    setExpandedRule(s);
                  }}
                  selected={selected}
                  toggleRow={toggleRow}
                  toggleAll={() => toggleAll(g.items)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualTable({ rows, selected, toggleRow, toggleAll }) {
  const allSel = rows.length > 0 && rows.every(r => selected.has(r.id));
  return (
    <>
      <div className="a-head">
        <div><CheckBox checked={allSel} onChange={toggleAll} /></div>
        <div></div>
        <div>PLU</div>
        <div>Artikel</div>
        <div>Marke</div>
        <div>Warengruppe</div>
        <div>Ausgeblendet von</div>
        <div style={{ textAlign: "right" }}>Aktionen</div>
      </div>
      {rows.length === 0 ? (
        <div className="empty">Keine Produkte entsprechen den Filterkriterien.</div>
      ) : rows.map(p => (
        <div key={p.id} className={`a-row${selected.has(p.id) ? " selected" : ""}`}>
          <div><CheckBox checked={selected.has(p.id)} onChange={() => toggleRow(p.id)} /></div>
          <div className="prow-thumb"><BreadThumb cat={p.cat} size={40} /></div>
          <div className="prow-plu">{p.plu}</div>
          <div>
            <div className="prow-name">{p.name}</div>
            <div className="prow-name-sub">seit {p.since}</div>
          </div>
          <div><BBadge brand={p.brand} /></div>
          <div className="prow-cat">{window.HubData.CATEGORIES.find(c => c.id === p.cat)?.name}</div>
          <div className="prow-hint">
            <span style={{ color: "var(--n-700)", fontWeight: 500 }}>{p.by}</span>
          </div>
          <div className="prow-actions">
            <button className="btn btn--primary btn--sm"><Icon.Eye /> In Hauptliste anzeigen</button>
            <button className="btn btn--icon btn--sm" aria-label="Mehr"><Icon.More /></button>
          </div>
        </div>
      ))}
    </>
  );
}

function RuleGroup({ group, expanded, onToggle, selected, toggleRow, toggleAll }) {
  const allSel = group.items.length > 0 && group.items.every(r => selected.has(r.id));
  return (
    <div className="rule-group">
      <button className="rule-group-head" aria-expanded={expanded} onClick={onToggle}>
        <span className="rule-group-chev"><Icon.ChevronRight /></span>
        <span className="rule-chip-dot" style={{ width: 20, height: 20, fontSize: 11 }}>{group.rule.letter}</span>
        <span className="rule-group-title">{group.rule.name}</span>
        <span className="rule-group-count">{group.rule.kind} · {group.items.length} Produkte</span>
        <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6 }}>
          <span className="btn btn--sm" style={{ background: "var(--bg-card)" }}><Icon.Filter /> Regel bearbeiten</span>
        </span>
      </button>
      {expanded && (
        <>
          <div className="a-head">
            <div><CheckBox checked={allSel} onChange={toggleAll} /></div>
            <div></div>
            <div>PLU</div>
            <div>Artikel</div>
            <div>Marke</div>
            <div>Warengruppe</div>
            <div>Hinweis</div>
            <div style={{ textAlign: "right" }}>Aktionen</div>
          </div>
          {group.items.map(p => (
            <div key={p.id} className={`a-row${selected.has(p.id) ? " selected" : ""}`}>
              <div><CheckBox checked={selected.has(p.id)} onChange={() => toggleRow(p.id)} /></div>
              <div className="prow-thumb"><BreadThumb cat={p.cat} size={40} /></div>
              <div className="prow-plu">{p.plu}</div>
              <div>
                <div className="prow-name">{p.name}</div>
              </div>
              <div><BBadge brand={p.brand} /></div>
              <div className="prow-cat">{window.HubData.CATEGORIES.find(c => c.id === p.cat)?.name}</div>
              <div className="prow-hint">{p.hint}</div>
              <div className="prow-actions">
                <button className="btn btn--primary btn--sm"><Icon.Eye /> In Hauptliste anzeigen</button>
                {p.brand !== "O" && <button className="btn btn--sm"><Icon.Swap /> Marken wählen</button>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

window.VariantA = VariantA;
