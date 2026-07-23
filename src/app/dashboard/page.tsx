'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ShieldAlert, Server, RefreshCw, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react'

interface SystemSettings {
  id: string
  client_maintenance: boolean
  admin_maintenance: boolean
  updated_at?: string
}

interface ModalState {
  isOpen: boolean
  type: 'client' | 'admin'
  isEnabling: boolean
  appName: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [modalState, setModalState] = useState<ModalState | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUserAndFetchSettings()
  }, [])

  const checkUserAndFetchSettings = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || null)

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error
      setSettings(data)
    } catch (error: any) {
      console.error('Error fetching settings:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load system settings. Verify Supabase table & RLS policies.'
      })
    } finally {
      setLoading(false)
    }
  }

  const openConfirmationModal = (type: 'client' | 'admin') => {
    if (!settings) return
    const isCurrentlyActive = type === 'client' ? settings.client_maintenance : settings.admin_maintenance
    const appName = type === 'client' ? 'Client App (nexobank.com)' : 'Admin Panel (CDNT-admin-panel)'

    setModalState({
      isOpen: true,
      type,
      isEnabling: !isCurrentlyActive,
      appName
    })
  }

  const handleConfirmToggle = async () => {
    if (!settings || !modalState) return

    const { type, isEnabling, appName } = modalState
    const key = type === 'client' ? 'client_maintenance' : 'admin_maintenance'

    try {
      setUpdating(type)
      setNotification(null)

      const updates = {
        [key]: isEnabling,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('system_settings')
        .update(updates)
        .eq('id', settings.id)

      if (error) throw error

      setSettings(prev => prev ? { ...prev, ...updates } : null)
      setNotification({
        type: 'success',
        message: `Maintenance mode for ${appName} successfully ${isEnabling ? 'ENABLED' : 'DISABLED'}.`
      })
    } catch (error: any) {
      console.error('Error updating settings:', error)
      setNotification({
        type: 'error',
        message: 'Failed to update maintenance settings: ' + error.message
      })
    } finally {
      setUpdating(null)
      setModalState(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-slate-400 text-sm font-medium">Loading Master Control Panel...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative">
      {/* Header Bar */}
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <ShieldAlert className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white leading-tight">Master Control Panel</h1>
                <p className="text-xs text-slate-400">Nexo Bank Global Infrastructure</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{userEmail}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-700 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
              >
                <LogOut className="h-4 w-4 text-slate-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium animate-in fade-in duration-200 ${notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 transition-opacity ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Title Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <Server className="h-6 w-6 text-emerald-500" />
              <span>System Maintenance Controls</span>
            </h2>
            <button
              onClick={checkUserAndFetchSettings}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 rounded-xl border border-slate-700 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Instantly control maintenance access across all production services. Toggling maintenance mode blocks non-admin traffic globally within seconds.
          </p>
        </div>

        {/* Control Cards Grid */}
        <div className="grid gap-6">
          {/* Client Application Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:border-slate-700/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Client App</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  Nexo Bank
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Controls access for general clients, traders, and public site users.
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-slate-800 pt-4 sm:pt-0">
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${settings?.client_maintenance
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${settings?.client_maintenance ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                  ></span>
                  {settings?.client_maintenance ? 'MAINTENANCE ACTIVE' : 'SYSTEM ONLINE'}
                </span>
              </div>

              <button
                onClick={() => openConfirmationModal('client')}
                disabled={updating !== null}
                className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${settings?.client_maintenance ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${settings?.client_maintenance ? 'translate-x-7' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Admin Panel Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:border-slate-700/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Admin Panel</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  CDNT-admin-panel
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Controls access to the main administrative panel and operational staff tools.
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-slate-800 pt-4 sm:pt-0">
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${settings?.admin_maintenance
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${settings?.admin_maintenance ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                  ></span>
                  {settings?.admin_maintenance ? 'MAINTENANCE ACTIVE' : 'SYSTEM ONLINE'}
                </span>
              </div>

              <button
                onClick={() => openConfirmationModal('admin')}
                disabled={updating !== null}
                className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${settings?.admin_maintenance ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${settings?.admin_maintenance ? 'translate-x-7' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Confirmation Modal */}
      {modalState?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Modal Ambient Glow Accent */}
            <div
              className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${modalState.isEnabling ? 'bg-rose-500/20' : 'bg-emerald-500/20'
                }`}
            />

            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl border ${modalState.isEnabling
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                >
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {modalState.isEnabling ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{modalState.appName}</p>
                </div>
              </div>

              <button
                onClick={() => setModalState(null)}
                disabled={updating !== null}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Message */}
            <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              {modalState.isEnabling ? (
                <span>
                  Are you sure you want to <strong className="text-rose-400">ENABLE</strong> maintenance mode for{' '}
                  <span className="text-white font-medium">{modalState.appName}</span>? Active users will be
                  instantly redirected to the maintenance page globally.
                </span>
              ) : (
                <span>
                  Are you sure you want to <strong className="text-emerald-400">DISABLE</strong> maintenance mode for{' '}
                  <span className="text-white font-medium">{modalState.appName}</span>? Normal user access will be
                  restored immediately across all regions.
                </span>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalState(null)}
                disabled={updating !== null}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={updating !== null}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-lg focus:outline-none transition-all ${modalState.isEnabling
                  ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500 shadow-emerald-600/20'
                  }`}
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>{modalState.isEnabling ? 'Enable Maintenance' : 'Disable Maintenance'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
