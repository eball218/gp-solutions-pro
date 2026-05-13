'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Briefcase, Calendar, FileText,
  Receipt, Clock, TrendingUp, UserPlus, Settings, DollarSign,
  Map, X, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Counts {
  schedule:  number
  jobs:      number
  leads:     number
  estimates: number
  invoices:  number
}

type Variant = 'default' | 'warning' | 'error'

const BADGE_STYLES: Record<Variant, string> = {
  default: 'bg-teal-500/20 text-teal-300',
  warning: 'bg-amber-500/20 text-amber-300',
  error:   'bg-red-500/20  text-red-300',
}

const NAV = [
  { name: 'Dashboard', href: '/',          icon: LayoutDashboard },
  { name: 'Schedule',  href: '/schedule',  icon: Calendar,   count: (c: Counts) => c.schedule,  variant: 'default' as Variant },
  { name: 'Jobs',      href: '/jobs',      icon: Briefcase,  count: (c: Counts) => c.jobs,      variant: 'default' as Variant },
  { name: 'Route',     href: '/route',     icon: Map },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Leads',     href: '/leads',     icon: UserPlus,   count: (c: Counts) => c.leads,     variant: 'warning' as Variant },
  { name: 'Estimates', href: '/estimates', icon: FileText,   count: (c: Counts) => c.estimates, variant: 'default' as Variant },
  { name: 'Invoices',  href: '/invoices',  icon: Receipt,    count: (c: Counts) => c.invoices,  variant: 'error'   as Variant },
  { name: 'Time',      href: '/time',      icon: Clock },
  { name: 'Expenses',  href: '/expenses',  icon: DollarSign },
  { name: 'Reports',   href: '/reports',   icon: TrendingUp },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useStore()
  const [counts, setCounts] = useState<Counts>({ schedule: 0, jobs: 0, leads: 0, estimates: 0, invoices: 0 })

  useEffect(() => {
    async function refresh() {
      const today = new Date().toISOString().split('T')[0]
      const [
        { count: sched },
        { count: jobs  },
        { count: leads },
        { count: ests  },
        { count: invs  },
      ] = await Promise.all([
        supabase.from('jobs').select('*', { count: 'exact', head: true })
          .eq('scheduled_date', today).not('status', 'eq', 'cancelled'),
        supabase.from('jobs').select('*', { count: 'exact', head: true })
          .in('status', ['scheduled', 'in_progress']),
        supabase.from('leads').select('*', { count: 'exact', head: true })
          .not('status', 'in', '("won","lost")'),
        supabase.from('estimates').select('*', { count: 'exact', head: true })
          .in('status', ['draft', 'sent']),
        supabase.from('invoices').select('*', { count: 'exact', head: true })
          .in('status', ['sent', 'partial', 'overdue']),
      ])
      setCounts({ schedule: sched ?? 0, jobs: jobs ?? 0, leads: leads ?? 0, estimates: ests ?? 0, invoices: invs ?? 0 })
    }
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [])

  const isCollapsed = sidebarCollapsed && !sidebarOpen

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>
      <aside className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-out',
        'bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800',
        isCollapsed ? 'w-[72px]' : 'w-72',
        '-translate-x-full lg:translate-x-0',
        sidebarOpen && 'translate-x-0 w-72',
      )}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3 overflow-hidden"
            onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}>
            <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">GP</div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap">
                  <span className="font-semibold text-white text-lg">GP Solutions</span>
                  <div className="flex items-center gap-1 text-xs text-teal-400"><Sparkles size={10} /><span>Pro</span></div>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
          <button onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden">
            <X size={20} />
          </button>
        </div>
        <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const badge = 'count' in item ? item.count(counts) : 0
            const showBadge = badge > 0
            return (
              <Link key={item.href} href={item.href}
                onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl transition-all duration-200 group relative',
                  isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-4 py-2.5',
                  isActive ? 'bg-gradient-to-r from-teal-500/20 to-transparent text-white'
                    : 'text-stone-400 hover:text-white hover:bg-white/5',
                )}>
                <div className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0',
                  isActive ? 'bg-teal-500/20 text-teal-400' : 'text-stone-500 group-hover:text-stone-300')}>
                  <item.icon size={18} />
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }} className="font-medium overflow-hidden whitespace-nowrap">
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {showBadge && (
                  <span className={cn(
                    'text-xs font-semibold rounded-full',
                    isCollapsed
                      ? 'absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[10px]'
                      : 'ml-auto px-2 py-0.5',
                    BADGE_STYLES[('variant' in item ? item.variant : 'default') as Variant],
                  )}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {isActive && !isCollapsed && !showBadge && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
                )}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-white/10 space-y-1">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn('hidden lg:flex items-center gap-3 w-full rounded-xl transition-all duration-200',
              'text-stone-400 hover:text-white hover:bg-white/5',
              isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-4 py-2.5')}>
            <div className="p-1.5 rounded-lg text-stone-500">
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }} className="font-medium overflow-hidden whitespace-nowrap">
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <Link href="/settings"
            onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
            title={isCollapsed ? 'Settings' : undefined}
            className={cn('flex items-center gap-3 rounded-xl transition-all duration-200',
              isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-4 py-2.5',
              pathname.startsWith('/settings')
                ? 'bg-gradient-to-r from-teal-500/20 to-transparent text-white'
                : 'text-stone-400 hover:text-white hover:bg-white/5')}>
            <div className={cn('p-1.5 rounded-lg flex-shrink-0',
              pathname.startsWith('/settings') ? 'bg-teal-500/20 text-teal-400' : 'text-stone-500')}>
              <Settings size={18} />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }} className="font-medium overflow-hidden whitespace-nowrap">
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </aside>
    </>
  )
}
