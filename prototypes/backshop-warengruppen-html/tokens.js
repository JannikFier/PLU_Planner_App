/**
 * Design-Tokens (exakt laut Spez) + globale Basis-CSS
 */
;(function (w) {
  const WG_TOKENS = {
    bg: '#F6F3EC',
    panel: '#FBFAF6',
    card: '#FFFFFF',
    ink: '#151412',
    muted: '#77716A',
    hairline: '#ECE7DD',
    hairlineStrong: '#E2DCD0',
    iconPlate: '#F2EDE3',
    statOhneBg: '#FFF5DF',
    accent: 'oklch(0.60 0.13 52)',
    accentBg: 'oklch(0.95 0.035 62)',
    accentInk: 'oklch(0.42 0.12 50)',
    toastBg: '#151412',
    toastInk: '#FBFAF6',
    radius8: 8,
    radius10: 10,
    radius12: 12,
    radius14: 14,
    pill: 999,
    touchMin: 44,
    sidebarW: 208,
    statusW: 300,
    productCardImgH: 156,
    productCardImgHCompact: 108,
    fontUi: '"Inter Tight", system-ui, sans-serif',
    fontMono: '"IBM Plex Mono", ui-monospace, monospace',
  }

  function wgInjectGlobalStyles() {
    if (document.getElementById('wg-proto-styles')) return
    const el = document.createElement('style')
    el.id = 'wg-proto-styles'
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; height: 100%; background: ${WG_TOKENS.bg}; color: ${WG_TOKENS.ink}; font-family: ${WG_TOKENS.fontUi}; font-size: 15px; }
      .wgTabular { font-family: ${WG_TOKENS.fontMono}; font-variant-numeric: tabular-nums; }
    `
    document.head.appendChild(el)
  }

  /** Inline-SVG-Icons (React-Elemente), nach React-Ladereihenfolge nutzbar */
  function wgRegisterProtoIcons() {
    const R = w.React
    if (!R || w.WG_ICONS) return
    const { createElement: h } = R
    const stroke = WG_TOKENS.ink
    const muted = WG_TOKENS.muted
    w.WG_ICONS = {
      Search18: (props) =>
        h(
          'svg',
          { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: muted, strokeWidth: 2, 'aria-hidden': true, ...props },
          h('circle', { cx: 11, cy: 11, r: 7 }),
          h('path', { d: 'M20 20l-3-3' }),
        ),
      Clear18: (props) =>
        h(
          'svg',
          { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: muted, strokeWidth: 2, 'aria-hidden': true, ...props },
          h('path', { d: 'M6 6l12 12M18 6L6 18' }),
        ),
      SearchTile40: (props) =>
        h(
          'svg',
          { width: 40, height: 40, viewBox: '0 0 24 24', fill: 'none', stroke: muted, strokeWidth: 1.6, 'aria-hidden': true, ...props },
          h('circle', { cx: 10, cy: 10, r: 6 }),
          h('path', { d: 'M20 20l-4-4' }),
        ),
    }
  }

  w.WG_TOKENS = WG_TOKENS
  w.wgInjectGlobalStyles = wgInjectGlobalStyles
  w.wgRegisterProtoIcons = wgRegisterProtoIcons
})(window)
