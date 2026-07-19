import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { 
  Search, 
  MapPin, 
  SlidersHorizontal,
  Plus,
  Compass,
  ShoppingBag,
  Bookmark,
  Share2
} from 'lucide-react';

const CATEGORIES = ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'];

export const Feed: React.FC = () => {
  const { profile, token } = useAuth();
  const { alert } = useDialog();
  const navigate = useNavigate();

  // Search/Filter States
  const [search, setSearch] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [type, setType] = useState('All'); // 'All' | 'selling' | 'free'
  const [category, setCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [dateRange, setDateRange] = useState('All'); // 'All' | '1' (24h) | '7' | '30'

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Fetch saved listings IDs for highlights
  const fetchSavedIds = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/posts/saved/ids');
      setSavedIds(res.data);
    } catch (err) {
      console.error('Error fetching saved post IDs:', err);
    }
  };

  useEffect(() => {
    fetchSavedIds();
  }, [token]);

  const handleToggleSave = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      alert('Please log in to save listings.', 'Authentication Required');
      return;
    }
    const isSaved = savedIds.includes(postId);
    
    // Optimistic Update
    if (isSaved) {
      setSavedIds((prev) => prev.filter((id) => id !== postId));
    } else {
      setSavedIds((prev) => [...prev, postId]);
    }

    try {
      if (isSaved) {
        await axios.post(`/api/posts/${postId}/unsave`);
      } else {
        await axios.post(`/api/posts/${postId}/save`);
      }
    } catch (err) {
      // Revert on error
      if (isSaved) {
        setSavedIds((prev) => [...prev, postId]);
      } else {
        setSavedIds((prev) => prev.filter((id) => id !== postId));
      }

      if (axios.isAxiosError(err) && err.response?.data?.message) {
        alert(err.response.data.message, 'Error');
      } else {
        console.error('Error toggling save:', err);
      }
    }
  };

  const handleShare = async (post: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/listings/${post.id}`;
    const shareData = {
      title: post.title,
      text: `Check out "${post.title}" on CampusMarket!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.warn('Native sharing failed, copying link instead.', err);
        copyLinkToClipboard(shareUrl);
      }
    } else {
      copyLinkToClipboard(shareUrl);
    }
  };

  const copyLinkToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Listing link copied to clipboard!', 'Success');
  };

  // Fetch feed list
  const fetchFeedList = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      // Live search param
      if (search.trim()) params.search = search;
      
      // College Specific vs Global Feed
      if (!isGlobal && profile) {
        params.college = profile.college;
      } else {
        params.college = 'Global';
      }

      if (type !== 'All') params.type = type;
      if (category !== 'All') params.category = category;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      
      if (dateRange !== 'All') {
        params.days = dateRange;
      }

      const res = await axios.get('/api/posts', { params });
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching feed list:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when parameters update
  useEffect(() => {
    fetchFeedList();
  }, [search, isGlobal, type, category, minPrice, maxPrice, dateRange, profile]);

  return (
    <div className="p-8 max-w-6xl mx-auto fade-in">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 text-left">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Marketplace Feed
          </h2>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Browse trade items active in your community.
          </p>
        </div>

        <button
          onClick={() => navigate('/create-post')}
          className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/10 cursor-pointer transition-all duration-200 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          List New Item
        </button>
      </div>

      {/* Search Bar + Filters Action */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search listings by title, category, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-205 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold shadow-sm transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4.5 py-3 border border-light-border dark:border-dark-border rounded-xl font-bold text-sm cursor-pointer shadow-sm transition-all ${
              showFilters 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
                : 'bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>

          {/* Campus vs Global Switcher */}
          <button
            onClick={() => setIsGlobal(!isGlobal)}
            className={`flex items-center gap-2 px-4.5 py-3 rounded-xl font-bold text-sm cursor-pointer shadow-sm border transition-all ${
              !isGlobal
                ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-900/20 text-brand-605 dark:text-brand-400'
                : 'bg-white dark:bg-dark-surface border-light-border dark:border-dark-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
            }`}
          >
            {isGlobal ? <Compass className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            {isGlobal ? 'Global Feed' : `${profile?.college || 'Campus'} Feed`}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-6 mb-8 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 fade-in text-left">
          {/* Listing Type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Offer Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-200 focus:outline-none text-sm font-bold cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="selling">Selling</option>
              <option value="free">Free Stuff</option>
            </select>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-205 focus:outline-none text-sm font-bold cursor-pointer"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price Limits</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-3.5 text-xs text-slate-450 font-bold">₹</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-205 focus:outline-none text-sm font-bold"
                />
              </div>
              <span className="text-slate-400">-</span>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-3.5 text-xs text-slate-450 font-bold">₹</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-205 focus:outline-none text-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Posted</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-205 focus:outline-none text-sm font-bold cursor-pointer"
            >
              <option value="All">Anytime</option>
              <option value="1">Last 24 Hours</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Feed Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[360px] flex flex-col bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm p-4 gap-4">
              <div className="skeleton-box h-1/2 w-full rounded-xl" />
              <div className="h-1/2 flex flex-col justify-between py-1 text-left">
                <div className="flex flex-col gap-2">
                  <div className="skeleton-box w-1/4 h-3 rounded" />
                  <div className="skeleton-box w-full h-5 rounded" />
                  <div className="skeleton-box w-2/3 h-3 rounded" />
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="skeleton-box w-1/3 h-3.5 rounded" />
                  <div className="skeleton-box w-1/5 h-4 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No active listings found</h3>
          <p className="text-sm font-semibold text-slate-405 max-w-sm mx-auto mt-1.5 leading-relaxed">
            We couldn't find any items matching your filters. Try adjusting your search query or college selection!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/listings/${post.id}`)}
              className="h-[360px] flex flex-col bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer hover:border-brand-500/40 group transition-all duration-300"
            >
              {/* Image Container */}
              <div className="h-1/2 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0">
                {post.images && post.images[0] ? (
                  <img
                    src={post.images[0]}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-650 bg-slate-100 dark:bg-slate-900">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
                
                {/* Type Badge */}
                <span className={`absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                  post.type === 'free'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-brand-600 text-white'
                }`}>
                  {post.type === 'free' ? 'Free' : 'Selling'}
                </span>

                {/* Masked/Anonymous indicator */}
                {post.anonymous && (
                  <span className="absolute bottom-3.5 left-3.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-900/60 text-white backdrop-blur-md">
                    Anonymous
                  </span>
                )}

                {/* Save/Bookmark Button */}
                {(!profile || profile.uid !== post.creatorId) && (
                  <button
                    onClick={(e) => handleToggleSave(post.id, e)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-white/85 dark:bg-dark-surface/85 hover:bg-white dark:hover:bg-dark-surface text-slate-700 dark:text-slate-200 border border-light-border dark:border-dark-border cursor-pointer transition-all duration-200 hover:scale-105 shadow-sm pointer-events-auto"
                  >
                    <Bookmark
                       className={`w-3.5 h-3.5 transition-colors duration-200 ${
                        savedIds.includes(post.id) ? 'fill-brand-600 text-brand-600' : 'text-slate-450 dark:text-slate-400'
                      }`}
                    />
                  </button>
                )}

                {/* Share Button */}
                <button
                  onClick={(e) => handleShare(post, e)}
                  className={`absolute top-3 p-2 rounded-xl bg-white/85 dark:bg-dark-surface/85 hover:bg-white dark:hover:bg-dark-surface text-slate-750 border border-light-border dark:border-dark-border cursor-pointer transition-all duration-200 hover:scale-105 shadow-sm pointer-events-auto ${
                    (!profile || profile.uid !== post.creatorId) ? 'right-13' : 'right-3'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-500" />
                </button>

              </div>

              {/* Details */}
              <div className="h-1/2 p-5 flex flex-col justify-between text-left">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                      {post.category}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1 leading-tight text-base mb-1.5">
                    {post.title}
                  </h3>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>
                </div>

                {/* Footer details */}
                <div className="flex items-center justify-between mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <div className="flex items-center gap-1 text-slate-450 dark:text-slate-405">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold truncate max-w-[120px]">{post.college}</span>
                  </div>
                  
                  <span className="font-extrabold text-base text-slate-900 dark:text-white leading-none">
                    {post.type === 'free' ? 'FREE' : `₹${post.price}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
