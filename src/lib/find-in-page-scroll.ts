/**
 * Prüft, ob ein Element im Viewport-Layout sichtbar ist (nicht in display:none wie z. B. hidden md:block).
 */
function isDomElementVisible(el: HTMLElement): boolean {
  let cur: HTMLElement | null = el
  while (cur) {
    const s = window.getComputedStyle(cur)
    if (s.display === 'none' || s.visibility === 'hidden') return false
    cur = cur.parentElement
  }
  if (typeof el.checkVisibility === 'function') {
    try {
      return el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })
    } catch {
      /* ältere Browser */
    }
  }
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/**
 * Scrollt zur Zeile mit data-row-index. Mehrere Knoten (Desktop + mobile Liste) –
 * es wird die erste *sichtbare* Variante verwendet, damit auf dem Handy nicht die versteckte Tabelle scrollt.
 */
export function scrollToDataRowIndex(idx: number, options?: ScrollIntoViewOptions): void {
  const list = document.querySelectorAll<HTMLElement>(`[data-row-index="${idx}"]`)
  const merged: ScrollIntoViewOptions = {
    block: 'center',
    behavior: 'smooth',
    inline: 'nearest',
    ...options,
  }
  for (const el of list) {
    if (isDomElementVisible(el)) {
      el.scrollIntoView(merged)
      return
    }
  }
}
