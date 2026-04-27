import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useStoreAccessByUser } from '@/hooks/useStoreAccess'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { shouldShowNotificationBell } from '@/lib/notification-bell-visibility'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { useTestMode } from '@/contexts/TestModeContext'
import { useTutorialPersistence } from '@/hooks/useTutorialPersistence'
import {
  defaultTutorialState,
  moduleNeedsRefresh,
  type TutorialModuleKey,
  type TutorialStatePayload,
} from '@/lib/tutorial-types'
import {
  destroyActiveDriverTour,
  getActiveDriverStepIndex,
  runDriverTour,
} from '@/lib/run-driver-tour'
import {
  dashboardHomeForRole,
  filterExistingStepsAsync,
  filterTutorialTasksWithAnchorsAsync,
  markModulesCompleted,
  waitForRoute,
  waitForSelector,
} from '@/lib/tutorial-orchestrator-utils'
import {
  clearDeferReplayWelcome,
  deferReplayWelcomeForCurrentBrowserSession,
  isReplayWelcomeDeferred,
} from '@/lib/tutorial-replay-session'
import { TUTORIAL_TESTMODE_TURNED_OFF_EVENT } from '@/lib/tutorial-testmode-events'
import { runTaskQueue, type TutorialTask } from '@/lib/tutorial-interactive-engine'
import {
  buildAdminPostBackshopTasks,
  buildAdminPostObstTasks,
  buildAdminPostUsersTasks,
} from '@/lib/tutorial-curriculum-admin'
import {
  buildBasicsDashboardSpotCoachTasks,
  buildBasicsHeaderHintsTasks,
  buildBasicsInteractiveTasks,
  buildBasicsPickAreaTasks,
  buildBasicsTestModeExitAcknowledgeTasks,
} from '@/lib/tutorial-curriculum-basics'
import { buildTourClosingTasks } from '@/lib/tutorial-curriculum-closing'
import { buildUserPostBackshopTasks, buildUserPostObstTasks } from '@/lib/tutorial-curriculum-user'
import { buildViewerPostBackshopTasks, buildViewerPostObstTasks } from '@/lib/tutorial-curriculum-viewer'
import { buildObstDeepTasks } from '@/lib/tutorial-curriculum-obst-deep'
import { buildBackshopDeepTasks } from '@/lib/tutorial-curriculum-backshop-deep'
import { buildBackshopMarkenTasks } from '@/lib/tutorial-curriculum-backshop-marken'
import {
  buildAdminBackshopKonfigDeepTasks,
  buildAdminObstKonfigDeepTasks,
} from '@/lib/tutorial-curriculum-admin-konfig'
import { buildWerbungTasks } from '@/lib/tutorial-curriculum-werbung'
import { buildBackshopUploadTasks } from '@/lib/tutorial-curriculum-backshop-upload'
import { buildHiddenRenamedCustomTasks } from '@/lib/tutorial-curriculum-hidden-renamed-custom'
import { buildUsersLightTasks } from '@/lib/tutorial-curriculum-users-light'
import {
  clearTutorialSkippedThisSession,
  isTutorialSkippedThisSession,
  markTutorialSkippedThisSession,
} from '@/lib/tutorial-session-skip'
import { TutorialCoachPanel } from '@/components/tutorial/TutorialCoachPanel'
import { TutorialDebugOverlay } from '@/components/tutorial/TutorialDebugOverlay'
import {
  flushTutorialEvents,
  isTutorialDebugEnabled,
  logTutorialEvent,
  setTutorialEventContext,
} from '@/lib/tutorial-events'
import {
  buildBackshopListSteps,
  buildBasicsSteps,
  buildObstMasterlistSteps,
  buildUsersSteps,
  tutorialBackshopListPath,
  tutorialMasterlistPath,
  tutorialUsersPath,
} from '@/lib/tutorial-registry'
import { inferTutorialModuleFromPath } from '@/lib/tutorial-path-infer'
import {
  TutorialFollowupModal,
  TutorialNoListModal,
  TutorialTestModeInterruptModal,
  TutorialTrackPickModal,
  TutorialWelcomeModal,
  type TutorialFollowupKind,
} from '@/components/tutorial/TutorialModals'
import 'driver.js/dist/driver.css'
import {
  noopOrchestrator,
  TutorialOrchestratorContext,
  type TutorialOrchestratorContextValue,
  type TutorialRestartMode,
} from '@/contexts/tutorial-orchestrator-context-base'
import { isTutorialUiEnabled } from '@/lib/tutorial-ui-env'

export type { TutorialOrchestratorContextValue, TutorialRestartMode } from '@/contexts/tutorial-orchestrator-context-base'

type ContentModuleKey = Exclude<TutorialModuleKey, 'basics' | 'closing'>

function TutorialOrchestratorProviderImpl({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, mustChangePassword, isSuperAdmin } = useAuth()
  const { isUserPreviewActive } = useUserPreview()
  const { currentStoreId } = useCurrentStore()
  const { data: userStoreAccess } = useStoreAccessByUser(user?.id)
  const hasMultipleStores = (userStoreAccess?.length ?? 0) > 1
  const visibility = useEffectiveListVisibility()
  const effectiveRole = useEffectiveRouteRole()
  const { isTestMode, enableTestMode } = useTestMode()

  const { payload, isLoading: tutorialLoading, save } = useTutorialPersistence(user?.id, currentStoreId ?? undefined)

  useEffect(() => {
    setTutorialEventContext(user?.id ?? null, currentStoreId ?? null)
  }, [user?.id, currentStoreId])

  useEffect(() => {
    const onUnload = () => {
      void flushTutorialEvents()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      void flushTutorialEvents()
    }
  }, [])

  const [debugOn, setDebugOn] = useState<boolean>(() => isTutorialDebugEnabled())
  useEffect(() => {
    const onPop = () => setDebugOn(isTutorialDebugEnabled())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onAnchorMissing = (e: Event) => {
      const detail = (e as CustomEvent<{ selector: string }>).detail
      logTutorialEvent({ event: 'anchor-missing', meta: { selector: detail?.selector } })
    }
    window.addEventListener('tutorial:anchor-missing', onAnchorMissing as EventListener)
    return () => window.removeEventListener('tutorial:anchor-missing', onAnchorMissing as EventListener)
  }, [])

  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [trackPickOpen, setTrackPickOpen] = useState(false)
  const [trackPickMidTour, setTrackPickMidTour] = useState(false)
  const [followupOpen, setFollowupOpen] = useState(false)
  const [followupKind, setFollowupKind] = useState<TutorialFollowupKind>('completed')
  const [noListOpen, setNoListOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [testModeInterruptOpen, setTestModeInterruptOpen] = useState(false)
  const [coachOverlay, setCoachOverlay] = useState<{
    task: TutorialTask
    index: number
    total: number
  } | null>(null)

  const [selectedPick, setSelectedPick] = useState<ContentModuleKey | null>(null)
  const [remainingOptions, setRemainingOptions] = useState<ContentModuleKey[]>([])

  /** Per User+Markt innerhalb dieser Browser-Session. Wird bei ESC/Überspringen gesetzt. */
  const [skippedThisSession, setSkippedThisSessionState] = useState<boolean>(false)

  // Sobald User/Store bekannt sind: sessionStorage lesen
  useEffect(() => {
    if (!user?.id || !currentStoreId) return
    setSkippedThisSessionState(isTutorialSkippedThisSession(user.id, currentStoreId))
  }, [user?.id, currentStoreId])

  const markSkippedThisSession = useCallback(() => {
    markTutorialSkippedThisSession(user?.id ?? null, currentStoreId ?? null)
    setSkippedThisSessionState(true)
  }, [user?.id, currentStoreId])

  const clearSkippedThisSession = useCallback(() => {
    clearTutorialSkippedThisSession(user?.id ?? null, currentStoreId ?? null)
    setSkippedThisSessionState(false)
  }, [user?.id, currentStoreId])

  const sessionGateRef = useRef(false)
  const welcomeProgrammaticCloseRef = useRef(false)
  const trackPickProgrammaticCloseRef = useRef(false)
  const pathnameRef = useRef(location.pathname)
  pathnameRef.current = location.pathname
  const isTestModeRef = useRef(isTestMode)
  isTestModeRef.current = isTestMode
  const runningRef = useRef(false)
  const tourStoppedByTestModeRef = useRef(false)
  const tourAbortControllerRef = useRef<AbortController | null>(null)
  const payloadRef = useRef<TutorialStatePayload | null>(null)
  payloadRef.current = payload ?? null
  /** Module, die in diesem Tour-Lauf erfolgreich durchlaufen wurden (für `markModulesCompleted`). */
  const completedInThisRunRef = useRef<TutorialModuleKey[]>([])
  /** Aktuell laufendes Modul – für Pause/Resume bei Testmodus-Unterbrechung. */
  const currentModuleRef = useRef<TutorialModuleKey | null>(null)
  const currentInteractiveIndexRef = useRef<number>(0)

  const dashboardPaths = useMemo(() => ['/user', '/admin', '/viewer'], [])

  const obstVisible = visibility.obstGemuese
  const backshopVisible = visibility.backshop
  const visibilityLoading = visibility.isLoading

  const showUsersCard = location.pathname === '/admin' && effectiveRole === 'admin'
  const showUsersOption = effectiveRole === 'admin'
  const showTestModeStep = effectiveRole !== 'viewer'

  const eligibleSurface = useMemo(() => {
    if (!profile || mustChangePassword) return false
    if (isSuperAdmin && !isUserPreviewActive) return false
    if (!currentStoreId) return false
    if (!dashboardPaths.includes(location.pathname)) return false
    if (visibilityLoading) return false
    return true
  }, [
    profile,
    mustChangePassword,
    isSuperAdmin,
    isUserPreviewActive,
    currentStoreId,
    location.pathname,
    visibilityLoading,
    dashboardPaths,
  ])

  const hasNoListForUserLike =
    !obstVisible &&
    !backshopVisible &&
    (location.pathname === '/user' || location.pathname === '/viewer') &&
    effectiveRole !== 'admin'

  useEffect(() => {
    runningRef.current = running
  }, [running])

  useEffect(() => {
    const onTestModeOff = () => {
      if (!runningRef.current) return
      tourStoppedByTestModeRef.current = true
      // Aktuellen Step-Index ermitteln (driver.js oder Coach-Overlay) und lokal merken.
      const driverIdx = getActiveDriverStepIndex()
      const coachIdx = currentInteractiveIndexRef.current
      const stepIdx = driverIdx != null ? driverIdx : coachIdx
      const mod = currentModuleRef.current
      if (mod) {
        const base = payloadRef.current ?? defaultTutorialState()
        const existing = base.modules[mod]
        const patched: TutorialStatePayload = {
          ...base,
          modules: {
            ...base.modules,
            [mod]: {
              contentVersionSeen: existing?.contentVersionSeen ?? 0,
              completed: existing?.completed ?? false,
              lastStepIndex: Math.max(0, stepIdx),
            },
          },
        }
        // Fire-and-forget – Abbruch darf nicht auf DB warten
        void save(patched).catch(() => {})
      }
      tourAbortControllerRef.current?.abort()
      destroyActiveDriverTour()
      setCoachOverlay(null)
    }
    window.addEventListener(TUTORIAL_TESTMODE_TURNED_OFF_EVENT, onTestModeOff)
    return () => window.removeEventListener(TUTORIAL_TESTMODE_TURNED_OFF_EVENT, onTestModeOff)
  }, [save])

  const isAdminRole = effectiveRole === 'admin'

  const contentOptionsAll = useMemo<ContentModuleKey[]>(() => {
    // Reihenfolge: zuerst Obst-Familie (Liste -> Tiefe -> Konfig),
    // dann Backshop-Familie (Liste -> Tiefe -> Marken -> Konfig -> Upload),
    // dann uebergreifend Werbung + Hidden/Renamed/Custom,
    // zuletzt Admin-Pfade Users.
    const o: ContentModuleKey[] = []
    if (obstVisible) {
      o.push('obst')
      if (effectiveRole !== 'viewer') o.push('obst-deep')
      if (isAdminRole) o.push('obst-konfig')
    }
    if (backshopVisible) {
      o.push('backshop')
      if (effectiveRole !== 'viewer') o.push('backshop-deep')
      if (effectiveRole !== 'viewer') o.push('backshop-marken')
      if (isAdminRole) o.push('backshop-konfig')
      if (isAdminRole) o.push('backshop-upload')
    }
    // Werbung sinnvoll, sobald mind. einer der Bereiche sichtbar ist.
    if ((obstVisible || backshopVisible) && effectiveRole !== 'viewer') {
      o.push('werbung')
    }
    // Hidden/Renamed/Custom Detail-Tour, wenn mind. einer der Bereiche sichtbar ist.
    if ((obstVisible || backshopVisible) && effectiveRole !== 'viewer') {
      o.push('hidden-renamed-custom')
    }
    if (showUsersOption) o.push('users')
    return o
  }, [obstVisible, backshopVisible, showUsersOption, isAdminRole, effectiveRole])

  const shouldOfferWelcome = useMemo(() => {
    if (!eligibleSurface || tutorialLoading || !payload) return false
    if (hasNoListForUserLike) return false
    if (payload.dismissedForever) return false
    if (skippedThisSession) return false
    const wantsReplay = Boolean(payload.replayOnNextLogin) && !isReplayWelcomeDeferred()
    const needsAny =
      wantsReplay ||
      moduleNeedsRefresh('basics', payload.modules) ||
      (obstVisible && moduleNeedsRefresh('obst', payload.modules)) ||
      (backshopVisible && moduleNeedsRefresh('backshop', payload.modules)) ||
      (showUsersCard && moduleNeedsRefresh('users', payload.modules))
    return needsAny
  }, [
    eligibleSurface,
    tutorialLoading,
    payload,
    obstVisible,
    backshopVisible,
    showUsersCard,
    hasNoListForUserLike,
    skippedThisSession,
  ])

  useEffect(() => {
    if (!eligibleSurface || tutorialLoading || !payload) return
    if (hasNoListForUserLike && !sessionGateRef.current) {
      sessionGateRef.current = true
      setNoListOpen(true)
      return
    }
    if (!shouldOfferWelcome || running || welcomeOpen || trackPickOpen || followupOpen) return
    if (sessionGateRef.current) return
    sessionGateRef.current = true
    setWelcomeOpen(true)
  }, [
    eligibleSurface,
    tutorialLoading,
    payload,
    shouldOfferWelcome,
    running,
    welcomeOpen,
    trackPickOpen,
    followupOpen,
    hasNoListForUserLike,
  ])

  const openFollowup = useCallback((kind: TutorialFollowupKind) => {
    setFollowupKind(kind)
    setFollowupOpen(true)
  }, [])

  const persistCompletedModulesForThisRun = useCallback(
    async (patch: Partial<TutorialStatePayload>) => {
      const base = payloadRef.current ?? defaultTutorialState()
      const withCompleted = markModulesCompleted(base, completedInThisRunRef.current)
      const next: TutorialStatePayload = { ...withCompleted, ...patch }
      await save(next)
    },
    [save],
  )

  const runBasicsSegment = useCallback(
    async (signal: AbortSignal): Promise<'finished' | 'aborted'> => {
      currentModuleRef.current = 'basics'
      currentInteractiveIndexRef.current = 0
      const useInteractiveTestMode = showTestModeStep && effectiveRole !== 'viewer'
      /** Offset für „Bereich wählen“-Coach (Fortsetzung nach Profil/Testmodus/Dashboard-Coach). */
      let coachStepsBeforePick = 0

      /** Zuerst oben rechts (Coach + Aktion), dann Driver über Dashboard – kein „1/5"-Block vor dem Profil. */
      if (useInteractiveTestMode) {
        /**
         * Bug 1 Hardening: Vor dem interaktiven Profil-Coach-Step jede evtl.
         * noch aktive driver.js-Tour zerstoeren. Sonst kann das driver.js-
         * Stage-Backdrop einen Klick auf den Profil-Trigger / Menue-Item
         * abfangen und das Radix-Dropdown bleibt haengen.
         */
        destroyActiveDriverTour()
        const basicInteractive = buildBasicsInteractiveTasks({
          showTestModeStep: true,
          getTestMode: () => isTestModeRef.current,
        })
        const ir = await runTaskQueue(basicInteractive, {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (ir === 'aborted') return 'aborted'
        if (!isTestModeRef.current) enableTestMode()
        const baseIdx = basicInteractive.length
        const exitAck = buildBasicsTestModeExitAcknowledgeTasks()
        const ackr = await runTaskQueue(exitAck, {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = baseIdx + i
            setCoachOverlay({ task: t, index: baseIdx + i, total: baseIdx + tot })
          },
        })
        setCoachOverlay(null)
        if (ackr === 'aborted' || signal.aborted) return 'aborted'
        const postDashBaseIdx = baseIdx + exitAck.length
        const dashCoach = buildBasicsDashboardSpotCoachTasks({
          obstVisible,
          backshopVisible,
          showUsersCard,
          showTestModeStep,
        })
        const safeDash = await filterTutorialTasksWithAnchorsAsync(dashCoach, { signal, timeoutMs: 1500 })
        if (signal.aborted) return 'aborted'
        if (safeDash.length > 0) {
          const r2 = await runTaskQueue(safeDash, {
            signal,
            onTaskStart: (t, i, tot) => {
              currentInteractiveIndexRef.current = postDashBaseIdx + i
              setCoachOverlay({ task: t, index: postDashBaseIdx + i, total: postDashBaseIdx + tot })
            },
          })
          setCoachOverlay(null)
          if (r2 === 'aborted' || signal.aborted) return 'aborted'
        }
        // Header-Hints (PR 3.0 B1): KW, Markt-Wechsel, Glocke, Tour-Icon, Profil-Replay/Admin.
        // Reine Ack-Steps; werden nur fuer nicht-Viewer-Rollen mit Testmodus angezeigt
        // (also dieselbe Bedingung wie useInteractiveTestMode = true).
        const bellOnDash =
          shouldShowNotificationBell(effectiveRole, '/' + (effectiveRole === 'viewer' ? 'viewer' : effectiveRole === 'admin' ? 'admin' : 'user'))
        const headerHints = buildBasicsHeaderHintsTasks({
          hasMultipleStores,
          showAdminArea: effectiveRole === 'admin',
          bellVisibleOnDashboard: bellOnDash,
        })
        const headerHintsBaseIdx = postDashBaseIdx + safeDash.length
        if (headerHints.length > 0) {
          const hr = await runTaskQueue(headerHints, {
            signal,
            onTaskStart: (t, i, tot) => {
              currentInteractiveIndexRef.current = headerHintsBaseIdx + i
              setCoachOverlay({ task: t, index: headerHintsBaseIdx + i, total: headerHintsBaseIdx + tot })
            },
          })
          setCoachOverlay(null)
          if (hr === 'aborted' || signal.aborted) return 'aborted'
        }
        coachStepsBeforePick = basicInteractive.length + exitAck.length + safeDash.length + headerHints.length
      } else {
        const steps = buildBasicsSteps({
          obstVisible,
          backshopVisible,
          showUsersCard,
          showTestModeStep,
          testModeActive: isTestModeRef.current,
          omitTestModeExitStep: false,
          skipProfileSpotlight: false,
        })
        const safeSteps = await filterExistingStepsAsync(steps, { signal, timeoutMs: 1500 })
        if (signal.aborted) return 'aborted'
        const r = await runDriverTour(safeSteps)
        if (r === 'closed' || signal.aborted) return 'aborted'
        coachStepsBeforePick = 0
      }

      const hasAreaPick = obstVisible || backshopVisible || showUsersCard
      if (hasAreaPick) {
        const pick = buildBasicsPickAreaTasks(() => pathnameRef.current)
        const pr = await runTaskQueue(pick, {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = coachStepsBeforePick + i
            setCoachOverlay({
              task: t,
              index: coachStepsBeforePick + i,
              total: coachStepsBeforePick + tot,
            })
          },
        })
        setCoachOverlay(null)
        if (pr === 'aborted') return 'aborted'
      }
      completedInThisRunRef.current.push('basics')
      return 'finished'
    },
    [
      obstVisible,
      backshopVisible,
      showUsersCard,
      showTestModeStep,
      effectiveRole,
      enableTestMode,
      hasMultipleStores,
    ],
  )

  const runContentModule = useCallback(
    async (mod: ContentModuleKey, signal: AbortSignal): Promise<'finished' | 'aborted'> => {
      const role = effectiveRole
      const pathnameNow = () => pathnameRef.current
      currentModuleRef.current = mod
      currentInteractiveIndexRef.current = 0
      if (mod === 'obst') {
        navigate(tutorialMasterlistPath(role))
        await waitForRoute(tutorialMasterlistPath(role), {
          signal,
          confirmSelector: '[data-tour="masterlist-toolbar-actions"]',
          timeoutMs: 8000,
        })
        await waitForSelector('[data-tour="masterlist-toolbar-actions"]', {
          signal,
          timeoutMs: 4000,
        })
        if (signal.aborted) return 'aborted'
        const obstSteps = await filterExistingStepsAsync(buildObstMasterlistSteps(), {
          signal,
          timeoutMs: 1500,
        })
        const r = await runDriverTour(obstSteps)
        if (r === 'closed' || signal.aborted) return 'aborted'
        const tail = [
          ...(role === 'viewer' ? buildViewerPostObstTasks(pathnameNow) : buildUserPostObstTasks(pathnameNow)),
          ...(role === 'admin' ? buildAdminPostObstTasks(pathnameNow) : []),
        ]
        if (tail.length > 0) {
          const tr = await runTaskQueue(tail, {
            signal,
            onTaskStart: (t, i, tot) => {
              currentInteractiveIndexRef.current = i
              setCoachOverlay({ task: t, index: i, total: tot })
            },
          })
          setCoachOverlay(null)
          if (tr === 'aborted') return 'aborted'
        }
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('obst')
        return 'finished'
      }
      if (mod === 'backshop') {
        navigate(tutorialBackshopListPath(role))
        await waitForRoute(tutorialBackshopListPath(role), {
          signal,
          confirmSelector: '[data-tour="backshop-master-toolbar"]',
          timeoutMs: 8000,
        })
        await waitForSelector('[data-tour="backshop-master-toolbar"]', { signal, timeoutMs: 4000 })
        if (signal.aborted) return 'aborted'
        const backshopSteps = await filterExistingStepsAsync(buildBackshopListSteps(), {
          signal,
          timeoutMs: 1500,
        })
        const r = await runDriverTour(backshopSteps)
        if (r === 'closed' || signal.aborted) return 'aborted'
        const tail = [
          ...(role === 'viewer' ? buildViewerPostBackshopTasks(pathnameNow) : buildUserPostBackshopTasks(pathnameNow)),
          ...(role === 'admin' ? buildAdminPostBackshopTasks(pathnameNow) : []),
        ]
        if (tail.length > 0) {
          const tr = await runTaskQueue(tail, {
            signal,
            onTaskStart: (t, i, tot) => {
              currentInteractiveIndexRef.current = i
              setCoachOverlay({ task: t, index: i, total: tot })
            },
          })
          setCoachOverlay(null)
          if (tr === 'aborted') return 'aborted'
        }
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('backshop')
        return 'finished'
      }
      if (mod === 'users') {
        navigate(tutorialUsersPath(role))
        await waitForRoute(tutorialUsersPath(role), {
          signal,
          confirmSelector: '[data-tour="user-management-heading"]',
          timeoutMs: 8000,
        })
        await waitForSelector('[data-tour="user-management-heading"]', { signal, timeoutMs: 4000 })
        if (signal.aborted) return 'aborted'
        const userSteps = await filterExistingStepsAsync(buildUsersSteps(), {
          signal,
          timeoutMs: 1500,
        })
        const r = await runDriverTour(userSteps)
        if (r === 'closed' || signal.aborted) return 'aborted'
        // Bestehender interaktiver Tail bleibt unangetastet (B8: erweitern, nicht ersetzen).
        const tail = [
          ...buildAdminPostUsersTasks(pathnameNow),
          ...buildUsersLightTasks(pathnameNow),
        ]
        if (tail.length > 0) {
          const tr = await runTaskQueue(tail, {
            signal,
            onTaskStart: (t, i, tot) => {
              currentInteractiveIndexRef.current = i
              setCoachOverlay({ task: t, index: i, total: tot })
            },
          })
          setCoachOverlay(null)
          if (tr === 'aborted') return 'aborted'
        }
        navigate(dashboardHomeForRole('admin'))
        await waitForRoute(dashboardHomeForRole('admin'), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('users')
        return 'finished'
      }
      if (mod === 'werbung') {
        // Navigiere zur passenden Liste. Werbung-Builder enthaelt einen actionStep,
        // der den User auf den jeweiligen "Werbung"-Toolbar-Button hinweist.
        const startPath = obstVisible ? tutorialMasterlistPath(role) : tutorialBackshopListPath(role)
        navigate(startPath)
        await waitForRoute(startPath, { signal, timeoutMs: 8000 })
        if (signal.aborted) return 'aborted'
        const werbungTasks = buildWerbungTasks({
          getPathname: pathnameNow,
          obstVisible,
          backshopVisible,
        })
        const tr = await runTaskQueue(werbungTasks, {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('werbung')
        return 'finished'
      }
      if (mod === 'backshop-upload') {
        // Nur Admin (siehe contentOptionsAll). Tour spielt auf der Wizard-Seite.
        navigate('/admin/backshop-upload')
        await waitForRoute('/admin/backshop-upload', { signal, timeoutMs: 8000 })
        if (signal.aborted) return 'aborted'
        const uploadTasks = buildBackshopUploadTasks(pathnameNow)
        const tr = await runTaskQueue(uploadTasks, {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('backshop-upload')
        return 'finished'
      }
      if (mod === 'hidden-renamed-custom') {
        // Detail-Tour ueber Hidden, Renamed und Custom. Reine Coach-Hinweise –
        // Anker-DOM-Erkennung bleibt best-effort; ohne Anker erscheint der Coach
        // zentriert. Start-Seite: Liste, in der wir am ehesten die Anker treffen.
        const startPath = obstVisible ? tutorialMasterlistPath(role) : tutorialBackshopListPath(role)
        navigate(startPath)
        await waitForRoute(startPath, { signal, timeoutMs: 8000 })
        if (signal.aborted) return 'aborted'
        const detailTasks = buildHiddenRenamedCustomTasks({
          getPathname: pathnameNow,
          obstVisible,
          backshopVisible,
        })
        const tr = await runTaskQueue(detailTasks, {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('hidden-renamed-custom')
        return 'finished'
      }
      if (mod === 'obst-deep') {
        navigate(tutorialMasterlistPath(role))
        await waitForRoute(tutorialMasterlistPath(role), {
          signal,
          confirmSelector: '[data-tour="masterlist-toolbar-actions"]',
          timeoutMs: 8000,
        })
        if (signal.aborted) return 'aborted'
        const tr = await runTaskQueue(buildObstDeepTasks(pathnameNow), {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('obst-deep')
        return 'finished'
      }
      if (mod === 'obst-konfig') {
        navigate('/admin/obst/konfiguration')
        await waitForRoute('/admin/obst/konfiguration', { signal, timeoutMs: 8000 })
        if (signal.aborted) return 'aborted'
        const tr = await runTaskQueue(buildAdminObstKonfigDeepTasks(pathnameNow), {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole('admin'))
        await waitForRoute(dashboardHomeForRole('admin'), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('obst-konfig')
        return 'finished'
      }
      if (mod === 'backshop-deep') {
        navigate(tutorialBackshopListPath(role))
        await waitForRoute(tutorialBackshopListPath(role), {
          signal,
          confirmSelector: '[data-tour="backshop-master-toolbar"]',
          timeoutMs: 8000,
        })
        if (signal.aborted) return 'aborted'
        const tr = await runTaskQueue(buildBackshopDeepTasks(pathnameNow), {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('backshop-deep')
        return 'finished'
      }
      if (mod === 'backshop-marken') {
        navigate('/marken-auswahl')
        await waitForRoute('/marken-auswahl', { signal, timeoutMs: 8000 })
        if (signal.aborted) return 'aborted'
        const tr = await runTaskQueue(buildBackshopMarkenTasks(pathnameNow), {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole(role))
        await waitForRoute(dashboardHomeForRole(role), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('backshop-marken')
        return 'finished'
      }
      if (mod === 'backshop-konfig') {
        navigate('/admin/backshop/konfiguration')
        await waitForRoute('/admin/backshop/konfiguration', { signal, timeoutMs: 8000 })
        if (signal.aborted) return 'aborted'
        const tr = await runTaskQueue(buildAdminBackshopKonfigDeepTasks(pathnameNow), {
          signal,
          onTaskStart: (t, i, tot) => {
            currentInteractiveIndexRef.current = i
            setCoachOverlay({ task: t, index: i, total: tot })
          },
        })
        setCoachOverlay(null)
        if (tr === 'aborted') return 'aborted'
        navigate(dashboardHomeForRole('admin'))
        await waitForRoute(dashboardHomeForRole('admin'), { signal, timeoutMs: 4000 })
        completedInThisRunRef.current.push('backshop-konfig')
        return 'finished'
      }
      return 'finished'
    },
    [effectiveRole, navigate, obstVisible, backshopVisible],
  )

  const runClosingSegment = useCallback(
    async (signal: AbortSignal): Promise<'finished' | 'aborted'> => {
      currentModuleRef.current = 'closing'
      currentInteractiveIndexRef.current = 0
      const closingTasks = buildTourClosingTasks(() => pathnameRef.current, {
        showBellHint: effectiveRole !== 'viewer',
      })
      const cr = await runTaskQueue(closingTasks, {
        signal,
        onTaskStart: (t, i, tot) => {
          currentInteractiveIndexRef.current = i
          setCoachOverlay({ task: t, index: i, total: tot })
        },
      })
      setCoachOverlay(null)
      if (cr === 'aborted') return 'aborted'
      completedInThisRunRef.current.push('closing')
      return 'finished'
    },
    [effectiveRole],
  )

  /** Öffnet den Track-Pick inmitten der Tour; verbleibende Optionen aus `remaining`. */
  const openInterTrackPick = useCallback(
    (remaining: ContentModuleKey[], midTour = true) => {
      setRemainingOptions(remaining)
      setSelectedPick(remaining[0] ?? null)
      setTrackPickMidTour(midTour)
      setTrackPickOpen(true)
    },
    [],
  )

  const finalizeTourEnd = useCallback(
    async (kind: TutorialFollowupKind) => {
      await persistCompletedModulesForThisRun({ replayOnNextLogin: false })
      if (kind === 'completed') {
        clearDeferReplayWelcome()
      }
      logTutorialEvent({ event: kind === 'completed' ? 'complete' : 'abort', meta: { kind } })
      void flushTutorialEvents()
      openFollowup(kind)
    },
    [openFollowup, persistCompletedModulesForThisRun],
  )

  /** Sofortiger Abbruch: Task-Queue, Driver und Coach; Folge-Logik wie bei `run*Segment` → `aborted`. */
  const abortTutorial = useCallback(() => {
    tourAbortControllerRef.current?.abort()
    destroyActiveDriverTour()
    setCoachOverlay(null)
    trackPickProgrammaticCloseRef.current = true
    setTrackPickOpen(false)
    queueMicrotask(() => {
      trackPickProgrammaticCloseRef.current = false
    })
  }, [])

  const runPickedModule = useCallback(
    async (mod: ContentModuleKey, allModulesForRemaining?: ContentModuleKey[]) => {
      setRunning(true)
      tourStoppedByTestModeRef.current = false
      tourAbortControllerRef.current = new AbortController()
      const signal = tourAbortControllerRef.current.signal
      try {
        const mr = await runContentModule(mod, signal)
        if (mr === 'aborted') {
          const brokeForTestMode = tourStoppedByTestModeRef.current
          tourStoppedByTestModeRef.current = false
          if (brokeForTestMode) return
          await finalizeTourEnd('aborted')
          return
        }
        const baseList = allModulesForRemaining ?? remainingOptions
        const remaining = baseList.filter((k) => k !== mod)
        if (remaining.length > 0) {
          openInterTrackPick(remaining)
          return
        }
        const cr = await runClosingSegment(signal)
        if (cr === 'aborted') {
          const brokeForTestMode = tourStoppedByTestModeRef.current
          tourStoppedByTestModeRef.current = false
          if (!brokeForTestMode) await finalizeTourEnd('aborted')
          return
        }
        await finalizeTourEnd('completed')
      } finally {
        tourAbortControllerRef.current = null
        setCoachOverlay(null)
        setRunning(false)
        if (tourStoppedByTestModeRef.current) {
          tourStoppedByTestModeRef.current = false
          setTestModeInterruptOpen(true)
        }
      }
    },
    [finalizeTourEnd, openInterTrackPick, remainingOptions, runContentModule, runClosingSegment],
  )

  /** Startet die Tour ab Basics. Nach Kachel-Klick (Route) wird das passende Modul direkt gestartet. */
  const startTourFromBeginning = useCallback(async () => {
    // Nach handleWelcomeStart: sessionGateRef war true bis hier — jetzt running, Gate wieder frei.
    sessionGateRef.current = false
    setRunning(true)
    completedInThisRunRef.current = []
    tourStoppedByTestModeRef.current = false
    tourAbortControllerRef.current = new AbortController()
    const signal = tourAbortControllerRef.current.signal
    try {
      const br = await runBasicsSegment(signal)
      if (br === 'aborted') {
        const brokeForTestMode = tourStoppedByTestModeRef.current
        tourStoppedByTestModeRef.current = false
        if (brokeForTestMode) return
        await finalizeTourEnd('aborted')
        return
      }
      if (contentOptionsAll.length === 0) {
        const cr0 = await runClosingSegment(signal)
        if (cr0 === 'aborted') {
          const brokeForTestMode = tourStoppedByTestModeRef.current
          tourStoppedByTestModeRef.current = false
          if (!brokeForTestMode) await finalizeTourEnd('aborted')
          return
        }
        await finalizeTourEnd('completed')
        return
      }
      const inferred = inferTutorialModuleFromPath(pathnameRef.current)
      const inferredOk =
        inferred != null && (contentOptionsAll as readonly ContentModuleKey[]).includes(inferred)
      if (inferredOk) {
        await runPickedModule(inferred, contentOptionsAll)
        return
      }
      openInterTrackPick(contentOptionsAll, false)
    } finally {
      tourAbortControllerRef.current = null
      setCoachOverlay(null)
      setRunning(false)
      if (tourStoppedByTestModeRef.current) {
        tourStoppedByTestModeRef.current = false
        setTestModeInterruptOpen(true)
      }
    }
  }, [
    contentOptionsAll,
    finalizeTourEnd,
    openInterTrackPick,
    runBasicsSegment,
    runClosingSegment,
    runPickedModule,
  ])

  // ---------------- Welcome-Handler ----------------

  const handleWelcomeDialogOpenChange = useCallback(
    (open: boolean) => {
      setWelcomeOpen(open)
      // ESC/X → skippedThisSession, kein Followup, kein DB-Schreiben.
      if (!open && !welcomeProgrammaticCloseRef.current) {
        markSkippedThisSession()
      }
    },
    [markSkippedThisSession],
  )

  const handleWelcomeSkip = useCallback(() => {
    welcomeProgrammaticCloseRef.current = true
    setWelcomeOpen(false)
    markSkippedThisSession()
    logTutorialEvent({ event: 'skip' })
    queueMicrotask(() => {
      welcomeProgrammaticCloseRef.current = false
    })
  }, [markSkippedThisSession])

  const handleWelcomeNeverAgain = useCallback(async () => {
    welcomeProgrammaticCloseRef.current = true
    // Nach „Einführung wiederholen“ ist sessionGateRef false – ohne dieses Gate
    // feuert der Welcome-useEffect sofort wieder (payload.dismissedForever erst nach save).
    sessionGateRef.current = true
    setWelcomeOpen(false)
    try {
      const base = payloadRef.current ?? defaultTutorialState()
      await save({ ...base, dismissedForever: true, replayOnNextLogin: false })
      logTutorialEvent({ event: 'dismiss' })
    } finally {
      queueMicrotask(() => {
        welcomeProgrammaticCloseRef.current = false
        sessionGateRef.current = false
      })
    }
  }, [save])

  const handleWelcomeStart = useCallback(async () => {
    welcomeProgrammaticCloseRef.current = true
    // Während save + rAF ist running noch false — der Welcome-useEffect würde sonst den Dialog
    // erneut öffnen (shouldOfferWelcome oft noch true). Radix-Overlay blockiert dann Profil-Klicks.
    sessionGateRef.current = true
    setWelcomeOpen(false)
    try {
      const base = payloadRef.current ?? defaultTutorialState()
      let startPayload: TutorialStatePayload = { ...base, replayOnNextLogin: false }
      if (startPayload.fullResetNext) {
        startPayload = { ...startPayload, fullResetNext: false, modules: {} }
      }
      await save(startPayload)
      clearSkippedThisSession()
      logTutorialEvent({ event: 'start' })
      // Welcome-Dialog aus dem DOM lassen, bevor Driver/Coach startet (vermeidet Überlagerung mit „1 von n“).
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
      void startTourFromBeginning()
    } catch {
      sessionGateRef.current = false
    } finally {
      queueMicrotask(() => {
        welcomeProgrammaticCloseRef.current = false
      })
    }
  }, [clearSkippedThisSession, save, startTourFromBeginning])

  // ---------------- Track-Pick-Handler ----------------

  const handleTrackPickOpenChange = useCallback((open: boolean) => {
    setTrackPickOpen(open)
    if (!open && !trackPickProgrammaticCloseRef.current) {
      // Implizites Schließen während einer laufenden Tour → als Skip behandeln.
      markSkippedThisSession()
      void finalizeTourEnd('skipped')
    }
  }, [finalizeTourEnd, markSkippedThisSession])

  const handleTrackConfirm = useCallback(() => {
    trackPickProgrammaticCloseRef.current = true
    setTrackPickOpen(false)
    const mod = selectedPick ?? remainingOptions[0]
    queueMicrotask(() => {
      trackPickProgrammaticCloseRef.current = false
    })
    if (!mod) {
      void (async () => {
        setRunning(true)
        tourAbortControllerRef.current = new AbortController()
        try {
          const crN = await runClosingSegment(tourAbortControllerRef.current.signal)
          if (crN === 'aborted') await finalizeTourEnd('aborted')
          else await finalizeTourEnd('completed')
        } finally {
          tourAbortControllerRef.current = null
          setRunning(false)
        }
      })()
      return
    }
    logTutorialEvent({ event: 'pick-module', module: mod })
    void runPickedModule(mod)
  }, [finalizeTourEnd, remainingOptions, runClosingSegment, runPickedModule, selectedPick])

  const handleTrackEnoughForToday = useCallback(() => {
    trackPickProgrammaticCloseRef.current = true
    setTrackPickOpen(false)
    queueMicrotask(() => {
      trackPickProgrammaticCloseRef.current = false
    })
    logTutorialEvent({ event: 'enough-today' })
    void (async () => {
      setRunning(true)
      tourAbortControllerRef.current = new AbortController()
      try {
        const crE = await runClosingSegment(tourAbortControllerRef.current.signal)
        if (crE === 'aborted') await finalizeTourEnd('aborted')
        else await finalizeTourEnd('completed')
      } finally {
        tourAbortControllerRef.current = null
        setRunning(false)
      }
    })()
  }, [finalizeTourEnd, runClosingSegment])

  // ---------------- Followup-Handler ----------------

  const handleFollowupReplayStart = useCallback(async () => {
    setFollowupOpen(false)
    const base = payloadRef.current ?? defaultTutorialState()
    await save({
      ...base,
      replayOnNextLogin: true,
      fullResetNext: true,
      dismissedForever: false,
    })
    deferReplayWelcomeForCurrentBrowserSession()
    sessionGateRef.current = false
  }, [save])

  const handleFollowupReplayContinue = useCallback(async () => {
    setFollowupOpen(false)
    const base = payloadRef.current ?? defaultTutorialState()
    await save({
      ...base,
      replayOnNextLogin: true,
      fullResetNext: false,
      dismissedForever: false,
    })
    deferReplayWelcomeForCurrentBrowserSession()
    sessionGateRef.current = false
  }, [save])

  const handleFollowupNever = useCallback(async () => {
    setFollowupOpen(false)
    const base = payloadRef.current ?? defaultTutorialState()
    await save({
      ...base,
      dismissedForever: true,
      replayOnNextLogin: false,
      fullResetNext: false,
    })
    sessionGateRef.current = false
  }, [save])

  const handleFollowupRestartNow = useCallback(async () => {
    clearDeferReplayWelcome()
    clearSkippedThisSession()
    setFollowupOpen(false)
    const base = payloadRef.current ?? defaultTutorialState()
    await save({
      ...base,
      fullResetNext: true,
      modules: {},
      replayOnNextLogin: false,
      dismissedForever: false,
    })
    sessionGateRef.current = false
    const home = dashboardHomeForRole(effectiveRole)
    if (pathnameRef.current !== home) {
      navigate(home)
      await waitForRoute(home, { timeoutMs: 5000 })
    }
    welcomeProgrammaticCloseRef.current = true
    setWelcomeOpen(true)
    queueMicrotask(() => {
      welcomeProgrammaticCloseRef.current = false
    })
  }, [clearSkippedThisSession, effectiveRole, navigate, save])

  // ---------------- Testmodus-Interrupt-Handler ----------------

  const handleTestModeResumeLater = useCallback(async () => {
    setTestModeInterruptOpen(false)
    const base = payloadRef.current ?? defaultTutorialState()
    await save({ ...base, replayOnNextLogin: true, dismissedForever: false })
    deferReplayWelcomeForCurrentBrowserSession()
    sessionGateRef.current = false
    logTutorialEvent({ event: 'resume', meta: { reason: 'testmode-off' } })
  }, [save])

  // ---------------- Public API ----------------

  const repeatIntroduction = useCallback(
    async (mode: TutorialRestartMode = 'restart') => {
      clearDeferReplayWelcome()
      clearSkippedThisSession()
      setFollowupOpen(false)
      const base = payloadRef.current ?? defaultTutorialState()
      const patch: Partial<TutorialStatePayload> = {
        replayOnNextLogin: false,
        dismissedForever: false,
      }
      if (mode === 'restart') {
        patch.fullResetNext = true
        patch.modules = {}
      }
      await save({ ...base, ...patch })
      sessionGateRef.current = false
      const home = dashboardHomeForRole(effectiveRole)
      if (pathnameRef.current !== home) {
        navigate(home)
        await waitForRoute(home, { timeoutMs: 5000 })
      }
      welcomeProgrammaticCloseRef.current = true
      setWelcomeOpen(true)
      queueMicrotask(() => {
        welcomeProgrammaticCloseRef.current = false
      })
    },
    [clearSkippedThisSession, effectiveRole, navigate, save],
  )

  const availableModules = useMemo<TutorialModuleKey[]>(
    () => ['basics', ...contentOptionsAll, 'closing'] as TutorialModuleKey[],
    [contentOptionsAll],
  )

  const replayModule = useCallback(
    async (mod: TutorialModuleKey) => {
      const base = payloadRef.current ?? defaultTutorialState()
      const modules = { ...base.modules }
      delete modules[mod]
      await save({
        ...base,
        modules,
        replayOnNextLogin: false,
        dismissedForever: false,
      })
      clearSkippedThisSession()
      sessionGateRef.current = false
      const home = dashboardHomeForRole(effectiveRole)
      if (pathnameRef.current !== home) {
        navigate(home)
        await waitForRoute(home, { timeoutMs: 5000 })
      }
      welcomeProgrammaticCloseRef.current = true
      setWelcomeOpen(true)
      queueMicrotask(() => {
        welcomeProgrammaticCloseRef.current = false
      })
    },
    [clearSkippedThisSession, effectiveRole, navigate, save],
  )

  const orchestratorValue = useMemo<TutorialOrchestratorContextValue>(
    () => ({
      isActive: true,
      repeatIntroduction,
      abortTutorial,
      payload: payload ?? null,
      availableModules,
      replayModule,
    }),
    [repeatIntroduction, abortTutorial, payload, availableModules, replayModule],
  )

  if (isSuperAdmin && !isUserPreviewActive) {
    return (
      <TutorialOrchestratorContext.Provider value={noopOrchestrator}>
        {children}
      </TutorialOrchestratorContext.Provider>
    )
  }

  return (
    <TutorialOrchestratorContext.Provider value={orchestratorValue}>
      {children}
      {coachOverlay ? (
        <TutorialCoachPanel
          fierKey={coachOverlay.task.fierKey}
          headline={coachOverlay.task.headline}
          body={coachOverlay.task.body}
          stepIndex={coachOverlay.index}
          stepTotal={coachOverlay.total}
          nearSelector={coachOverlay.task.nearSelector}
          mascotSize={56}
          acknowledgeRequired={Boolean(coachOverlay.task.requiresAcknowledge)}
        />
      ) : null}
      <TutorialWelcomeModal
        open={welcomeOpen}
        onOpenChange={handleWelcomeDialogOpenChange}
        onStart={handleWelcomeStart}
        onSkip={handleWelcomeSkip}
        onNeverAgain={handleWelcomeNeverAgain}
      />
      <TutorialTrackPickModal
        open={trackPickOpen}
        onOpenChange={handleTrackPickOpenChange}
        options={remainingOptions}
        value={selectedPick}
        onChange={setSelectedPick}
        onConfirm={handleTrackConfirm}
        onEnoughForToday={handleTrackEnoughForToday}
        isMidTour={trackPickMidTour}
      />
      <TutorialFollowupModal
        open={followupOpen}
        kind={followupKind}
        onOpenChange={(v) => {
          if (!v) {
            setFollowupOpen(false)
            sessionGateRef.current = false
          }
        }}
        onReplayFromStart={handleFollowupReplayStart}
        onReplayContinue={handleFollowupReplayContinue}
        onNeverAuto={handleFollowupNever}
        onRestartNow={handleFollowupRestartNow}
      />
      <TutorialNoListModal
        open={noListOpen}
        onOpenChange={(v) => {
          setNoListOpen(v)
          if (!v) sessionGateRef.current = false
        }}
        onConfirm={() => {
          setNoListOpen(false)
          sessionGateRef.current = false
        }}
      />
      <TutorialTestModeInterruptModal
        open={testModeInterruptOpen}
        onOpenChange={setTestModeInterruptOpen}
        onEnableTestMode={enableTestMode}
        onEndTour={() => {
          setTestModeInterruptOpen(false)
          void finalizeTourEnd('aborted')
        }}
        onResumeLater={handleTestModeResumeLater}
      />
      {debugOn ? <TutorialDebugOverlay /> : null}
    </TutorialOrchestratorContext.Provider>
  )
}

/**
 * Aussen: keine Hooks. Production-Standard: Tutorial aus (`isTutorialUiEnabled`), nur Noop.
 * Lokal (DEV) immer voller Orchestrator; auf Live gezielt mit VITE_TUTORIAL_ENABLED=true.
 */
export function TutorialOrchestratorProvider({ children }: { children: ReactNode }) {
  if (!isTutorialUiEnabled()) {
    return (
      <TutorialOrchestratorContext.Provider value={noopOrchestrator}>
        {children}
      </TutorialOrchestratorContext.Provider>
    )
  }
  return <TutorialOrchestratorProviderImpl>{children}</TutorialOrchestratorProviderImpl>
}
