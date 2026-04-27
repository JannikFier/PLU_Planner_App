// ContextMocks.jsx — realistic B2B UI surfaces using the mascot.
// Covers: tooltip, empty state, onboarding panel.

const uiStyles = {
  font: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  bg: '#F7F7F9',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1A1B2E',
  textMute: '#6B7280',
  primary: '#3E4FD6',
  primaryDark: '#2B3AAE',
  amber: '#F5A524',
};

// ── Tooltip mock ─────────────────────────────────────────────
function TooltipMock() {
  return (
    <div style={{
      width: 520, height: 360, background: uiStyles.bg, fontFamily: uiStyles.font,
      color: uiStyles.text, padding: 24, boxSizing: 'border-box', position: 'relative',
      overflow: 'hidden',
    }}>
      {/* fake table header */}
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: uiStyles.textMute, marginBottom: 8 }}>
        PLU · Filiale 2041 Nord
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Wochenplanung · KW 17</div>

      {/* fake table */}
      <div style={{ background: uiStyles.surface, border: `1px solid ${uiStyles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '10px 14px', fontSize: 12, color: uiStyles.textMute, borderBottom: `1px solid ${uiStyles.border}`, background: '#FAFAFB' }}>
          <div>Artikel</div><div>Bestand</div><div>Ø Abverkauf</div><div>Nachbestellung</div>
        </div>
        {[
          ['Bio-Milch 1 L', '184', '26 / Tag', '120'],
          ['Vollkornbrot 500 g', '42', '18 / Tag', '80'],
          ['Joghurt Natur 500 g', '61', '22 / Tag', '100'],
        ].map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '12px 14px', fontSize: 13, borderBottom: i < 2 ? `1px solid ${uiStyles.border}` : 'none', position: 'relative' }}>
            <div style={{ fontWeight: 500 }}>{row[0]}</div>
            <div style={{ color: uiStyles.textMute }}>{row[1]}</div>
            <div style={{ color: uiStyles.textMute }}>{row[2]}</div>
            <div style={{ fontWeight: 500, color: i === 1 ? uiStyles.amber : uiStyles.text }}>{row[3]}</div>
            {i === 1 && (
              <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: uiStyles.amber }} />
            )}
          </div>
        ))}
      </div>

      {/* tooltip with mascot peeking */}
      <div style={{ position: 'absolute', left: 260, top: 210, width: 240, zIndex: 5 }}>
        {/* mascot peeks from left edge of tooltip */}
        <div style={{ position: 'absolute', left: -52, top: -18, width: 60, height: 72 }}>
          <MascotExpert size={60} />
        </div>
        <div style={{
          background: uiStyles.text, color: '#fff', padding: '12px 14px', borderRadius: 10,
          fontSize: 12.5, lineHeight: 1.5, boxShadow: '0 8px 24px rgba(26,27,46,.18)',
          position: 'relative',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: uiStyles.amber }} />
            Hinweis von Vier
          </div>
          <div style={{ color: 'rgba(255,255,255,.82)' }}>
            Bestand niedrig – Ø Abverkauf deckt nur 2 Tage. Empfehlung: <b style={{ color: '#fff' }}>80 Stück</b> nachbestellen.
          </div>
          {/* tooltip pointer down */}
          <div style={{ position: 'absolute', bottom: -6, left: 60, width: 12, height: 12, background: uiStyles.text, transform: 'rotate(45deg)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Empty state mock ─────────────────────────────────────────
function EmptyStateMock() {
  return (
    <div style={{
      width: 520, height: 360, background: uiStyles.bg, fontFamily: uiStyles.font,
      color: uiStyles.text, boxSizing: 'border-box', padding: 24,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* breadcrumb */}
      <div style={{ fontSize: 12, color: uiStyles.textMute, marginBottom: 4 }}>
        Filialen › 2041 Nord › <span style={{ color: uiStyles.text }}>Aktionen</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Aktionen</div>

      {/* card with empty state */}
      <div style={{
        flex: 1, background: uiStyles.surface, border: `1px solid ${uiStyles.border}`,
        borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, textAlign: 'center', gap: 14,
      }}>
        <div style={{ width: 110, height: 132, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <MascotWaving size={108} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Noch keine Aktionen geplant</div>
        <div style={{ fontSize: 13, color: uiStyles.textMute, maxWidth: 320, lineHeight: 1.5 }}>
          Lege eine Aktion an, um PLU-Bündel, Rabatte und Zeitfenster für diese Filiale zu planen.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button style={{
            background: uiStyles.primary, color: '#fff', border: 'none', padding: '8px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: uiStyles.font,
          }}>
            Aktion anlegen
          </button>
          <button style={{
            background: 'transparent', color: uiStyles.text, border: `1px solid ${uiStyles.border}`,
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: uiStyles.font,
          }}>
            Vorlage verwenden
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding panel ─────────────────────────────────────────
function OnboardingMock() {
  return (
    <div style={{
      width: 520, height: 360, background: uiStyles.bg, fontFamily: uiStyles.font,
      color: uiStyles.text, boxSizing: 'border-box', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* blurred app shell behind */}
      <div style={{ position: 'absolute', inset: 0, padding: 20, opacity: 0.45 }}>
        <div style={{ height: 40, background: uiStyles.surface, borderRadius: 8, marginBottom: 12, border: `1px solid ${uiStyles.border}` }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 140, height: 220, background: uiStyles.surface, borderRadius: 8, border: `1px solid ${uiStyles.border}` }} />
          <div style={{ flex: 1, height: 220, background: uiStyles.surface, borderRadius: 8, border: `1px solid ${uiStyles.border}` }} />
        </div>
      </div>

      {/* onboarding card */}
      <div style={{
        width: 360, background: uiStyles.surface, borderRadius: 14, padding: '22px 22px 18px',
        boxShadow: '0 20px 60px rgba(26,27,46,.18)', border: `1px solid ${uiStyles.border}`,
        position: 'relative', zIndex: 2,
      }}>
        {/* mascot pops out the top */}
        <div style={{ position: 'absolute', top: -52, left: 22, width: 72, height: 86 }}>
          <MascotWaving size={72} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: uiStyles.textMute, letterSpacing: 0.4 }}>
          SCHRITT 1 VON 4
        </div>
        <div style={{ height: 3, background: '#EEF0F4', borderRadius: 2, margin: '8px 0 18px', overflow: 'hidden' }}>
          <div style={{ width: '25%', height: '100%', background: uiStyles.primary, borderRadius: 2 }} />
        </div>

        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Willkommen – ich bin Vier.</div>
        <div style={{ fontSize: 13.5, color: uiStyles.textMute, lineHeight: 1.5, marginBottom: 18 }}>
          Ich helfe dir beim Planen von PLU-Sortiment und Filialaktionen.
          Zuerst: verknüpfe deine erste Filiale.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={{
            background: 'transparent', color: uiStyles.textMute, border: 'none',
            fontSize: 13, cursor: 'pointer', fontFamily: uiStyles.font, padding: 0,
          }}>
            Überspringen
          </button>
          <button style={{
            background: uiStyles.primary, color: '#fff', border: 'none', padding: '9px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: uiStyles.font,
          }}>
            Los geht's →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Favicon scale test row ───────────────────────────────────
function FaviconScaleRow() {
  const sizes = [16, 24, 32, 48, 64];
  return (
    <div style={{
      width: 520, height: 240, background: uiStyles.bg, fontFamily: uiStyles.font,
      color: uiStyles.text, boxSizing: 'border-box', padding: 24,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: uiStyles.textMute, marginBottom: 6 }}>
          Skalierung – rendering test
        </div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          Silhouette muss ab 16 px lesbar bleiben
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'space-around', flex: 1, background: uiStyles.surface, border: `1px solid ${uiStyles.border}`, borderRadius: 10, padding: '20px 16px' }}>
        {sizes.map(s => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
              <MascotFlat size={s} />
            </div>
            <div style={{ fontSize: 11, color: uiStyles.textMute, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
              {s}px
            </div>
          </div>
        ))}
      </div>

      {/* on-dark row — monochrome */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', background: '#1A1B2E', borderRadius: 10, padding: '12px 16px' }}>
        {[16, 24, 32].map(s => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <MascotMono size={s} color="#fff" />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>{s}px · mono</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  uiStyles,
  TooltipMock, EmptyStateMock, OnboardingMock, FaviconScaleRow,
});
