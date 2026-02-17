// Error Boundary: Fängt Render-Fehler in der Kind-Komponentenbaum ab

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Zeigt bei einem Absturz eine Fallback-UI statt weißen Bildschirm.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="text-lg font-semibold">Etwas ist schiefgelaufen</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="default"
          >
            Seite neu laden
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
