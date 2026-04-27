/* global React */
;(function (w) {
  const { useState, useMemo, useCallback } = React
  const { WGProvider, useWG } = w.WGStore
  const { WgToastHost } = w.WGTablet
  const U = w.WG_UI
  const T = U.T

  function WgMobileSearchIcon() {
    return React.createElement(
      'svg',
      { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: T.ink, strokeWidth: 2, 'aria-hidden': true },
      React.createElement('circle', { cx: 11, cy: 11, r: 7 }),
      React.createElement('path', { d: 'M20 20l-3-3' }),
    )
  }

  const wgMobileStyles = {
    frame: {
      width: 402,
      height: 874,
      borderRadius: 44,
      background: '#111',
      padding: 10,
      boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
      position: 'relative',
    },
    inner: {
      width: '100%',
      height: '100%',
      borderRadius: 36,
      overflow: 'hidden',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    },
    island: {
      position: 'absolute',
      top: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 120,
      height: 34,
      borderRadius: 20,
      background: '#0a0a0a',
      zIndex: 20,
    },
    homeBar: {
      position: 'absolute',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 120,
      height: 4,
      borderRadius: 4,
      background: 'rgba(0,0,0,0.35)',
      zIndex: 20,
    },
    content: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 48, paddingBottom: 20 },
    h1: { fontSize: 22, fontWeight: 700, margin: '0 16px 12px', color: T.ink },
    search: {
      margin: '0 16px 12px',
      height: 44,
      borderRadius: T.radius10,
      border: `1px solid ${T.hairlineStrong}`,
      padding: '0 12px',
      fontSize: 15,
      fontFamily: T.fontUi,
      background: T.card,
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 16px', flex: 1, minHeight: 0, overflowY: 'auto', alignContent: 'start' },
    tileOhne: {
      margin: '0 16px 12px',
      padding: 14,
      borderRadius: T.radius12,
      border: `1px solid ${T.hairlineStrong}`,
      background: T.panel,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer',
      boxShadow: `inset 0 0 0 1px ${T.hairline}`,
    },
    tileGroup: {
      padding: 12,
      borderRadius: T.radius12,
      border: `1px solid ${T.hairlineStrong}`,
      background: T.panel,
      cursor: 'pointer',
      minHeight: 72,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    },
    plate36: {
      width: 36,
      height: 36,
      borderRadius: T.radius8,
      background: T.iconPlate,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700,
      color: T.muted,
      flexShrink: 0,
    },
    appBar: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderBottom: `1px solid ${T.hairlineStrong}`,
      background: T.panel,
      flexShrink: 0,
    },
    backBtn: {
      border: 'none',
      background: 'none',
      fontSize: 14,
      fontWeight: 600,
      color: T.accentInk,
      cursor: 'pointer',
      padding: '8px 4px',
      fontFamily: T.fontUi,
    },
    itemRow: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '12px 16px',
      borderBottom: `1px solid ${T.hairline}`,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      background: T.card,
    },
    chipBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '10px 12px 22px',
      background: T.panel,
      borderTop: `1px solid ${T.hairlineStrong}`,
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      zIndex: 15,
    },
    bulkActions: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '10px 12px 24px',
      background: T.panel,
      borderTop: `1px solid ${T.hairlineStrong}`,
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      zIndex: 18,
    },
    chip: {
      flexShrink: 0,
      padding: '8px 14px',
      borderRadius: T.pill,
      border: `1px solid ${T.hairlineStrong}`,
      background: T.accentBg,
      color: T.accentInk,
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
      fontFamily: T.fontUi,
    },
    sheetBackdrop: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.35)',
      zIndex: 25,
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '72%',
      background: T.panel,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      zIndex: 26,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
    },
    ctxSheet: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 100,
      background: T.card,
      borderRadius: T.radius12,
      padding: 16,
      zIndex: 26,
      border: `1px solid ${T.hairlineStrong}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    },
  }

  function WgMobileShell({ concept }) {
    const g = useWG()
    const {
      groups,
      items,
      selectedGroupId,
      setSelectedGroupId,
      bulkMode,
      setBulkMode,
      bulkIds,
      toggleBulkId,
      clearBulk,
      assignOne,
      assignMany,
    } = g

    const [view, setView] = useState('home')
    const [homeQ, setHomeQ] = useState('')
    const [detailSearch, setDetailSearch] = useState('')
    const [detailSearchOpen, setDetailSearchOpen] = useState(false)
    const [pickedId, setPickedId] = useState(null)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [ctxOpen, setCtxOpen] = useState(false)
    const [sheetQ, setSheetQ] = useState('')

    const counts = useMemo(() => {
      const m = new Map()
      m.set(null, 0)
      for (const gr of groups) if (gr.id != null) m.set(gr.id, 0)
      for (const it of items) m.set(it.groupId, (m.get(it.groupId) ?? 0) + 1)
      return m
    }, [items, groups])

    const filteredGroups = useMemo(() => {
      const list = groups.filter((gr) => gr.id != null)
      if (!homeQ.trim()) return list
      const n = homeQ.toLowerCase()
      return list.filter((gr) => (gr.name || '').toLowerCase().includes(n))
    }, [groups, homeQ])

    const detailItems = useMemo(() => {
      const inG = items.filter((it) => (selectedGroupId == null ? it.groupId == null : it.groupId === selectedGroupId))
      if (!detailSearch.trim()) return inG
      const n = detailSearch.toLowerCase()
      return inG.filter((it) => it.plu.includes(n) || (it.name || '').toLowerCase().includes(n))
    }, [items, selectedGroupId, detailSearch])

    const picked = useMemo(() => items.find((x) => x.id === pickedId) || null, [items, pickedId])

    const openGroup = useCallback(
      (gid) => {
        setSelectedGroupId(gid)
        setView('detail')
        setDetailSearch('')
        setDetailSearchOpen(false)
        clearBulk()
        setBulkMode(false)
      },
      [setSelectedGroupId, clearBulk, setBulkMode],
    )

    const backHome = useCallback(() => {
      setView('home')
      setPickedId(null)
      setSheetOpen(false)
      setCtxOpen(false)
      setDetailSearchOpen(false)
      setDetailSearch('')
      clearBulk()
      setBulkMode(false)
    }, [clearBulk, setBulkMode])

    const assignPicked = useCallback(
      (gid) => {
        if (!picked) return
        assignOne(picked.id, gid)
        setPickedId(null)
        setSheetOpen(false)
        setCtxOpen(false)
      },
      [picked, assignOne],
    )

    const onItemTap = useCallback(
      (it) => {
        if (bulkMode) {
          toggleBulkId(it.id)
          return
        }
        setPickedId(it.id)
        if (concept === 'A') return
        if (concept === 'B') {
          setSheetOpen(true)
          setSheetQ('')
          return
        }
        if (concept === 'C') {
          setCtxOpen(true)
          return
        }
      },
      [bulkMode, concept, toggleBulkId],
    )

    const sheetGroups = useMemo(() => {
      const list = [{ id: null, name: 'Ohne Zuordnung' }, ...groups.filter((gr) => gr.id != null)]
      if (!sheetQ.trim()) return list
      const n = sheetQ.toLowerCase()
      return list.filter((gr) => (gr.name || '').toLowerCase().includes(n))
    }, [groups, sheetQ])

    const renderHome = () =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement('h1', { style: wgMobileStyles.h1 }, 'Warengruppen'),
        React.createElement('input', {
          style: wgMobileStyles.search,
          placeholder: 'Suche nach Gruppe …',
          value: homeQ,
          onChange: (e) => setHomeQ(e.target.value),
        }),
        React.createElement(
          'button',
          {
            type: 'button',
            style: wgMobileStyles.tileOhne,
            onClick: () => openGroup(null),
          },
          React.createElement('div', { style: { ...wgMobileStyles.plate36, ...U.wgStripePlate } }),
          React.createElement(
            'div',
            { style: { flex: 1, textAlign: 'left' } },
            React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: T.ink } }, 'Ohne Zuordnung'),
            React.createElement('div', { style: { fontSize: 12, color: T.muted, marginTop: 4, className: 'wgTabular' } }, `${counts.get(null) ?? 0} Artikel`),
          ),
        ),
        React.createElement(
          'div',
          { style: wgMobileStyles.grid2 },
          filteredGroups.map((gr) =>
            React.createElement(
              'button',
              {
                key: gr.id,
                type: 'button',
                style: wgMobileStyles.tileGroup,
                onClick: () => openGroup(gr.id),
              },
              React.createElement('div', { style: wgMobileStyles.plate36 }, (gr.name || '').charAt(0).toUpperCase()),
              React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: T.ink, textAlign: 'left' } }, gr.name),
              React.createElement('div', { style: { fontSize: 11, color: T.muted, className: 'wgTabular' } }, counts.get(gr.id) ?? 0),
            ),
          ),
        ),
      )

    const renderDetail = () =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'div',
          { style: wgMobileStyles.appBar },
          React.createElement(
            'button',
            { type: 'button', style: wgMobileStyles.backBtn, onClick: backHome },
            '‹ Zurück',
          ),
          React.createElement('div', { style: { flex: 1, fontSize: 15, fontWeight: 600, textAlign: 'center', paddingRight: 24 } }, U.groupLabel(groups, selectedGroupId)),
          React.createElement(
            'button',
            {
              type: 'button',
              style: { ...wgMobileStyles.backBtn, padding: 8 },
              onClick: () => {
                setBulkMode((v) => !v)
                clearBulk()
              },
            },
            bulkMode ? 'Fertig' : 'Mehrfach',
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              style: { ...wgMobileStyles.backBtn, padding: 8 },
              onClick: () => setDetailSearchOpen((v) => !v),
            },
            React.createElement(WgMobileSearchIcon),
          ),
        ),
        detailSearchOpen
          ? React.createElement('input', {
              style: { ...wgMobileStyles.search, margin: '0 12px 8px' },
              placeholder: 'PLU oder Name …',
              value: detailSearch,
              onChange: (e) => setDetailSearch(e.target.value),
            })
          : null,
        React.createElement(
          'div',
          { style: { flex: 1, minHeight: 0, overflowY: 'auto', width: '100%' } },
          detailItems.length === 0
            ? React.createElement(
                'div',
                { style: { ...U.wgEmptyStyles.wrap, padding: 32 } },
                React.createElement('div', { style: U.wgEmptyStyles.title }, selectedGroupId == null ? 'Alles einsortiert' : 'Keine Artikel'),
                React.createElement('div', { style: U.wgEmptyStyles.text }, 'Passe die Suche an oder wechsle die Gruppe.'),
              )
            : detailItems.map((it) =>
                React.createElement(
                  'div',
                  {
                    key: it.id,
                    style: {
                      ...wgMobileStyles.itemRow,
                      border: bulkIds.has(it.id) ? `2px solid ${T.accent}` : undefined,
                    },
                    onClick: () => onItemTap(it),
                  },
                  bulkMode
                    ? React.createElement('input', {
                        type: 'checkbox',
                        checked: bulkIds.has(it.id),
                        onChange: () => toggleBulkId(it.id),
                        style: { width: 22, height: 22, accentColor: T.accent },
                        onClick: (e) => e.stopPropagation(),
                      })
                    : null,
                  React.createElement(
                    'div',
                    { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { className: 'wgTabular', style: { fontSize: 12, fontWeight: 600, color: T.muted } }, it.plu),
                    React.createElement('div', { style: { fontSize: 14, fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, it.name),
                  ),
                ),
              ),
        ),
      )

    const chipTargets = useMemo(() => [{ id: null, name: 'Ohne' }, ...groups.filter((gr) => gr.id != null)], [groups])

    const activeGroupName = selectedGroupId == null ? 'Ohne Zuordnung' : groups.find((x) => x.id === selectedGroupId)?.name ?? '—'

    const bulkAssignCurrent = useCallback(() => {
      const ids = Array.from(bulkIds)
      if (!ids.length) return
      assignMany(ids, selectedGroupId == null ? null : selectedGroupId)
    }, [bulkIds, assignMany, selectedGroupId])

    const bulkToOhne = useCallback(() => {
      const ids = Array.from(bulkIds)
      if (!ids.length) return
      assignMany(ids, null)
    }, [bulkIds, assignMany])

    const renderConceptA = () =>
      picked && !bulkMode
        ? React.createElement(
            'div',
            { style: wgMobileStyles.chipBar },
            chipTargets.map((gr) =>
              React.createElement(
                'button',
                {
                  type: 'button',
                  key: gr.id == null ? 'none' : gr.id,
                  style: wgMobileStyles.chip,
                  onClick: () => assignPicked(gr.id),
                },
                gr.name,
              ),
            ),
          )
        : null

    const renderSheetB = () =>
      sheetOpen && picked
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('div', {
              style: wgMobileStyles.sheetBackdrop,
              onClick: () => {
                setSheetOpen(false)
                setPickedId(null)
              },
            }),
            React.createElement(
              'div',
              { style: wgMobileStyles.sheet },
              React.createElement('div', { style: { padding: '12px 16px', fontWeight: 700, fontSize: 16 } }, 'Gruppe wählen'),
              React.createElement('div', { style: { fontSize: 12, color: T.muted, padding: '0 16px 8px' } }, picked.name),
              React.createElement('input', {
                style: { ...wgMobileStyles.search, margin: '0 16px 8px' },
                placeholder: 'Gruppe suchen …',
                value: sheetQ,
                onChange: (e) => setSheetQ(e.target.value),
              }),
              React.createElement(
                'div',
                { style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px 12px' } },
                sheetGroups.map((gr) => {
                  const active = (picked.groupId == null && gr.id == null) || gr.id === picked.groupId
                  return React.createElement(
                    'button',
                    {
                      type: 'button',
                      key: gr.id == null ? 'none' : gr.id,
                      onClick: () => assignPicked(gr.id),
                      style: {
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 10px',
                        marginBottom: 6,
                        borderRadius: T.radius10,
                        border: `1px solid ${T.hairlineStrong}`,
                        background: active ? T.accentBg : T.card,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: T.fontUi,
                      },
                    },
                    React.createElement(
                      'div',
                      {
                        style: {
                          ...wgMobileStyles.plate36,
                          background: active ? T.accentBg : T.iconPlate,
                        },
                      },
                      gr.id == null ? '—' : (gr.name || '').charAt(0).toUpperCase(),
                    ),
                    React.createElement('span', { style: { fontSize: 14, fontWeight: 600, color: T.ink } }, gr.name),
                  )
                }),
              ),
            ),
          )
        : null

    const renderConceptC = () =>
      ctxOpen && picked
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement('div', {
              style: wgMobileStyles.sheetBackdrop,
              onClick: () => {
                setCtxOpen(false)
                setPickedId(null)
              },
            }),
            React.createElement(
              'div',
              { style: wgMobileStyles.ctxSheet },
              React.createElement('div', { style: { fontSize: 15, fontWeight: 700 } }, 'Artikel zuordnen'),
              React.createElement('div', { style: { fontSize: 13, color: T.muted, marginTop: 6 } }, picked.name),
              React.createElement(
                'button',
                {
                  type: 'button',
                  style: { ...wgMobileStyles.chip, width: '100%', marginTop: 12, textAlign: 'center' },
                  onClick: () => {
                    setCtxOpen(false)
                    setSheetOpen(true)
                    setSheetQ('')
                  },
                },
                'In andere Warengruppe verschieben',
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  style: {
                    width: '100%',
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: T.radius10,
                    border: `1px solid ${T.hairlineStrong}`,
                    background: T.bg,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: T.fontUi,
                    color: T.ink,
                  },
                  onClick: () => {
                    assignPicked(null)
                    setCtxOpen(false)
                  },
                },
                "Zu ‚Ohne Zuordnung' verschieben",
              ),
            ),
          )
        : null

    return React.createElement(
      'div',
      { style: wgMobileStyles.frame },
      React.createElement('div', { style: wgMobileStyles.island }),
      React.createElement('div', { style: wgMobileStyles.homeBar }),
      React.createElement(
        'div',
        { style: wgMobileStyles.inner },
        React.createElement(WgToastHost),
        React.createElement('div', { style: wgMobileStyles.content }, view === 'home' ? renderHome() : renderDetail()),
        view === 'detail' && bulkMode
          ? React.createElement(
              'div',
              { style: wgMobileStyles.bulkActions },
              React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: T.ink } }, `${bulkIds.size} ausgewählt`),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: bulkAssignCurrent,
                  disabled: !bulkIds.size,
                  style: {
                    ...wgMobileStyles.chip,
                    opacity: bulkIds.size ? 1 : 0.45,
                    cursor: bulkIds.size ? 'pointer' : 'not-allowed',
                  },
                },
                `→ ${activeGroupName}`,
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: bulkToOhne,
                  disabled: !bulkIds.size,
                  style: {
                    padding: '8px 12px',
                    borderRadius: T.radius10,
                    border: `1px solid ${T.hairlineStrong}`,
                    background: T.card,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: bulkIds.size ? 'pointer' : 'not-allowed',
                    opacity: bulkIds.size ? 1 : 0.45,
                    fontFamily: T.fontUi,
                  },
                },
                'Ohne Zuordnung',
              ),
            )
          : null,
        view === 'detail' && concept === 'A' ? renderConceptA() : null,
        view === 'detail' && concept === 'B' ? renderSheetB() : null,
        view === 'detail' && concept === 'C' ? (ctxOpen ? renderConceptC() : null) : null,
        view === 'detail' && concept === 'C' && sheetOpen ? renderSheetB() : null,
      ),
    )
  }

  function WgMobileArtboard({ concept }) {
    return React.createElement(WGProvider, { key: concept }, React.createElement(WgMobileShell, { concept }))
  }

  w.WGMobile = { WgMobileArtboard, WgMobileShell }
})(window)
