import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Sparkles, 
  ShoppingBag, 
  PlusCircle, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  ShieldCheck 
} from 'lucide-react';

export const Home: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeListings: 0,
    yourListings: 0,
    unreadChats: 0
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        // Fetch all active posts
        const postsRes = await axios.get('/api/posts');
        const activeCount = postsRes.data.length;

        // Fetch user's own posts
        const ownPostsRes = await axios.get(`/api/posts?creatorId=${profile?.uid}`);
        const ownCount = ownPostsRes.data.length;

        // Fetch active chats count
        const chatsRes = await axios.get('/api/chats');
        const unreadCount = chatsRes.data.filter((c: any) => {
          if (c.buyerId === profile?.uid) return c.unreadByBuyer;
          if (c.sellerId === profile?.uid) return c.unreadBySeller;
          return false;
        }).length;

        setStats({
          activeListings: activeCount,
          yourListings: ownCount,
          unreadChats: unreadCount
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };

    if (profile) {
      fetchDashboardStats();
    }
  }, [profile]);

  return (
    <div className="p-8 max-w-6xl mx-auto fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-accent-pink rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden mb-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-full w-fit mb-6 text-xs font-bold backdrop-blur-sm border border-white/10">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Welcome to Campus Market</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Hey, {profile?.name || 'Student'}!
          </h2>
          <p className="text-brand-100 font-medium max-w-xl text-sm md:text-base leading-relaxed">
            Your centralized peer-to-peer campus trading platform. Discover textbooks, tools, electronics, and dorm needs, verified within your college community.
          </p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Active Feeds</span>
            <div className="bg-brand-50 dark:bg-brand-900/10 p-2 rounded-xl text-brand-600 dark:text-brand-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            {stats.activeListings}
          </p>
          <span className="text-xs font-semibold text-slate-400">Live listings posted in your area</span>
        </div>

        <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">My Listings</span>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            {stats.yourListings}
          </p>
          <span className="text-xs font-semibold text-slate-400">Items you have currently put up for trade</span>
        </div>

        <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Unread Chats</span>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded-xl text-amber-600 dark:text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
            {stats.unreadChats}
          </p>
          <span className="text-xs font-semibold text-slate-400">Conversations awaiting your response</span>
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => navigate('/feed')}
          className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer hover:border-brand-500/50 dark:hover:border-brand-500/40 group transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-brand-600/10 group-hover:scale-105 transition-all">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-slate-150 mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            Browse Feed
          </h4>
          <p className="text-xs font-medium text-slate-400 leading-relaxed">
            Search items in your college feed, filter by categories, and buy products.
          </p>
        </div>

        <div
          onClick={() => navigate('/create-post')}
          className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer hover:border-brand-500/50 dark:hover:border-brand-500/40 group transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-600/10 group-hover:scale-105 transition-all">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-slate-150 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            Sell or Share Item
          </h4>
          <p className="text-xs font-medium text-slate-400 leading-relaxed">
            List an item for trade, choose a selling price, or share it for free.
          </p>
        </div>

        <div
          onClick={() => navigate('/chat')}
          className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer hover:border-brand-500/50 dark:hover:border-brand-500/40 group transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-amber-600/10 group-hover:scale-105 transition-all">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-800 dark:text-slate-150 mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            Open Chat Pane
          </h4>
          <p className="text-xs font-medium text-slate-400 leading-relaxed">
            View active chat channels with buyers and sellers, and send messages.
          </p>
        </div>
      </div>
    </div>
  );
};
