/** Vorschau-Miniatur im Upload-Assistenten (eigenes Modul, nur dieses exportiert). */
export function BackshopThumbnail({ src, size = 48 }: { src: string | null | undefined; size?: number }) {
  const cls = `object-contain rounded border border-border bg-muted`
  if (!src) {
    return (
      <div
        className={cls + ' flex items-center justify-center text-muted-foreground text-xs'}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        title="Kein Bild"
      >
        –
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className={cls}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      loading="lazy"
      decoding="async"
    />
  )
}
