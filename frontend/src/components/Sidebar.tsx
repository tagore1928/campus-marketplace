import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import { 
  Home, 
  ShoppingBag, 
  MessageSquare, 
  PlusCircle, 
  User, 
  ShieldCheck, 
  LogOut, 
  Sun, 
  Moon,
  Sparkles,
  Menu,
  Rss
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse }) => {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { confirm } = useDialog();

  const navLinks = [
    { to: '/', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { to: '/feed', label: 'Feed', icon: <ShoppingBag className="w-5 h-5" /> },
    { to: '/campus-feed', label: 'Campus Feed', icon: <Rss className="w-5 h-5" /> },
    { to: '/chat', label: 'Chats', icon: <MessageSquare className="w-5 h-5" /> },
    { to: '/create-post', label: 'Sell Item', icon: <PlusCircle className="w-5 h-5" /> },
    { to: '/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];


  if (profile && profile.role === 'admin') {
    navLinks.push({ to: '/admin', label: 'Admin Logs', icon: <ShieldCheck className="w-5 h-5" /> });
  }

  const handleLogout = async () => {
    const confirmed = await confirm(
      'Are you sure you want to log out? You will need to sign in again to access listings, feeds, and chats.',
      'Confirm Logout',
      { confirmLabel: 'Log Out', cancelLabel: 'Stay Logged In' }
    );
    if (confirmed) {
      await logout();
    }
  };

  return (
    <aside className={`${isCollapsed ? 'w-20 p-3' : 'w-64 p-6'} h-screen fixed top-0 left-0 bg-white dark:bg-dark-surface border-r border-light-border dark:border-dark-border flex flex-col justify-between z-20 transition-all duration-300`}>
      <div className="flex flex-col gap-8">
        {/* Title Logo & Toggle */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-4">
            <Link to="/" title="CampusMarket Home" className="bg-brand-600 p-2.5 rounded-2xl text-white shadow-lg shadow-brand-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </Link>
            <button
              onClick={toggleCollapse}
              title="Expand menu"
              className="p-1.5 rounded-lg border border-light-border dark:border-dark-border text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-brand-600 p-2.5 rounded-2xl text-white shadow-lg shadow-brand-500/20">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-accent-pink bg-clip-text text-transparent leading-none">
                  Campus
                </h1>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">
                  Market
                </span>
              </div>
            </Link>
            <button
              onClick={toggleCollapse}
              title="Collapse menu"
              className="p-1.5 rounded-lg border border-light-border dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User Card */}
        {profile && (
          isCollapsed ? (
            <div className="flex justify-center p-2 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-2xl" title={`${profile.name} (${profile.college})`}>
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-base uppercase shadow-sm">
                {profile.name[0]}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-sm">
                {profile.name[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-205 truncate leading-tight">
                  {profile.name}
                </p>
                <p className="text-xs font-medium text-slate-400 truncate leading-tight">
                  {profile.college}
                </p>
              </div>
            </div>
          )
        )}

        {/* Nav list */}
        <nav className="flex flex-col gap-1.5">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              title={isCollapsed ? link.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3.5 px-4 py-3'} rounded-xl font-semibold text-sm transition-all duration-205 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              {link.icon}
              {!isCollapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-4 py-3'} rounded-xl border border-light-border dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer font-semibold text-sm transition-all`}
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-brand-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
            {!isCollapsed && <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
          </div>
          {!isCollapsed && (
            <div className="w-8 h-4 rounded-full bg-slate-200 dark:bg-slate-700 relative flex items-center transition-all">
              <span className={`w-3.5 h-3.5 rounded-full bg-white absolute transition-all duration-300 ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`} />
            </div>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'} rounded-xl text-rose-650 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 font-semibold text-sm cursor-pointer transition-all duration-200`}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};



