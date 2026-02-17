interface ExcelPreviewBoxProps {
  variant: 'error' | 'warning'
  children: React.ReactNode
}

export function ExcelPreviewBox({ variant, children }: ExcelPreviewBoxProps) {
  const className =
    variant === 'error'
      ? 'rounded-lg border px-4 py-3 text-sm border-destructive/30 bg-destructive/5 text-destructive'
      : 'rounded-lg border px-4 py-3 text-sm border-amber-200 bg-amber-50 text-amber-800'
  return <div className={className}>{children}</div>
}
