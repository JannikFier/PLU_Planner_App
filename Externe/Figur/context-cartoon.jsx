// context-cartoon.jsx — in-context UI mocks using cartoon mascot.

const cartoonStyles = {
  font: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  bg: '#F7F7F9',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1A1B2E',
  textMute: '#6B7280',
  primary: '#3E4FD6',
  amber: '#F5A524',
};

function TooltipMock() {
  return (
    <div style={{
      width: 520, height: 360, background: cartoonStyles.bg, fontFamily: cartoonStyles.font,
      color: cartoonStyles.text, padding: 24, boxSizing: 'border-box', position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: cartoonStyles.textMute, marginBottom: 8 }}>
        PLU · Filiale 2041 Nord
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Wochenplanung · KW 17</div>

      <div style={{ background: cartoonStyles.surface, border: `1px solid ${cartoonStyles.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '10px 14px', fontSize: 12, color: cartoonStyles.textMute, borderBottom: `1px solid ${cartoonStyles.border}`, background: '#FAFAFB' }}>
          <div>Artikel</div><div>Bestand</div><div>Ø Abverkauf</div><div>Nachbestellung</div>
        </div>
        {[
          ['Bio-Milch 1 L', '184', '26 / Tag', '120'],
          ['Vollkornbrot 500 g', '42', '18 / Tag', '80'],
          ['Joghurt Natur 500 g', '61', '22 / Tag', '100'],
        ].map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '12px 14px', fontSize: 13, borderBottom: i < 2 ? `1px solid ${cartoonStyles.border}` : 'none', position: 'relative' }}>
            <div style={{ fontWeight: 500 }}>{row[0]}</div>
            <div style={{ color: cartoonStyles.textMute }}>{row[1]}</div>
            <div style={{ color: cartoonStyles.textMute }}>{row[2]}</div>
            <div style={{ fontWeight: 500, color: i === 1 ? cartoonStyles.amber : cartoonStyles.text }}>{row[3]}</div>
            {i === 1 && (
              <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: cartoonStyles.amber }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', left: 240, top: 198, width: 260, zIndex: 5 }}>
        <div style={{ position: 'absolute', left: -64, top: -28, width: 72, height: 90 }}>
          <MascotCartoonPoint size={72} />
        </div>
        <div style={{
          background: cartoonStyles.text, color: '#fff', padding: '12px 14px', borderRadius: 10,
          fontSize: 12.5, lineHeight: 1.5, boxShadow: '0 8px 24px rgba(26,27,46,.18)',
          position: 'relative',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cartoonStyles.amber }} />
            Hinweis von Vier
          </div>
          <div style={{ color: 'rgba(255,255,255,.82)' }}>
            Bestand niedrig – Ø Abverkauf deckt nur 2 Tage. Empfehlung: <b style={{ color: '#fff' }}>80 Stück</b> nachbestellen.
          </div>
          <div style={{ position: 'absolute', bottom: -6, left: 68, width: 12, height: 12, background: cartoonStyles.text, transform: 'rotate(45deg)' }} />
        </div>
      </div>
    </div>
  );
}

function EmptyStateMock() {
  return (
    <div style={{
      width: 520, height: 360, background: cartoonStyles.bg, fontFamily: cartoonStyles.font,
      color: cartoonStyles.text, boxSizing: 'border-box', padding: 24,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 12, color: cartoonStyles.textMute, marginBottom: 4 }}>
        Filialen › 2041 Nord › <span style={{ color: cartoonStyles.text }}>Aktionen</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Aktionen</div>

      <div style={{
        flex: 1, background: cartoonStyles.surface, border: `1px solid ${cartoonStyles.border}`,
        borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 20, textAlign: 'center', gap: 10,
      }}>
        <MascotCartoonSurprised size={120} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Noch keine Aktionen geplant</div>
        <div style={{ fontSize: 13, color: cartoonStyles.textMute, maxWidth: 320, lineHeight: 1.5 }}>
          Lege eine Aktion an, um PLU-Bündel, Rabatte und Zeitfenster für diese Filiale zu planen.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button style={{
            background: cartoonStyles.primary, color: '#fff', border: 'none', padding: '8px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: cartoonStyles.font,
          }}>
            Aktion anlegen
          </button>
          <button style={{
            background: 'transparent', color: cartoonStyles.text, border: `1px solid ${cartoonStyles.border}`,
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: cartoonStyles.font,
          }}>
            Vorlage verwenden
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardingMock() {
  return (
    <div style={{
      width: 520, height: 360, background: cartoonStyles.bg, fontFamily: cartoonStyles.font,
      color: cartoonStyles.text, boxSizing: 'border-box', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, padding: 20, opacity: 0.45 }}>
        <div style={{ height: 40, background: cartoonStyles.surface, borderRadius: 8, marginBottom: 12, border: `1px solid ${cartoonStyles.border}` }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 140, height: 220, background: cartoonStyles.surface, borderRadius: 8, border: `1px solid ${cartoonStyles.border}` }} />
          <div style={{ flex: 1, height: 220, background: cartoonStyles.surface, borderRadius: 8, border: `1px solid ${cartoonStyles.border}` }} />
        </div>
      </div>

      <div style={{
        width: 360, background: cartoonStyles.surface, borderRadius: 14, padding: '22px 22px 18px',
        boxShadow: '0 20px 60px rgba(26,27,46,.18)', border: `1px solid ${cartoonStyles.border}`,
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ position: 'absolute', top: -72, left: 18, width: 92, height: 112 }}>
          <MascotCartoonHero size={92} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: cartoonStyles.textMute, letterSpacing: 0.4 }}>
          SCHRITT 1 VON 4
        </div>
        <div style={{ height: 3, background: '#EEF0F4', borderRadius: 2, margin: '8px 0 18px', overflow: 'hidden' }}>
          <div style={{ width: '25%', height: '100%', background: cartoonStyles.primary, borderRadius: 2 }} />
        </div>

        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Willkommen – ich bin Vier.</div>
        <div style={{ fontSize: 13.5, color: cartoonStyles.textMute, lineHeight: 1.5, marginBottom: 18 }}>
          Ich helfe dir beim Planen von PLU-Sortiment und Filialaktionen.
          Zuerst: verknüpfe deine erste Filiale.
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={{
            background: 'transparent', color: cartoonStyles.textMute, border: 'none',
            fontSize: 13, cursor: 'pointer', fontFamily: cartoonStyles.font, padding: 0,
          }}>
            Überspringen
          </button>
          <button style={{
            background: cartoonStyles.primary, color: '#fff', border: 'none', padding: '9px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: cartoonStyles.font,
          }}>
            Los geht's →
          </button>
        </div>
      </div>
    </div>
  );
}

function FaviconScaleRow() {
  const sizes = [16, 24, 32, 48, 64];
  return (
    <div style={{
      width: 520, height: 240, background: cartoonStyles.bg, fontFamily: cartoonStyles.font,
      color: cartoonStyles.text, boxSizing: 'border-box', padding: 24,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: cartoonStyles.textMute, marginBottom: 6 }}>
          Skalierung – rendering test
        </div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          Silhouette ab 16 px lesbar — Details fallen weg, Form bleibt
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'space-around', flex: 1, background: cartoonStyles.surface, border: `1px solid ${cartoonStyles.border}`, borderRadius: 10, padding: '20px 16px' }}>
        {sizes.map(s => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
              <MascotCartoonStand size={s} />
            </div>
            <div style={{ fontSize: 11, color: cartoonStyles.textMute, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
              {s}px
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', background: '#1A1B2E', borderRadius: 10, padding: '12px 16px' }}>
        {[16, 24, 32].map(s => (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <MascotCartoonMono size={s} color="#fff" />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>{s}px · mono</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  cartoonStyles,
  TooltipMock, EmptyStateMock, OnboardingMock, FaviconScaleRow,
});
