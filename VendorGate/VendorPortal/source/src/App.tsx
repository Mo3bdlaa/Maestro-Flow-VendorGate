import { useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Entities } from '@uipath/uipath-typescript/entities';
import VendorPage from './pages/VendorPage';
import AdminPage from './pages/AdminPage';
import { Banner, Button, Logo } from './components/ui';

type Tab = 'vendor' | 'admin';

function Shell({
  tab,
  setTab,
  onLogout,
  children,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onLogout?: () => void;
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
            {onLogout && (
              <Button variant="ghost" onClick={onLogout} className="!px-3 !py-1.5 text-xs">
                Sign out
              </Button>
            )}
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
  const { isAuthenticated, isLoading, sdk, login, logout, error } = useAuth();
  const [tab, setTab] = useState<Tab>('vendor');
  const entities = useMemo(() => new Entities(sdk), [sdk]);

  if (isLoading) {
    return (
      <Shell tab={tab} setTab={setTab}>
        <p className="text-sm text-slate-500">Loading…</p>
      </Shell>
    );
  }

  if (!isAuthenticated) {
    return (
      <Shell tab={tab} setTab={setTab}>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <Logo className="h-10 w-10" />
          <h2 className="mt-4 text-xl font-semibold tracking-tight">Sign in to continue</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Suppliers register and follow their clearance here. Procurement reviews every
            application, the screening evidence, and the agents&apos; recommendations.
          </p>
          {error && (
            <div className="mt-4">
              <Banner tone="bad">{error}</Banner>
            </div>
          )}
          <Button onClick={login} className="mt-6 w-full sm:w-auto">
            Sign in with UiPath
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell tab={tab} setTab={setTab} onLogout={logout}>
      {tab === 'vendor' ? <VendorPage entities={entities} /> : <AdminPage entities={entities} />}
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
