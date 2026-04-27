/* global React */
;(function (w) {
  const { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } = React

  const WGStateCtx = createContext(null)

  function cloneItems(src) {
    return src.map((it) => ({ ...it }))
  }

  function WGProvider({ children }) {
    const seed = w.WG_DATA
    const [items, setItems] = useState(() => cloneItems(seed.items))
    const [selectedGroupId, setSelectedGroupId] = useState('brot')
    const [bulkMode, setBulkMode] = useState(false)
    const [bulkIds, setBulkIds] = useState(() => new Set())
    const [drag, setDrag] = useState(null)
    const [dropHoverId, setDropHoverId] = useState(null)
    const [toast, setToast] = useState(null)
    const toastTimer = useRef(null)
    const [recent, setRecent] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    const groups = seed.groups

    const pushRecent = useCallback((entry) => {
      setRecent((r) => [entry, ...r].slice(0, 12))
    }, [])

    const clearToastTimer = useCallback(() => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
        toastTimer.current = null
      }
    }, [])

    const showToast = useCallback(
      (message, undoFn) => {
        clearToastTimer()
        const id = String(Date.now())
        setToast({ id, message, undoFn })
        toastTimer.current = setTimeout(() => {
          setToast(null)
          toastTimer.current = null
        }, 5000)
      },
      [clearToastTimer],
    )

    const dismissToast = useCallback(() => {
      clearToastTimer()
      setToast(null)
    }, [clearToastTimer])

    const assignOne = useCallback(
      (itemId, newGroupId, opts) => {
        const silent = opts && opts.silent
        let snap = null
        setItems((prevItems) => {
          const it = prevItems.find((x) => x.id === itemId)
          if (!it || it.groupId === newGroupId) return prevItems
          snap = { prev: it.groupId, plu: it.plu, name: it.name }
          return prevItems.map((x) => (x.id === itemId ? { ...x, groupId: newGroupId } : x))
        })
        if (silent) return
        if (!snap) return
        pushRecent({
          id: String(Date.now()),
          at: Date.now(),
          itemId,
          plu: snap.plu,
          name: snap.name,
          fromG: snap.prev,
          toG: newGroupId,
        })
        const prevG = snap.prev
        const undo = () => {
          setItems((prevItems) => prevItems.map((x) => (x.id === itemId ? { ...x, groupId: prevG } : x)))
          dismissToast()
        }
        showToast('Zuordnung geändert.', undo)
      },
      [pushRecent, showToast, dismissToast],
    )

    useEffect(() => () => clearToastTimer(), [clearToastTimer])

    const centerVisibleItems = useMemo(() => {
      const inGroup = items.filter((it) =>
        selectedGroupId == null ? it.groupId == null : it.groupId === selectedGroupId,
      )
      const q = searchQuery.trim().toLowerCase()
      if (!q) return inGroup
      return inGroup.filter((it) => {
        const plu = String(it.plu || '').toLowerCase()
        const name = String(it.name || '').toLowerCase()
        return plu.includes(q) || name.includes(q)
      })
    }, [items, selectedGroupId, searchQuery])

    const assignMany = useCallback(
      (itemIds, newGroupId) => {
        const snapshots = []
        setItems((prevItems) =>
          prevItems.map((it) => {
            if (itemIds.includes(it.id)) {
              snapshots.push({ id: it.id, prev: it.groupId })
              return { ...it, groupId: newGroupId }
            }
            return it
          }),
        )
        const undo = () => {
          setItems((prevItems) =>
            prevItems.map((it) => {
              const s = snapshots.find((x) => x.id === it.id)
              return s ? { ...it, groupId: s.prev } : it
            }),
          )
          dismissToast()
        }
        if (itemIds.length) showToast(`${itemIds.length} Artikel neu zugeordnet.`, undo)
        setBulkIds(new Set())
      },
      [showToast, dismissToast],
    )

    const value = useMemo(
      () => ({
        groups,
        items,
        setItems,
        searchQuery,
        setSearchQuery,
        centerVisibleItems,
        selectedGroupId,
        setSelectedGroupId,
        bulkMode,
        setBulkMode,
        bulkIds,
        setBulkIds,
        toggleBulkId: (id) => {
          setBulkIds((prev) => {
            const n = new Set(prev)
            if (n.has(id)) n.delete(id)
            else n.add(id)
            return n
          })
        },
        clearBulk: () => setBulkIds(new Set()),
        drag,
        setDrag,
        dropHoverId,
        setDropHoverId,
        toast,
        dismissToast,
        recent,
        assignOne,
        assignMany,
      }),
      [
        groups,
        items,
        searchQuery,
        centerVisibleItems,
        selectedGroupId,
        bulkMode,
        bulkIds,
        drag,
        dropHoverId,
        toast,
        recent,
        assignOne,
        assignMany,
        dismissToast,
        setSearchQuery,
      ],
    )

    return React.createElement(WGStateCtx.Provider, { value }, children)
  }

  function useWG() {
    const v = useContext(WGStateCtx)
    if (!v) throw new Error('useWG outside WGProvider')
    return v
  }

  w.WGStore = { WGProvider, useWG }
})(window)
