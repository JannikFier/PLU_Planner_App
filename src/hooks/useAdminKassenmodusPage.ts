import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { supabase, invokeEdgeFunction } from '@/lib/supabase'
import {
  buildKioskEntranceUrl,
  isKioskEntranceUrlMisdeployedForHostname,
  kioskUrlSharesOriginWithPage,
} from '@/lib/kiosk-entrance-url'
import { normalizeViteAppDomain } from '@/lib/subdomain'
import { toast } from 'sonner'

export type KioskEntrance = {
  id: string
  store_id: string
  token: string
  created_at: string
  revoked_at: string | null
}

export type KioskRegister = {
  id: string
  store_id: string
  sort_order: number
  display_label: string
  auth_user_id: string
  active: boolean
  created_at: string
}

/** Lädt Kiosk-Routen-Chunks früh vor (Vorschau-Hover), damit der neue Tab schneller wird. */
export function prefetchKioskRouteChunks() {
  void import('@/pages/KasseEntrancePage')
  void import('@/pages/KioskLayout')
  void import('@/pages/MasterList')
}

/**
 * Datenfetch, QR-Einstieg und Mutationen für AdminKassenmodusPage (Stufe 4.10).
 */
export function useAdminKassenmodusPage() {
  const { currentStoreId, subdomain } = useCurrentStore()
  const appDomain = normalizeViteAppDomain(import.meta.env.VITE_APP_DOMAIN)
  const { kiosk: kioskModeStoreOn, isLoading: visibilityLoading } = useEffectiveListVisibility()
  const queryClient = useQueryClient()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newRegisterSortOrder, setNewRegisterSortOrder] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<KioskRegister | null>(null)

  const entranceQuery = useQuery({
    queryKey: ['kiosk-entrance', currentStoreId],
    queryFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      const { data, error } = await supabase
        .from('store_kiosk_entrances')
        .select('*')
        .eq('store_id', currentStoreId)
        .is('revoked_at', null)
        .maybeSingle()
      if (error) throw error
      return data as KioskEntrance | null
    },
    enabled: !!currentStoreId,
  })

  const registersQuery = useQuery({
    queryKey: ['kiosk-registers', currentStoreId],
    queryFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      const { data, error } = await supabase
        .from('store_kiosk_registers')
        .select('*')
        .eq('store_id', currentStoreId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as KioskRegister[]
    },
    enabled: !!currentStoreId,
  })

  const maxRegisterSort = useMemo(() => {
    const list = registersQuery.data ?? []
    return list.reduce((m, r) => Math.max(m, r.sort_order), 0)
  }, [registersQuery.data])

  const nextRegisterSlot = maxRegisterSort + 1
  const registerSlotChoices = useMemo(
    () => [nextRegisterSlot, nextRegisterSlot + 1, nextRegisterSlot + 2],
    [nextRegisterSlot],
  )

  useEffect(() => {
    setNewRegisterSortOrder((prev) =>
      registerSlotChoices.includes(prev) ? prev : nextRegisterSlot,
    )
  }, [nextRegisterSlot, registerSlotChoices])

  const entranceBuild = useMemo(() => {
    const token = entranceQuery.data?.token
    if (!token || typeof window === 'undefined') {
      return {
        url: '',
        usedSubdomainHost: false,
        showHostSessionHint: false,
      }
    }
    const r = buildKioskEntranceUrl({
      token,
      storeSubdomain: subdomain,
      appDomain,
      currentOrigin: window.location.origin,
    })
    const showHostSessionHint =
      Boolean(r.url) && (!r.usedSubdomainHost || kioskUrlSharesOriginWithPage(r.url, window.location.origin))
    return { url: r.url, usedSubdomainHost: r.usedSubdomainHost, showHostSessionHint }
  }, [entranceQuery.data?.token, subdomain, appDomain])

  const entranceUrl = entranceBuild.url

  useEffect(() => {
    let cancelled = false
    if (!entranceUrl) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(entranceUrl, { width: 280, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [entranceUrl])

  const rotateMutation = useMutation({
    mutationFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      return invokeEdgeFunction<{ entrance_token: string }>('rotate-kiosk-entrance', { store_id: currentStoreId })
    },
    onSuccess: () => {
      toast.success('Neuer Einstiegs-Link wurde erzeugt. Bitte neuen QR-Code ausdrucken.')
      void queryClient.invalidateQueries({ queryKey: ['kiosk-entrance', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createRegisterMutation = useMutation({
    mutationFn: async () => {
      if (!currentStoreId) throw new Error('Kein Markt')
      if (newPassword.length < 4) throw new Error('Passwort mindestens 4 Zeichen.')
      return invokeEdgeFunction<{ register: KioskRegister; entrance_token?: string }>('create-kiosk-register', {
        store_id: currentStoreId,
        password: newPassword,
        sort_order: newRegisterSortOrder,
      })
    },
    onSuccess: () => {
      toast.success('Kasse wurde angelegt.')
      setNewPassword('')
      void queryClient.invalidateQueries({ queryKey: ['kiosk-registers', currentStoreId] })
      void queryClient.invalidateQueries({ queryKey: ['kiosk-entrance', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateRegisterMutation = useMutation({
    mutationFn: async (p: { register_id: string; password?: string; active?: boolean }) => {
      return invokeEdgeFunction('update-kiosk-register', p)
    },
    onSuccess: () => {
      toast.success('Gespeichert.')
      void queryClient.invalidateQueries({ queryKey: ['kiosk-registers', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (registerId: string) => {
      return invokeEdgeFunction('delete-kiosk-register', { register_id: registerId })
    },
    onSuccess: () => {
      toast.success('Kasse gelöscht.')
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['kiosk-registers', currentStoreId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(entranceUrl)
      toast.success('Link kopiert.')
    } catch {
      toast.error('Kopieren fehlgeschlagen.')
    }
  }, [entranceUrl])

  const scrollToKassenmodusSection = useCallback((elementId: string) => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const printQr = useCallback(() => {
    if (!qrDataUrl) {
      toast.error('QR-Code noch nicht bereit.')
      return
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Kassen-QR</title></head><body style="margin:0;padding:24px;text-align:center;font-family:sans-serif"><h1 style="font-size:18px">Kassenmodus</h1><img src="${qrDataUrl}" width="280" height="280" alt="QR" /><p style="font-size:12px;color:#666">QR scannen zum Anmelden</p></body></html>`

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:none;margin:0;padding:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)

    const idoc = iframe.contentDocument
    const cw = iframe.contentWindow
    if (!idoc || !cw) {
      iframe.remove()
      toast.error('Drucken ist in diesem Browser nicht verfügbar.')
      return
    }

    idoc.open()
    idoc.write(html)
    idoc.close()

    const cleanupIframe = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    const runPrint = () => {
      requestAnimationFrame(() => {
        try {
          cw.addEventListener('afterprint', cleanupIframe, { once: true })
          cw.focus()
          cw.print()
        } catch {
          cleanupIframe()
          toast.error('Drucken fehlgeschlagen.')
        }
      })
    }

    const rs = idoc.readyState

    if (rs === 'complete') {
      runPrint()
    } else {
      iframe.addEventListener('load', runPrint, { once: true })
    }
  }, [qrDataUrl])

  const downloadQrPdf = useCallback(async () => {
    if (!qrDataUrl) {
      toast.error('QR-Code noch nicht bereit.')
      return
    }
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      doc.setFontSize(14)
      doc.text('Kassenmodus', pageW / 2, 24, { align: 'center' })
      const qrSizeMm = 70
      doc.addImage(qrDataUrl, 'PNG', (pageW - qrSizeMm) / 2, 34, qrSizeMm, qrSizeMm)
      doc.setFontSize(10)
      doc.setTextColor(80)
      doc.text('QR scannen zum Anmelden', pageW / 2, 34 + qrSizeMm + 12, { align: 'center' })
      doc.save('Kassenmodus-QR.pdf')
      toast.success('PDF wurde heruntergeladen.')
    } catch {
      toast.error('PDF konnte nicht erstellt werden.')
    }
  }, [qrDataUrl])

  const canUsePublicKiosk = kioskModeStoreOn && !visibilityLoading

  const kioskUrlMisdeployed =
    typeof window !== 'undefined' &&
    Boolean(entranceUrl) &&
    isKioskEntranceUrlMisdeployedForHostname(entranceUrl, window.location.hostname)

  return {
    currentStoreId,
    subdomain,
    appDomain,
    kioskModeStoreOn,
    visibilityLoading,
    entranceQuery,
    registersQuery,
    qrDataUrl,
    newPassword,
    setNewPassword,
    newRegisterSortOrder,
    setNewRegisterSortOrder,
    registerSlotChoices,
    nextRegisterSlot,
    deleteTarget,
    setDeleteTarget,
    entranceBuild,
    entranceUrl,
    rotateMutation,
    createRegisterMutation,
    updateRegisterMutation,
    deleteMutation,
    printQr,
    downloadQrPdf,
    copyUrl,
    scrollToKassenmodusSection,
    canUsePublicKiosk,
    kioskUrlMisdeployed,
    prefetchKioskRouteChunks,
  }
}
