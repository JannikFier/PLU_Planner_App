/* global React */
;(function (w) {
  const T = w.WG_TOKENS
  if (typeof w.wgRegisterProtoIcons === 'function') w.wgRegisterProtoIcons()

  const wgTopbarStyles = {
    wrap: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: T.touchMin,
      padding: '0 16px',
      borderBottom: `1px solid ${T.hairlineStrong}`,
      background: T.panel,
    },
    title: { fontSize: 15, fontWeight: 600, color: T.ink },
    pill: {
      fontSize: 12,
      fontWeight: 600,
      padding: '6px 12px',
      borderRadius: T.pill,
      background: T.accentBg,
      color: T.accentInk,
      border: `1px solid ${T.hairlineStrong}`,
    },
  }

  const wgBackshopTopbarStyles = {
    wrap: {
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      minHeight: 72,
      padding: '10px 16px 12px',
      borderBottom: `1px solid ${T.hairlineStrong}`,
      background: T.panel,
    },
    brandCol: { flexShrink: 0, minWidth: 120 },
    backshop: {
      fontSize: 11,
      letterSpacing: '0.18em',
      fontWeight: 600,
      color: T.muted,
      textTransform: 'uppercase',
      margin: 0,
    },
    title: { fontSize: 18, fontWeight: 700, color: T.ink, margin: '4px 0 0', lineHeight: 1.15 },
    searchWrap: { flex: 1, minWidth: 0, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' },
  }

  const wgBackshopSearchStyles = {
    shell: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 44,
      borderRadius: T.radius10,
      border: `1px solid ${T.hairlineStrong}`,
      background: T.card,
      padding: '0 12px',
    },
    input: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontSize: 15,
      fontFamily: T.fontUi,
      color: T.ink,
    },
    clearBtn: {
      border: 'none',
      background: 'none',
      padding: 4,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 0,
    },
  }

  const wgSidebarStyles = {
    wrap: {
      width: T.sidebarW,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: T.panel,
      borderRight: `1px solid ${T.hairlineStrong}`,
    },
    h: {
      fontSize: 10,
      letterSpacing: '0.28em',
      fontWeight: 600,
      color: T.muted,
      padding: '14px 10px 6px',
      margin: 0,
    },
    list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 6px 12px' },
    sep: { height: 1, background: T.hairlineStrong, margin: '8px 12px' },
  }

  const wgSidebarRowStyles = (active, dropHover) => ({
    row: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 4,
      minHeight: 52,
      padding: '8px 8px',
      marginBottom: 4,
      borderRadius: T.radius12,
      cursor: 'pointer',
      border: active ? `1px solid ${T.hairlineStrong}` : '1px solid transparent',
      background: dropHover ? T.accentBg : active ? T.card : 'transparent',
      boxShadow: dropHover ? `0 0 0 2px ${T.accent}` : 'none',
    },
    nameRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      width: '100%',
    },
    plate: {
      width: 26,
      height: 26,
      borderRadius: T.radius8,
      background: T.iconPlate,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 700,
      color: T.muted,
      overflow: 'hidden',
    },
    name: {
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
      color: T.ink,
      minWidth: 0,
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      lineHeight: 1.25,
    },
    count: {
      alignSelf: 'flex-end',
      fontFamily: T.fontMono,
      fontVariantNumeric: 'tabular-nums',
      fontSize: 11,
      color: T.muted,
      fontWeight: 500,
    },
  })

  const wgStripePlate = {
    backgroundImage:
      'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
  }

  const wgCenterStyles = {
    wrap: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: T.panel,
      borderRight: `1px solid ${T.hairlineStrong}`,
    },
    head: { padding: '12px 16px 8px', flexShrink: 0 },
    headWithRule: { borderBottom: `1px solid ${T.hairline}` },
    headRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    cap: { fontSize: 10, letterSpacing: '0.22em', fontWeight: 600, color: T.muted, margin: 0 },
    count: { fontSize: 22, fontWeight: 700, color: T.ink, margin: '4px 0 0' },
    hint: { fontSize: 12, color: T.muted, marginTop: 4 },
    bulkBar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px 10px',
      background: T.bg,
      minHeight: 48,
    },
    grid: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: 12,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
      gap: 12,
      alignContent: 'start',
    },
    gridTwoCol: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: 12,
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 12,
      alignContent: 'start',
    },
  }

  const wgCardStyles = (checked, opts) => {
    const compact = opts && opts.compact
    const layout = (opts && opts.layout) || 'row'
    const imgH = compact ? T.productCardImgHCompact ?? 108 : T.productCardImgH ?? 156
    const imgSize = compact ? 36 : 44

    if (layout === 'hero') {
      return {
        card: {
          borderRadius: T.radius12,
          background: T.card,
          boxShadow: 'none',
          padding: 12,
          paddingBottom: 52,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0,
          minHeight: compact ? 220 : 0,
          position: 'relative',
          border: checked ? `2px solid ${T.accent}` : `1px solid ${T.hairlineStrong}`,
          boxSizing: 'border-box',
        },
        img: {
          width: '100%',
          height: imgH,
          minHeight: imgH,
          borderRadius: T.radius8,
          flexShrink: 0,
          ...wgStripePlate,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? 9 : 11,
          fontWeight: 600,
          color: T.muted,
          border: `1px dashed ${T.hairlineStrong}`,
          boxSizing: 'border-box',
        },
        mid: { flex: 1, minWidth: 0 },
        pluRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 },
        plu: { fontFamily: T.fontMono, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 500, color: T.ink },
        badge: {
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: '2px 6px',
          borderRadius: T.radius8,
          border: `1px solid ${T.hairlineStrong}`,
          color: T.muted,
        },
        name: {
          fontSize: compact ? 13 : 14,
          fontWeight: 600,
          color: T.ink,
          marginTop: 6,
          marginBottom: 4,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          lineHeight: 1.4,
        },
        grip: {
          position: 'absolute',
          right: 6,
          bottom: 6,
          width: T.touchMin,
          height: T.touchMin,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          flexShrink: 0,
        },
        cb: {
          position: 'absolute',
          left: 10,
          bottom: 10,
          width: 22,
          height: 22,
          accentColor: T.accent,
        },
      }
    }

    return {
      card: {
        borderRadius: T.radius12,
        background: T.card,
        boxShadow: 'none',
        padding: 12,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        minHeight: compact ? 60 : 68,
        border: checked ? `2px solid ${T.accent}` : `1px solid ${T.hairlineStrong}`,
        boxSizing: 'border-box',
      },
      img: {
        width: imgSize,
        height: imgSize,
        borderRadius: T.radius8,
        flexShrink: 0,
        ...wgStripePlate,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 600,
        color: T.muted,
        border: `1px dashed ${T.hairlineStrong}`,
      },
      mid: { flex: 1, minWidth: 0 },
      pluRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
      plu: { fontFamily: T.fontMono, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 500, color: T.ink },
      badge: {
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '2px 6px',
        borderRadius: T.radius8,
        border: `1px solid ${T.hairlineStrong}`,
        color: T.muted,
      },
      name: { fontSize: 14, fontWeight: 600, color: T.ink, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      grip: { width: T.touchMin, height: T.touchMin, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', flexShrink: 0 },
      cb: { width: 22, height: 22, accentColor: T.accent },
    }
  }

  const wgStatusStyles = {
    wrap: { width: T.statusW, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: T.panel },
    h: { fontSize: 10, letterSpacing: '0.28em', fontWeight: 600, color: T.muted, padding: '16px 16px 4px', margin: 0 },
    sub: { fontSize: 11, fontWeight: 600, color: T.muted, padding: '0 16px 8px', margin: 0 },
    stack: { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 },
    stat: (warm) => ({
      borderRadius: T.radius10,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      background: warm ? T.statOhneBg : T.bg,
      border: `1px solid ${T.hairlineStrong}`,
    }),
    statLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: T.muted, textTransform: 'uppercase' },
    statNum: { fontFamily: T.fontMono, fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 700, color: T.ink },
    recent: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 12px' },
    mini: { borderRadius: T.radius10, padding: 10, background: T.bg, border: `1px solid ${T.hairline}`, marginBottom: 8 },
  }

  const wgToastStyles = {
    wrap: {
      position: 'fixed',
      left: 24,
      right: 24,
      bottom: 24,
      maxWidth: 480,
      margin: '0 auto',
      zIndex: 99999,
      background: T.toastBg,
      color: T.toastInk,
      borderRadius: T.radius12,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    },
    undo: { color: T.accentInk, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', fontSize: 13, fontFamily: T.fontUi },
    close: { color: T.toastInk, opacity: 0.85, cursor: 'pointer', background: 'none', border: 'none', fontSize: 18, lineHeight: 1 },
  }

  const wgEmptyStyles = {
    wrap: { padding: 48, textAlign: 'center', color: T.muted },
    tile: { width: 48, height: 48, margin: '0 auto 16px', borderRadius: T.radius10, background: T.iconPlate, ...wgStripePlate },
    title: { fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 8 },
    text: { fontSize: 13, lineHeight: 1.5, maxWidth: 360, margin: '0 auto' },
    groupLupenTile: {
      width: 56,
      height: 56,
      margin: '0 auto 20px',
      borderRadius: T.radius12,
      background: T.iconPlate,
      border: `1px solid ${T.hairlineStrong}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  }

  function WgGripIcon() {
    return React.createElement(
      'svg',
      { width: 18, height: 18, viewBox: '0 0 24 24', fill: T.muted, 'aria-hidden': true },
      React.createElement('circle', { cx: 8, cy: 6, r: 1.8 }),
      React.createElement('circle', { cx: 16, cy: 6, r: 1.8 }),
      React.createElement('circle', { cx: 8, cy: 12, r: 1.8 }),
      React.createElement('circle', { cx: 16, cy: 12, r: 1.8 }),
      React.createElement('circle', { cx: 8, cy: 18, r: 1.8 }),
      React.createElement('circle', { cx: 16, cy: 18, r: 1.8 }),
    )
  }

  function WgCheckIcon() {
    return React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: T.ink, strokeWidth: 2 }, React.createElement('path', { d: 'M5 12l5 5L20 7' }))
  }

  function WgUndoIcon() {
    return React.createElement('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, React.createElement('path', { d: 'M3 12a9 9 0 109-9 9H3m0 0l4-4m-4 4l4 4' }))
  }

  function WgTopbar() {
    return React.createElement(
      'header',
      { style: wgTopbarStyles.wrap },
      React.createElement('span', { style: wgTopbarStyles.title }, 'Warengruppen bearbeiten'),
      React.createElement('span', { style: wgTopbarStyles.pill }, 'Zuordnung'),
    )
  }

  function WgBackshopTopbar({ searchQuery, setSearchQuery }) {
    const I = w.WG_ICONS
    const searchIcon = I && I.Search18 ? React.createElement(I.Search18) : null
    const clearIcon = I && I.Clear18 ? React.createElement(I.Clear18) : null
    const q = searchQuery || ''
    return React.createElement(
      'header',
      { style: wgBackshopTopbarStyles.wrap },
      React.createElement(
        'div',
        { style: wgBackshopTopbarStyles.brandCol },
        React.createElement('p', { style: wgBackshopTopbarStyles.backshop }, 'BACKSHOP'),
        React.createElement('h1', { style: wgBackshopTopbarStyles.title }, 'Warengruppen'),
      ),
      React.createElement(
        'div',
        { style: wgBackshopTopbarStyles.searchWrap },
        React.createElement(
          'div',
          { style: wgBackshopSearchStyles.shell, role: 'search' },
          searchIcon,
          React.createElement('input', {
            type: 'search',
            'aria-label': 'Über alle Gruppen suchen',
            placeholder: 'Über alle Gruppen suchen …',
            value: q,
            style: wgBackshopSearchStyles.input,
            onChange: (e) => setSearchQuery(e.target.value),
          }),
          q
            ? React.createElement(
                'button',
                {
                  type: 'button',
                  style: wgBackshopSearchStyles.clearBtn,
                  onClick: () => setSearchQuery(''),
                  'aria-label': 'Suche zurücksetzen',
                },
                clearIcon,
              )
            : null,
        ),
      ),
    )
  }

  function groupLabel(groups, gid) {
    if (gid == null) return 'Ohne Zuordnung'
    const g = groups.find((x) => x.id === gid)
    return g ? g.name : '—'
  }

  w.WG_UI = {
    wgBackshopTopbarStyles,
    wgBackshopSearchStyles,
    wgTopbarStyles,
    wgSidebarStyles,
    wgCenterStyles,
    wgCardStyles,
    wgStatusStyles,
    wgToastStyles,
    wgEmptyStyles,
    wgStripePlate,
    WgTopbar,
    WgBackshopTopbar,
    WgGripIcon,
    WgCheckIcon,
    WgUndoIcon,
    groupLabel,
    T,
  }
})(window)
