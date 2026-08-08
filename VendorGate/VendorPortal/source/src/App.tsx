import { useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Entities } from '@uipath/uipath-typescript/entities';
import VendorPage from './pages/VendorPage';
import AdminPage from './pages/AdminPage';
import { Banner, Button, Logo } from './components/ui';
import { demoService, liveService } from './service';

type Tab = 'vendor' | 'admin';

function Shell({
  tab,
  setTab,
  right,
  children,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight tracking-tight">VendorGate</h1>
              <p className="text-xs text-slate-500">Vendor onboarding &amp; risk clearance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav
              className="flex rounded-xl border border-slate-200 bg-slate-100/60 p-1"
              aria-label="Portal areas"
            >
              {(
                [
                  ['vendor', 'Vendor portal'],
                  ['admin', 'Procurement'],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  aria-current={tab === key ? 'page' : undefined}
                  className={
                    'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ' +
                    (tab === key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800')
                  }
                >
                  {label}
                </button>
              ))}
            </nav>
            {right}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 pb-8">
        <p className="text-center text-xs text-slate-400">
          VendorGate · orchestrated by UiPath Maestro · state persisted in Data Fabric
        </p>
      </footer>
    </div>
  );
}

function Portal() {
  const { isAuthenticated, isLoading, sdk, login, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('vendor');

  // No login wall: unauthenticated visitors get a fully interactive demo
  // sandbox (a real Data Fabric snapshot bundled at build time, mutated only
  // in this browser tab). Signing in upgrades to live tenant data.
  const svc = useMemo(
    () => (isAuthenticated ? liveService(new Entities(sdk)) : demoService()),
    [isAuthenticated, sdk],
  );

  if (isLoading) {
    return (
      <Shell tab={tab} setTab={setTab}>
        <p className="text-sm text-slate-500">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell
      tab={tab}
      setTab={setTab}
      right={
        svc.mode === 'demo' ? (
          <Button onClick={login} className="!px-3 !py-1.5 text-xs">
            Sign in for live data
          </Button>
        ) : (
          <Button variant="ghost" onClick={logout} className="!px-3 !py-1.5 text-xs">
            Sign out
          </Button>
        )
      }
    >
      {svc.mode === 'demo' && (
        <div className="mb-6">
          <Banner tone="info" title="Demo mode">
            You are exploring a sandboxed snapshot of real pipeline data — submissions and
            actions stay in this browser tab. Sign in with UiPath to work against live
            Data Fabric state.
          </Banner>
        </div>
      )}
      {tab === 'vendor' ? <VendorPage svc={svc} /> : <AdminPage svc={svc} />}
    </Shell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Portal />
    </AuthProvider>
  );
}
