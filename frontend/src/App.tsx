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

  return user ? <Outlet /> : <Navigate to="/auth" replace />;
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

