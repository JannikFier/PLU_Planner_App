/* global React */
;(function (w) {
  const { useState, useEffect, useCallback, useMemo, useRef } = React
  const { WGProvider, useWG } = w.WGStore
  const U = w.WG_UI
  const T = U.T

  function parseDropId(s) {
    if (s === 'none' || s == null) return null
    return s
  }

  function WgToastHost() {
    const { toast, dismissToast } = useWG()
    if (!toast) return null
    return React.createElement(
      'div',
      { style: U.wgToastStyles.wrap, role: 'status' },
      React.createElement('span', { style: { fontSize: 13 } }, toast.message),
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        toast.undoFn
          ? React.createElement(
              'button',
              { type: 'button', style: U.wgToastStyles.undo, onClick: toast.undoFn },
              'Rückgängig',
            )
          : null,
        React.createElement('button', { type: 'button', style: U.wgToastStyles.close, onClick: dismissToast, 'aria-label': 'Schließen' }, '×'),
      ),
    )
  }

  function WgEmbeddedWorkbench(props) {
    const variant = (props && props.variant) || 'threeCol'
    const isCompact = variant === 'twoColNoStatus'
    const g = useWG()
    const {
      groups,
      items,
      searchQuery,
      setSearchQuery,
      centerVisibleItems,
      selectedGroupId,
      setSelectedGroupId,
      bulkMode,
      setBulkMode,
      bulkIds,
      toggleBulkId,
      clearBulk,
      drag,
      setDrag,
      dropHoverId,
      setDropHoverId,
      assignOne,
      assignMany,
      recent,
    } = g

    const sortedRestGroups = useMemo(
      () => [...groups].filter((gr) => gr.id != null).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de')),
      [groups],
    )

    const inGroupCount = useMemo(() => {
      return items.filter((it) => (selectedGroupId == null ? it.groupId == null : it.groupId === selectedGroupId)).length
    }, [items, selectedGroupId])

    const counts = useMemo(() => {
      const m = new Map()
      m.set(null, 0)
      for (const gr of groups) {
        if (gr.id != null) m.set(gr.id, 0)
      }
      for (const it of items) {
        const k = it.groupId
        m.set(k, (m.get(k) ?? 0) + 1)
      }
      return m
    }, [items, groups])

    const ohneN = counts.get(null) ?? 0
    const totalN = items.length
    const zugeordnetN = Math.max(0, totalN - ohneN)

    const assignOneRef = useRef(assignOne)
    assignOneRef.current = assignOne

    useEffect(() => {
      if (!drag) return
      const move = (e) => {
        setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null))
        const stack = document.elementsFromPoint(e.clientX, e.clientY)
        let hit = null
        for (const el of stack) {
          if (el.dataset && el.dataset.wgDrop != null) {
            hit = el.dataset.wgDrop
            break
          }
        }
        setDropHoverId(hit)
      }
      const up = (e) => {
        const stack = document.elementsFromPoint(e.clientX, e.clientY)
        let hit = null
        for (const el of stack) {
          if (el.dataset && el.dataset.wgDrop != null) {
            hit = el.dataset.wgDrop
            break
          }
        }
        setDrag((d) => {
          if (d && hit != null) assignOneRef.current(d.itemId, parseDropId(hit))
          return null
        })
        setDropHoverId(null)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      return () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
    }, [drag, setDrag, setDropHoverId])

    const activeGroupName = selectedGroupId == null ? 'Ohne Zuordnung' : groups.find((x) => x.id === selectedGroupId)?.name ?? '—'

    const bulkAssignTarget = () => {
      const ids = Array.from(bulkIds)
      if (!ids.length) return
      assignMany(ids, selectedGroupId == null ? null : selectedGroupId)
    }

    const bulkToOhne = () => {
      const ids = Array.from(bulkIds)
      if (!ids.length) return
      assignMany(ids, null)
    }

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(WgToastHost),
      drag
        ? React.createElement(
            'div',
            {
              style: {
                position: 'fixed',
                left: drag.x + 12,
                top: drag.y + 12,
                zIndex: 99998,
                pointerEvents: 'none',
                background: T.ink,
                color: T.toastInk,
                padding: '10px 14px',
                borderRadius: T.radius14,
                fontSize: 13,
                fontWeight: 600,
                maxWidth: 280,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            },
            drag.name,
          )
        : null,
      React.createElement(U.WgBackshopTopbar, { searchQuery, setSearchQuery }),
      React.createElement(
        'div',
        { style: { display: 'flex', flex: 1, minHeight: 0, background: T.bg } },
        React.createElement(
          'aside',
          { style: U.wgSidebarStyles.wrap },
          React.createElement('h2', { style: U.wgSidebarStyles.h }, 'WARENGRUPPEN'),
          React.createElement(
            'div',
            { style: U.wgSidebarStyles.list },
            (() => {
              const stOhne = U.wgSidebarRowStyles(selectedGroupId == null, dropHoverId === 'none')
              return React.createElement(
                'div',
                {
                  'data-wg-drop': 'none',
                  style: stOhne.row,
                  onClick: () => setSelectedGroupId(null),
                },
                React.createElement(
                  'div',
                  { style: stOhne.nameRow },
                  React.createElement('div', { style: { ...stOhne.plate, ...U.wgStripePlate } }),
                  React.createElement('span', { style: stOhne.name }, 'Ohne Zuordnung'),
                ),
                React.createElement('span', { style: stOhne.count, className: 'wgTabular' }, counts.get(null) ?? 0),
              )
            })(),
            React.createElement('div', { style: U.wgSidebarStyles.sep }),
            sortedRestGroups.map((gr) => {
                const active = selectedGroupId === gr.id
                const dh = dropHoverId === gr.id
                const st = U.wgSidebarRowStyles(active, dh)
                return React.createElement(
                  'div',
                  {
                    key: gr.id,
                    'data-wg-drop': gr.id,
                    style: st.row,
                    onClick: () => setSelectedGroupId(gr.id),
                  },
                  React.createElement(
                    'div',
                    { style: st.nameRow },
                    React.createElement('div', { style: st.plate }, (gr.name || '').charAt(0).toUpperCase()),
                    React.createElement('span', { style: st.name }, gr.name),
                  ),
                  React.createElement('span', { style: st.count, className: 'wgTabular' }, counts.get(gr.id) ?? 0),
                )
              }),
          ),
        ),
        React.createElement(
          'section',
          { style: { ...U.wgCenterStyles.wrap, ...(isCompact ? { borderRight: 'none' } : {}) } },
          React.createElement(
            'div',
            { style: { ...U.wgCenterStyles.head, ...U.wgCenterStyles.headWithRule } },
            React.createElement(
              'div',
              { style: U.wgCenterStyles.headRow },
              React.createElement(
                'div',
                null,
                React.createElement('p', { style: U.wgCenterStyles.cap }, activeGroupName.toUpperCase()),
                React.createElement(
                  'p',
                  { style: U.wgCenterStyles.count, className: 'wgTabular' },
                  `${inGroupCount} Artikel`,
                ),
                React.createElement('p', { style: U.wgCenterStyles.hint }, 'Artikel ziehen oder antippen für Auswahl'),
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    setBulkMode((v) => !v)
                    clearBulk()
                  },
                  style: {
                    minHeight: T.touchMin,
                    padding: '0 14px',
                    borderRadius: T.pill,
                    border: `1px solid ${T.hairlineStrong}`,
                    background: bulkMode ? T.accentBg : 'transparent',
                    color: T.ink,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: T.fontUi,
                  },
                },
                React.createElement(U.WgCheckIcon),
                ' Mehrfachauswahl',
              ),
            ),
            bulkMode
              ? React.createElement(
                  'div',
                  { style: { ...U.wgCenterStyles.bulkBar, flexDirection: 'column', alignItems: 'stretch', gap: 6 } },
                  React.createElement(
                    'div',
                    { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 } },
                    React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: T.ink } }, `${bulkIds.size} ausgewählt`),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: bulkAssignTarget,
                        disabled: !bulkIds.size,
                        style: {
                          minHeight: T.touchMin,
                          padding: '0 16px',
                          borderRadius: T.radius10,
                          border: 'none',
                          background: T.accentBg,
                          color: T.accentInk,
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: bulkIds.size ? 'pointer' : 'not-allowed',
                          opacity: bulkIds.size ? 1 : 0.45,
                          fontFamily: T.fontUi,
                        },
                      },
                      `Auswahl → ${activeGroupName} zuweisen`,
                    ),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: bulkToOhne,
                        disabled: !bulkIds.size,
                        style: {
                          minHeight: T.touchMin,
                          padding: '0 16px',
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
                      "Zu ‚Ohne Zuordnung' verschieben",
                    ),
                  ),
                  React.createElement('p', { style: { fontSize: 12, color: T.muted, margin: 0 } }, 'oder auf Gruppe links ziehen'),
                )
              : null,
          ),
          React.createElement(
            'div',
            { style: isCompact ? U.wgCenterStyles.gridTwoCol : U.wgCenterStyles.grid },
            (() => {
              const I = window.WG_ICONS
              const emptySearch = inGroupCount > 0 && centerVisibleItems.length === 0 && (searchQuery || '').trim()
              if (inGroupCount === 0 && !emptySearch) {
                return React.createElement(
                  'div',
                  { style: { ...U.wgEmptyStyles.wrap, gridColumn: '1 / -1' } },
                  React.createElement(
                    'div',
                    { style: U.wgEmptyStyles.groupLupenTile },
                    I && I.SearchTile40 ? React.createElement(I.SearchTile40) : null,
                  ),
                  React.createElement(
                    'div',
                    { style: U.wgEmptyStyles.title },
                    selectedGroupId == null ? 'Alles einsortiert' : 'Noch keine Artikel',
                  ),
                  React.createElement(
                    'div',
                    { style: U.wgEmptyStyles.text },
                    selectedGroupId == null
                      ? 'Alle Artikel sind einer Warengruppe zugeordnet. Neue Artikel erscheinen hier.'
                      : 'Sobald Artikel dieser Gruppe vorliegen, erscheinen sie hier. Sie können auch die Suche in der Topbar nutzen.',
                  ),
                )
              }
              if (emptySearch) {
                return React.createElement(
                  'div',
                  { style: { ...U.wgEmptyStyles.wrap, gridColumn: '1 / -1' } },
                  React.createElement(
                    'div',
                    { style: U.wgEmptyStyles.groupLupenTile },
                    I && I.SearchTile40 ? React.createElement(I.SearchTile40) : null,
                  ),
                  React.createElement('div', { style: U.wgEmptyStyles.title }, 'Keine Treffer'),
                  React.createElement(
                    'div',
                    { style: U.wgEmptyStyles.text },
                    'Passe die Suche an oder setze sie mit dem X zurück.',
                  ),
                )
              }
              return centerVisibleItems.map((it) => {
                  const checked = bulkIds.has(it.id)
                  const st = U.wgCardStyles(checked, { compact: isCompact, layout: 'hero' })
                  const dragging = drag && drag.itemId === it.id
                  return React.createElement(
                    'div',
                    { key: it.id, style: { ...st.card, opacity: dragging ? 0.35 : 1 } },
                    React.createElement('div', { style: st.img }, 'BILD'),
                    React.createElement(
                      'div',
                      { style: st.pluRow },
                      React.createElement('span', { style: st.plu, className: 'wgTabular' }, it.plu),
                      it.groupId == null ? React.createElement('span', { style: st.badge }, 'Ohne') : null,
                    ),
                    React.createElement('div', { style: st.name }, it.name),
                    bulkMode
                      ? React.createElement('input', {
                          type: 'checkbox',
                          checked,
                          onChange: () => toggleBulkId(it.id),
                          style: st.cb,
                        })
                      : null,
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        style: st.grip,
                        onPointerDown: (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDrag({ itemId: it.id, name: it.name, x: e.clientX, y: e.clientY })
                        },
                        'aria-label': 'Ziehen zum Zuordnen',
                      },
                      React.createElement(U.WgGripIcon),
                    ),
                  )
                })
            })(),
          ),
        ),
        variant === 'threeCol'
          ? React.createElement(
              'aside',
              { style: U.wgStatusStyles.wrap },
              React.createElement('h2', { style: U.wgStatusStyles.h }, 'STATUS'),
              React.createElement('p', { style: U.wgStatusStyles.sub }, 'Übersicht'),
              React.createElement(
            'div',
            { style: U.wgStatusStyles.stack },
            React.createElement(
              'div',
              { style: U.wgStatusStyles.stat(ohneN > 0) },
              React.createElement('div', null, React.createElement('div', { style: U.wgStatusStyles.statLabel }, 'Ohne Zuordnung')),
              React.createElement('div', { style: { ...U.wgStatusStyles.statNum, className: 'wgTabular' } }, ohneN),
            ),
            React.createElement(
              'div',
              { style: U.wgStatusStyles.stat(false) },
              React.createElement('div', null, React.createElement('div', { style: U.wgStatusStyles.statLabel }, 'Zugeordnet')),
              React.createElement('div', { style: { ...U.wgStatusStyles.statNum, className: 'wgTabular' } }, zugeordnetN),
            ),
            React.createElement(
              'div',
              { style: U.wgStatusStyles.stat(false) },
              React.createElement('div', null, React.createElement('div', { style: U.wgStatusStyles.statLabel }, 'Artikel gesamt')),
              React.createElement('div', { style: { ...U.wgStatusStyles.statNum, className: 'wgTabular' } }, totalN),
            ),
          ),
          React.createElement('h2', { style: { ...U.wgStatusStyles.h, paddingTop: 4 } }, 'ZULETZT GEÄNDERT'),
          React.createElement(
            'div',
            { style: U.wgStatusStyles.recent },
            recent.length === 0
              ? React.createElement('p', { style: { fontSize: 12, color: T.muted, padding: '0 4px' } }, 'Noch keine Änderungen in dieser Sitzung.')
              : recent.map((r) =>
                  React.createElement(
                    'div',
                    { key: r.id, style: U.wgStatusStyles.mini },
                    React.createElement('div', { className: 'wgTabular', style: { fontSize: 12, fontWeight: 600, color: T.ink } }, r.plu),
                    React.createElement('div', { style: { fontSize: 13, fontWeight: 600, marginTop: 4 } }, r.name),
                    React.createElement(
                      'div',
                      { style: { fontSize: 11, color: T.muted, marginTop: 4 } },
                      `${U.groupLabel(groups, r.fromG)} → ${U.groupLabel(groups, r.toG)}`,
                    ),
                    React.createElement(
                      'button',
                      {
                        type: 'button',
                        style: { marginTop: 8, fontSize: 12, fontWeight: 600, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 },
                        onClick: () => assignOne(r.itemId, r.fromG, { silent: true }),
                      },
                      React.createElement(U.WgUndoIcon),
                      ' Rückgängig',
                    ),
                  )
                )
              )
          )
          : null
      ),
    )
  }

  function WgMacWindow({ title, children, w, h }) {
    return React.createElement(
      'div',
      {
        style: {
          width: w,
          height: h,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(21,20,18,0.06)',
          border: `1px solid ${T.hairlineStrong}`,
          display: 'flex',
          flexDirection: 'column',
          background: T.panel,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            height: 36,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            background: '#E8E8E8',
            borderBottom: '1px solid #ccc',
          },
        },
        React.createElement('span', { style: { width: 10, height: 10, borderRadius: 999, background: '#ff5f57' } }),
        React.createElement('span', { style: { width: 10, height: 10, borderRadius: 999, background: '#febc2e' } }),
        React.createElement('span', { style: { width: 10, height: 10, borderRadius: 999, background: '#28c840' } }),
        React.createElement('span', { style: { flex: 1, textAlign: 'center', fontSize: 12, color: '#444', fontWeight: 500 } }, title),
      ),
      React.createElement('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }, children),
    )
  }

  function WgTabletBezel({ w, h, children }) {
    return React.createElement(
      'div',
      {
        style: {
          width: w + 24,
          padding: 12,
          borderRadius: 20,
          background: '#1a1a1a',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: w,
            height: h,
            borderRadius: 12,
            overflow: 'hidden',
            background: T.bg,
            display: 'flex',
            flexDirection: 'column',
          },
        },
        children,
      ),
    )
  }

  w.WGTablet = { WgEmbeddedWorkbench, WgMacWindow, WgTabletBezel, WgToastHost }
})(window)
