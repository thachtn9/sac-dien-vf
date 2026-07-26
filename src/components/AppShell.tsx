import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'

export function ConfigBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <strong>Chưa cấu hình Supabase.</strong> Sao chép{' '}
      <code className="rounded bg-amber-100 px-1">.env.example</code> thành{' '}
      <code className="rounded bg-amber-100 px-1">.env</code>, điền URL và anon key, rồi chạy{' '}
      <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code> trên Dashboard.
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <ConfigBanner />
      <header className="sticky top-0 z-20 border-b border-white/40 bg-vf-navy/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-vf-teal">
              VinFast Charge
            </p>
            <h1 className="truncate text-lg font-bold">Quản lý trạm sạc</h1>
          </Link>
          <nav className="flex shrink-0 items-center gap-1 text-sm">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              Trạm
            </Link>
            <Link
              to="/history"
              className="rounded-lg px-3 py-2 text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              Lịch sử
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
