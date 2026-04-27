// Find-in-Page-Leiste: unter Header fixiert; bei Tastatur (visualViewport) am sichtbaren oberen Rand

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function FindInPageFixedPortal({ children }: { children: ReactNode }) {
  const [topPx, setTopPx] = useState(64)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const HEADER = 64
    const sync = () => {
      setTopPx(Math.max(HEADER, Math.round(vv.offsetTop) + 8))
    }
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    sync()
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      data-tour="plu-find-in-page-bar"
      className="fixed left-0 right-0 z-[45] pointer-events-none"
      style={{ top: topPx }}
    >
      {/* links wie Hauptinhalt (max-w-7xl), nicht mittig – kein mx-auto auf der Karte */}
      <div className="mx-auto flex max-w-7xl justify-start px-2 pt-1 sm:px-6 sm:pt-2 pointer-events-auto">
        <div className="w-full max-w-[min(100%,300px)] rounded-lg border border-border bg-background/95 p-2 shadow-lg backdrop-blur-sm sm:max-w-[min(100%,420px)] sm:p-3">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
