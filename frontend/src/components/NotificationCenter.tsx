import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, MessageSquare, ShoppingBag, ShieldAlert, Award, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface AlertNotification {
  id: string;
  userId: string;
  type: 'message' | 'product' | 'review' | 'report';
  title: string;
  content: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export const NotificationCenter: React.FC = () => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [activeToasts, setActiveToasts] = useState<AlertNotification[]>([]);

  // Set up real-time firestore notification updates
  useEffect(() => {
    if (!token || !user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifs: AlertNotification[] = [];
      snapshot.forEach((doc) => {
        fetchedNotifs.push({ id: doc.id, ...doc.data() } as AlertNotification);
      });

      setNotifications((prev) => {
        // Detect new arrivals to trigger toast displays
        const newNotifs = fetchedNotifs.filter(
          (n) => !prev.some((p) => p.id === n.id)
        );

        newNotifs.forEach((data) => {
          const isChatPage = window.location.pathname === '/chat';
          const shouldToast = !isChatPage || data.type !== 'message';

          if (shouldToast) {
            setActiveToasts((t) => [...t, data]);
            setTimeout(() => {
              setActiveToasts((t) => t.filter((item) => item.id !== data.id));
            }, 5000);
          }
        });

        return fetchedNotifs;
      });
    }, (err) => {
      console.error('Error listening to notifications:', err);
    });

    return () => {
      unsubscribe();
    };
  }, [token, user]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: AlertNotification) => {
    try {
      await axios.patch(`/api/notifications/${notif.id}/read`);
    } catch (err) {
      console.error('Error marking notification read:', err);
    }

    setIsOpen(false);

    if (notif.type === 'message') {
      navigate('/chat');
    } else if (notif.type === 'product') {
      navigate(notif.link);
    } else if (notif.type === 'review') {
      navigate('/profile');
    } else if (notif.type === 'report') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post('/api/notifications/read-all');
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete('/api/notifications/clear-all');
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-brand-500" />;
      case 'product':
        return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      case 'report':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'review':
        return <Award className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-all duration-200"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-bg animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-hidden rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface shadow-2xl z-50 flex flex-col fade-in">
          <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
            <h3 className="font-bold text-slate-850 dark:text-slate-100">Notifications</h3>
          </div>

          <div className="overflow-y-auto divide-y divide-light-border dark:divide-dark-border flex-1 max-h-[300px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <p className="text-sm font-semibold">All caught up!</p>
                <p className="text-xs">No notifications to show.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer flex gap-3 transition-colors ${
                    !notif.read ? 'bg-brand-50/30 dark:bg-brand-950/10' : ''
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 self-start">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start gap-1">
                      <p className={`text-xs font-bold truncate ${!notif.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 bg-slate-550/5 dark:bg-slate-900/40 border-t border-light-border dark:border-dark-border flex items-center justify-between gap-4 shrink-0">
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors"
              >
                Mark all read
              </button>
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => {
              handleNotificationClick(toast);
              setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }}
            className="pointer-events-auto bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border p-4 rounded-2xl shadow-2xl flex gap-3 items-start cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 transform translate-y-0 animate-slide-in"
          >
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-100 truncate">{toast.title}</h4>
              <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{toast.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
