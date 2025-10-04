import './styles/theme.css';
import './globals.css';
import { Inter } from 'next/font/google';
import Nav from '@/app/components/Nav';
import Sidebar from '@/app/components/Sidebar';
import TopNav from './components/TopNav';
import { AuthProvider } from './components/AuthProvider';
import { ToastProvider } from './components/ToastProvider';
import DebugToggle from './components/DebugToggle';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Subway Admin',
  description: 'Admin dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // DEV BYPASS: skip auth in development when flag is on
  const devBypass =
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' ||
    process.env.NODE_ENV !== 'production';

  if (devBypass) {
    return (
      <html lang="en">
        <body className={`${inter.className} s-page`}>
          <ToastProvider>
            <div className="shell">
              <Sidebar />
              <div className="shell-main">
                <Nav />
                {children}
              </div>
            </div>
            <DebugToggle />
          </ToastProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={`${inter.className} s-page`}>
        <ToastProvider>
          <div className="shell">
            <Sidebar />
            <div className="shell-main">
              <Nav />
              <AuthProvider>
                <TopNav />
                <div className="container mx-auto flex-1">{children}</div>
              </AuthProvider>
            </div>
          </div>
          <DebugToggle />
        </ToastProvider>
      </body>
    </html>
  );
}
