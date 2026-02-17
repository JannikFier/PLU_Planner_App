/** Prüft, ob ein Fehler ein AbortError ist (Browser oder Supabase). Inkl. cause-Kette. */
export function isAbortError(err: unknown): boolean {
  if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')) {
    return true
  }
  const o = err as { message?: string; cause?: unknown }
  return (
    !!o?.message?.includes?.('AbortError') ||
    (o?.cause != null && isAbortError(o.cause))
  )
}
