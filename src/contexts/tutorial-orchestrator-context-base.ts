// Kontext-Instanz + Noop-Default (eigenes Modul, damit Fast-Refresh nur im Provider-Component-Modul reagiert)
import { createContext } from 'react'
import type { TutorialModuleKey, TutorialStatePayload } from '@/lib/tutorial-types'

export type TutorialRestartMode = 'continue' | 'restart'

export interface TutorialOrchestratorContextValue {
  isActive: boolean
  repeatIntroduction: (mode?: TutorialRestartMode) => Promise<void>
  abortTutorial: () => void
  payload: TutorialStatePayload | null
  availableModules: TutorialModuleKey[]
  replayModule: (mod: TutorialModuleKey) => Promise<void>
}

export const TutorialOrchestratorContext = createContext<TutorialOrchestratorContextValue | null>(null)

export const noopOrchestrator: TutorialOrchestratorContextValue = {
  isActive: false,
  repeatIntroduction: async () => {},
  abortTutorial: () => {},
  payload: null,
  availableModules: [],
  replayModule: async () => {},
}
