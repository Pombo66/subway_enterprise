import './globals.css';
import './styles/theme.css';
import { Inter } from 'next/font/google';
import Nav from '@/app/components/Nav';
import Sidebar from '@/app/components/Sidebar';
import TopNav from './components/TopNav';
import { AuthProvider } from './components/AuthProvider';
import { ToastProvider } from './components/ToastProvider';
import { DesignGuardProvider } from './components/DesignGuardProvider';
import { SubMindProvider } from './components/submind/SubMindProvider';
import DebugToggle from './components/DebugToggle';
import ValidationTestingSetup from './components/ValidationTestingSetup';
import { config } from '@/lib/config';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Subway Admin',
  description: 'Admin dashboard for Subway Enterprise',
};

interface LayoutContentProps {
  children: React.ReactNode;
  withAuth?: boolean;
}

function LayoutContent({ children, withAuth = false }: LayoutContentProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} s-page`} style={{ background: '#0f1724', color: '#e6edf3', minHeight: '100vh' }}>
        <ToastProvider>
          <DesignGuardProvider enabled={config.isDevelopment}>
            <SubMindProvider>
              <div className="shell">
                <Sidebar />
                <div className="shell-main">
                  <Nav />
                  {withAuth ? (
                    <AuthProvider>
                      <TopNav />
                      <div className="container mx-auto flex-1">{children}</div>
                    </AuthProvider>
                  ) : (
                    children
                  )}
                </div>
              </div>
              {config.isDebugMode && <DebugToggle />}
              <ValidationTestingSetup />
            </SubMindProvider>
          </DesignGuardProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use centralized configuration for auth bypass
  const shouldBypassAuth = config.isDevAuthBypass;

  return (
    <LayoutContent withAuth={!shouldBypassAuth}>
      {children}
    </LayoutContent>
  );
}
