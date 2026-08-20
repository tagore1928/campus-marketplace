import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DialogProvider } from './context/DialogContext';

// Pages
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import { Feed } from './pages/Feed';
import { CampusFeed } from './pages/CampusFeed';
import { PostDetail } from './pages/PostDetail';
import { CreatePost } from './pages/CreatePost';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

// Components
import { Sidebar } from './components/Sidebar';
import { NotificationCenter } from './components/NotificationCenter';
import { Footer } from './components/Footer';

// Domain Gating Screen — shown to users who are authenticated but have an unauthorized email domain
const DomainGatingScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // do nothing
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-4 transition-colors">
      <div className="w-full max-w-lg flex flex-col items-center text-center gap-8">
        {/* Shield Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shadow-xl shadow-rose-200/50 dark:shadow-rose-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-rose-500 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white dark:border-dark-bg animate-pulse" />
        </div>

        {/* Card */}
        <div className="w-full bg-white dark:bg-dark-surface border border-rose-200/70 dark:border-rose-900/30 rounded-3xl p-8 md:p-10 shadow-2xl shadow-rose-100/50 dark:shadow-black/30">
          <span className="inline-block px-3 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-4">
            Access Restricted
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight mb-3">
            Unauthorized Email Domain
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
            Please login using your official college email address ending with{' '}
            <span className="font-extrabold text-brand-600 dark:text-brand-400">.edu.in</span>
            {' '}or{' '}
            <span className="font-extrabold text-brand-600 dark:text-brand-400">.in</span>.
          </p>
          {user?.email && (
            <div className="mt-4 mb-6 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Signed in as</p>
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300 truncate">{user.email}</p>
            </div>
          )}
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-6">
            Campus Market is an exclusive platform for verified university students. Only accounts with institutional email addresses are permitted.
          </p>
          <button
            id="gating-signout-btn"
            onClick={handleSignOut}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20 transition-all duration-200 hover:shadow-rose-500/30 hover:scale-[1.01]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out & Use a College Email
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          Need help?{' '}
          <a href="mailto:support@campusmarket.edu.in" className="text-brand-600 dark:text-brand-400 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

// Protected Route Guard
const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Domain gating: block users whose email is not a valid .edu.in or .in domain
  const email = user.email?.toLowerCase() || '';
  const isValidDomain = email.endsWith('.edu.in') || email.endsWith('.in') || email === 'campusmarketadmin@gmail.com';

  if (!isValidDomain) {
    return <DomainGatingScreen />;
  }

  return <Outlet />;
};

// Admin Guard
const AdminRoute: React.FC = () => {
  const { profile } = useAuth();
  return profile && profile.role === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
};

// Layout Shell containing Sidebar and Notification center
const LayoutShell: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg transition-colors flex text-slate-800 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      {/* Main Page Area */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'pl-20' : 'pl-64'} flex flex-col min-h-screen relative transition-all duration-300`}>
        {/* Top Header Bar */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-light-border dark:border-dark-border bg-white/40 dark:bg-dark-surface/40 backdrop-blur-md sticky top-0 z-10">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Campus Marketplace Area
          </span>
          
          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>

        {/* View Port */}
        <main className="flex-1 bg-slate-50/50 dark:bg-dark-bg/60 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Endpoint */}
      <Route path="/auth" element={<Auth />} />

      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        <Route element={<LayoutShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/campus-feed" element={<CampusFeed />} />
          <Route path="/posts/:id" element={<CampusFeed />} />
          <Route path="/listings/:id" element={<PostDetail />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:roomId" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:uid" element={<Profile />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Admin Protected Endpoints */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>

      {/* Wildcard Fallback redirects to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DialogProvider>
          <Router>
            <AppContent />
          </Router>
        </DialogProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

