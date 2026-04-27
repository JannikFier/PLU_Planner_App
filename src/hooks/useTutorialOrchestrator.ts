import { useContext } from 'react'
import {
  TutorialOrchestratorContext,
  noopOrchestrator,
  type TutorialOrchestratorContextValue,
} from '@/contexts/tutorial-orchestrator-context-base'

export type { TutorialOrchestratorContextValue, TutorialRestartMode } from '@/contexts/tutorial-orchestrator-context-base'

export function useTutorialOrchestrator(): TutorialOrchestratorContextValue {
  return useContext(TutorialOrchestratorContext) ?? noopOrchestrator
}
