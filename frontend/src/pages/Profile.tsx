import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import {
  User,
  MapPin,
  EyeOff,
  Eye,
  ShoppingBag,
  History,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Sparkles,
  Edit,
  Globe,
  Bookmark,
  Share2,
  MessageSquare,
  Rss,
  Star,
  Send,
  Loader2,
  Trash2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { deobfuscateUid } from '../utils/obfuscate';

const PREDEFINED_COLLEGES = [
  'IIT Bombay',
  'IIT Delhi',
  'BITS Pilani',
  'VIT Vellore',
  'RV College of Engineering',
  'Other / Enter Custom...'
];

export const Profile: React.FC = () => {
  const [collegesList, setCollegesList] = useState<string[]>(PREDEFINED_COLLEGES);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await axios.get('/api/auth/colleges');
        setCollegesList([...res.data, 'Other / Enter Custom...']);
      } catch (err) {
        console.error('Error loading colleges list:', err);
      }
    };
    fetchColleges();
  }, []);
  const { profile: myProfile, updateAnonymousMode, updateProfileDetails, token } = useAuth();
  const { alert, confirm } = useDialog();
  const navigate = useNavigate();
  const { uid } = useParams<{ uid?: string }>();
  const deobfuscatedParamUid = uid ? deobfuscateUid(uid) : undefined;

  const isOwnProfile = !uid || deobfuscatedParamUid === myProfile?.uid;
  const targetUid = isOwnProfile ? myProfile?.uid : deobfuscatedParamUid;

  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [revealedProfileIdentity, setRevealedProfileIdentity] = useState<{ name: string; email: string } | null>(null);
  const [revealingProfileIdentity, setRevealingProfileIdentity] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archive' | 'saved' | 'listings' | 'posts' | 'reviews'>('active');
  
  const [userListings, setUserListings] = useState<any[]>([]);
  const [userSocialPosts, setUserSocialPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Profile editing state variables
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editCustomCollege, setEditCustomCollege] = useState('');
  const [editProfileLoading, setEditProfileLoading] = useState(false);

  // Review submission state variables
  const [newThumbsUp, setNewThumbsUp] = useState<boolean | null>(null);
  const [newContent, setNewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Review Edit state variables
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewThumbsUp, setEditReviewThumbsUp] = useState(true);
  const [reviewUpdateLoading, setReviewUpdateLoading] = useState(false);

  const handleUpdateReview = async (reviewId: string) => {
    if (!editReviewText.trim()) return;
    setReviewUpdateLoading(true);
    try {
      const res = await axios.put(`/api/reviews/${reviewId}`, {
        thumbsUp: editReviewThumbsUp,
        content: editReviewText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.data : r)));
      setEditingReviewId(null);
      alert('Review updated successfully.', 'Success');
      fetchProfileAndMetrics();
    } catch (err: any) {
      console.error('Failed to update review:', err);
      alert(err.response?.data?.message || 'Failed to update review.', 'Error');
    } finally {
      setReviewUpdateLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = await confirm('Are you sure you want to permanently delete your review?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      alert('Review deleted successfully.', 'Success');
      fetchProfileAndMetrics();
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      alert(err.response?.data?.message || 'Failed to delete review.', 'Error');
    }
  };

  const fetchProfileAndMetrics = async () => {
    if (!targetUid || !token) return;
    setLoadingProfile(true);
    try {
      // Fetch target profile info
      if (isOwnProfile) {
        setTargetProfile(myProfile);
      } else {
        const profileRes = await axios.get(`/api/auth/profile/${targetUid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTargetProfile(profileRes.data);
      }

      // Fetch reviews
      const reviewsRes = await axios.get(`/api/reviews/${targetUid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(reviewsRes.data);
    } catch (err) {
      console.error('Failed to load user profile metrics:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchUserPostsAndListings = async () => {
    if (!targetUid) return;
    setLoadingListings(true);
    try {
      // Fetch listings
      const postsRes = await axios.get(`/api/posts?creatorId=${targetUid}`);
      setUserListings(postsRes.data);

      // Fetch social posts
      const socialRes = await axios.get(`/api/social-feed?creatorId=${targetUid}`);
      setUserSocialPosts(socialRes.data);
    } catch (err) {
      console.error('Error fetching user content:', err);
    } finally {
      setLoadingListings(false);
    }
  };

  const fetchSavedPosts = async () => {
    if (!token) return;
    setLoadingSaved(true);
    try {
      const res = await axios.get('/api/posts/saved');
      setSavedPosts(res.data);
    } catch (err) {
      console.error('Error fetching saved posts:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    // Determine target tab based on profile ownership
    if (isOwnProfile) {
      if (activeTab === 'listings' || activeTab === 'posts' || activeTab === 'reviews') {
        setActiveTab('active');
      }
    } else {
      if (activeTab === 'active' || activeTab === 'archive' || activeTab === 'saved') {
        setActiveTab('listings');
      }
    }
    
    // Clear revealed identity state for the new user profile
    setRevealedProfileIdentity(null);
    setRevealingProfileIdentity(false);
    
    fetchProfileAndMetrics();
    fetchUserPostsAndListings();
  }, [targetUid, token, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile && myProfile) {
      setTargetProfile(myProfile);
    }
  }, [myProfile, isOwnProfile]);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedPosts();
    }
  }, [activeTab]);

  const activeListings = userListings.filter((p) => p.status === 'active');
  const archivedListings = userListings.filter((p) => p.status !== 'active');

  const handleRemoveBookmark = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    const previousSaved = [...savedPosts];

    // Optimistic Update
    setSavedPosts((prev) => prev.filter((post) => post.id !== postId));

    try {
      await axios.post(`/api/posts/${postId}/unsave`);
    } catch (err) {
      // Revert on error
      setSavedPosts(previousSaved);
      console.error('Error unsaving listing:', err);
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

  const handleToggleAnonMode = async () => {
    if (!myProfile) return;
    const nextVal = !myProfile.anonymousMode;
    await updateAnonymousMode(nextVal);
  };

  const handleUpdateStatus = async (postId: string, status: string) => {
    try {
      await axios.put(`/api/posts/${postId}`, { status });
      alert(`Status changed to ${status}.`, 'Status Updated');
      fetchUserPostsAndListings();
    } catch (err) {
      console.error('Failed to change status:', err);
      alert('Failed to change status.', 'Error');
    }
  };

  const handleOpenEditModal = () => {
    if (!myProfile) return;
    setEditName(myProfile.name || '');
    const isPredefined = PREDEFINED_COLLEGES.filter(c => c !== 'Other / Enter Custom...').includes(myProfile.college);
    if (isPredefined) {
      setEditCollege(myProfile.college);
      setEditCustomCollege('');
    } else {
      setEditCollege('Other / Enter Custom...');
      setEditCustomCollege(myProfile.college || '');
    }
    setIsEditingProfile(true);
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myProfile || !token) return;
    if (!editName.trim()) {
      alert('Name is required.', 'Required Field');
      return;
    }
    setEditProfileLoading(true);
    try {
      const isCustom = editCollege === 'Other / Enter Custom...';
      const finalCollege = isCustom ? (editCustomCollege.trim() || 'Custom College') : editCollege;
      await updateProfileDetails(editName.trim(), finalCollege, isCustom);
      alert('Profile updated successfully.', 'Success');
      setIsEditingProfile(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update profile.', 'Error');
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!token) {
      alert('Please sign in to message this user.', 'Authentication Required');
      return;
    }
    if (!targetProfile) return;
    try {
      await axios.post('/api/chats', {
        peerId: targetProfile.uid
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/chat');
    } catch (err) {
      console.error('Error starting chat thread:', err);
      alert('Failed to start chat thread.', 'Error');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert('Please log in to submit a review.', 'Authentication Required');
      return;
    }
    if (newThumbsUp === null) {
      alert('Please select a thumbs-up or thumbs-down rating.', 'Selection Required');
      return;
    }
    if (!newContent.trim()) {
      alert('Feedback details are required.', 'Field Required');
      return;
    }
    setSubmittingReview(true);
    try {
      await axios.post('/api/reviews', {
        sellerId: targetUid,
        thumbsUp: newThumbsUp,
        content: newContent.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Review submitted successfully!', 'Thank you!');
      setNewContent('');
      setNewThumbsUp(null);
      // Reload profile metrics
      fetchProfileAndMetrics();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      alert(err.response?.data?.message || 'Failed to submit review.', 'Error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loadingProfile && !targetProfile) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8">
        {/* Profile Header Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Profile Details Card Skeleton */}
          <div className="md:col-span-5 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col gap-5 text-left">
            <div className="flex items-center gap-4">
              <div className="skeleton-box w-16 h-16 rounded-2xl shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="skeleton-box w-3/4 h-5 rounded" />
                <div className="skeleton-box w-1/2 h-3.5 rounded" />
              </div>
            </div>
            <div className="flex flex-col gap-3 py-4 border-y border-slate-100 dark:border-slate-800/60">
              <div className="skeleton-box w-full h-3 rounded" />
              <div className="skeleton-box w-full h-3 rounded" />
              <div className="skeleton-box w-2/3 h-3 rounded" />
            </div>
            <div className="skeleton-box w-full h-10 rounded-xl" />
          </div>

          {/* Ratings & Feedbacks Overview Skeleton */}
          <div className="md:col-span-7 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col gap-5 text-left">
            <div className="skeleton-box w-1/3 h-6 rounded" />
            <div className="flex gap-4 my-2">
              <div className="skeleton-box w-24 h-12 rounded-xl" />
              <div className="skeleton-box w-24 h-12 rounded-xl" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="skeleton-box w-full h-4 rounded" />
              <div className="skeleton-box w-full h-4 rounded" />
              <div className="skeleton-box w-full h-4 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAnonymousModeActive = targetProfile?.anonymousMode === true;
  const showRevealButton = !isOwnProfile && myProfile?.role === 'admin' && targetProfile?.role !== 'admin' && isAnonymousModeActive;

  const displayedName = showRevealButton 
    ? (revealedProfileIdentity ? revealedProfileIdentity.name : 'Campus User') 
    : targetProfile?.name;

  const displayedEmail = showRevealButton 
    ? (revealedProfileIdentity ? revealedProfileIdentity.email : 'hidden-profile@campusmarket.edu.in') 
    : targetProfile?.email;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto fade-in flex flex-col gap-8">
      {/* Profile Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Profile Details Card */}
        <div className="md:col-span-5 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-3xl uppercase shadow-md shadow-brand-500/20 shrink-0">
                {displayedName ? displayedName[0] : '?'}
              </div>
              <div className="text-left overflow-hidden flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-none mb-1.5 truncate">
                    {displayedName}
                  </h2>
                  {showRevealButton && (
                    <div className="shrink-0 inline-flex mb-1.5">
                      {revealedProfileIdentity ? (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[9px] uppercase tracking-wider shadow-sm">
                          Unmasked
                        </span>
                      ) : (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!uid) return;
                            setRevealingProfileIdentity(true);
                            try {
                              const res = await axios.post('/api/admin/reveal-identity', {
                                targetId: uid,
                                type: 'user'
                              }, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              setRevealedProfileIdentity({
                                name: res.data.name,
                                email: res.data.email
                              });
                            } catch (err) {
                              console.error('Failed to reveal profile identity:', err);
                              alert('Failed to reveal profile identity. Check admin permissions.', 'Error');
                            } finally {
                              setRevealingProfileIdentity(false);
                            }
                          }}
                          disabled={revealingProfileIdentity}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-extrabold text-[9px] uppercase tracking-wider cursor-pointer transition-colors shadow-md border-none"
                        >
                          {revealingProfileIdentity ? 'Unmasking...' : 'Reveal Identity'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-brand-605" />
                  {targetProfile?.college}
                </p>
              </div>
            </div>

            {/* General info */}
            <div className="flex flex-col gap-3 py-4 border-y border-slate-100 dark:border-slate-800/60 text-xs font-semibold text-slate-655 dark:text-slate-400 text-left">
              <p>Email: <span className="text-slate-800 dark:text-slate-200">{displayedEmail}</span></p>
              <p className="flex items-center gap-1.5 flex-wrap">
                Verified Campus Domain:
                <span className="text-slate-805 dark:text-slate-200 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  {displayedEmail ? displayedEmail.split('@')[1] : 'Unspecified'}
                </span>
              </p>
              <p>Account Role: <span className="text-slate-800 dark:text-slate-200 uppercase tracking-wider">{targetProfile?.role}</span></p>
            </div>

            {isOwnProfile ? (
              <button
                onClick={handleOpenEditModal}
                className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800/50 text-slate-705 dark:text-slate-355 border border-light-border dark:border-dark-border rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                Edit Profile Details
              </button>
            ) : (
              <button
                onClick={handleStartChat}
                className="mt-4 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand-500/10"
              >
                <MessageSquare className="w-4 h-4" />
                Message User
              </button>
            )}
          </div>

          {/* Privacy Toggle Settings (Only for own profile) */}
          {isOwnProfile && (
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-light-border dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-305">
                {targetProfile?.anonymousMode ? <EyeOff className="w-4 h-4 text-slate-450" /> : <Eye className="w-4 h-4 text-brand-500" />}
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold">Anonymous Mode</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Mask profile details on public social feeds.</span>
                </div>
              </div>
              <button
                onClick={handleToggleAnonMode}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${
                  targetProfile?.anonymousMode ? 'bg-brand-600' : 'bg-slate-205 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    targetProfile?.anonymousMode ? 'transform translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Ratings & Feedbacks Overview */}
        <div className="md:col-span-7 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex-1">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base mb-4 flex items-center justify-between">
              <span>{isOwnProfile ? 'My Seller Ratings' : 'User Seller Ratings'}</span>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-450">
                <span className="text-emerald-500 flex items-center gap-0.5"><ThumbsUp className="w-3.5 h-3.5" /> {targetProfile?.thumbsUp || 0}</span>
                <span>/</span>
                <span className="text-rose-500 flex items-center gap-0.5"><ThumbsDown className="w-3.5 h-3.5" /> {targetProfile?.thumbsDown || 0}</span>
              </div>
            </h3>

            {/* List Reviews */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[160px] overflow-y-auto pr-2 text-left">
              {reviews.length === 0 ? (
                <div className="p-8 text-center text-slate-450">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-bold">No feedback received</p>
                  <p className="text-[10px] leading-relaxed mt-0.5">Ratings will populate here after trading on the platform.</p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => navigate(`/profile/${rev.buyerId}`)}
                        className="text-xs font-bold text-slate-805 dark:text-slate-200 hover:text-brand-600 transition-colors"
                      >
                        {rev.buyerName}
                      </button>
                      <span className="text-[9px] text-slate-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-550 dark:text-slate-450 leading-relaxed font-semibold">
                      {rev.thumbsUp ? (
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <p>{rev.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {isOwnProfile ? (
            <div className="mt-4 p-4 bg-brand-50/20 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/10 rounded-2xl text-left">
              <p className="text-[10px] leading-relaxed font-semibold text-slate-500 dark:text-slate-400">
                💡 Tip: Meet up at visible places on campus (e.g. library canteens) and request buyer ratings here to boost transaction trust.
              </p>
            </div>
          ) : (
            token && (
              <form onSubmit={handleSubmitReview} className="mt-4 p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-light-border dark:border-dark-border rounded-2xl text-left flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Submit User Feedback</h4>
                
                {/* Rating selection buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewThumbsUp(true)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newThumbsUp === true 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/20' 
                        : 'border-light-border dark:border-dark-border text-slate-450 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Thumbs Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewThumbsUp(false)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      newThumbsUp === false 
                        ? 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-955/20' 
                        : 'border-light-border dark:border-dark-border text-slate-450 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Thumbs Down
                  </button>
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Briefly describe your trade experience..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl text-xs font-semibold text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview || newThumbsUp === null || !newContent.trim()}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    {submittingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Submit
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-light-border dark:border-dark-border gap-6 mt-4 self-start">
        {isOwnProfile ? (
          <>
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'active'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Active Listings ({activeListings.length})
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'archive'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              Closed Archive ({archivedListings.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'saved'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved Items ({savedPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'posts'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <Rss className="w-4 h-4" />
              Social Posts ({userSocialPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <Star className="w-4 h-4" />
              Reviews ({reviews.length})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('listings')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'listings'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Active Listings ({activeListings.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'posts'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <Rss className="w-4 h-4" />
              Campus Social Posts ({userSocialPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-450 hover:text-slate-700'
              }`}
            >
              <Star className="w-4 h-4" />
              User Reviews ({reviews.length})
            </button>
          </>
        )}
      </div>

      {/* Tabs Content rendering */}
      {loadingListings ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-450">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'active' || activeTab === 'listings' ? (
        activeListings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <ShoppingBag className="w-10 h-10 text-slate-350 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No active listings</p>
            <p className="text-xs text-slate-400 mt-1">
              {isOwnProfile ? "Ready to trade? Click 'Sell Item' to post." : "This user doesn't have any items listed for sale currently."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {activeListings.map((post) => (
              <div
                key={post.id}
                className="h-[340px] flex flex-col bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                <div onClick={() => navigate(`/listings/${post.id}`)} className="h-1/2 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0 cursor-pointer">
                  {post.images && post.images[0] && (
                    <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                  )}
                  <button
                    onClick={(e) => handleShare(post, e)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 dark:bg-dark-surface/90 hover:bg-white text-slate-700 border border-light-border dark:border-dark-border transition-all duration-200 cursor-pointer pointer-events-auto shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                  </button>
                </div>

                <div className="h-1/2 p-4 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-extrabold text-brand-600 uppercase tracking-widest">{post.category}</span>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-205 truncate group-hover:text-brand-600 mt-0.5">{post.title}</h3>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">{post.type === 'free' ? 'FREE' : `₹${post.price}`}</p>
                  </div>

                  {isOwnProfile && (
                    <div className="grid grid-cols-2 border-t border-slate-100 dark:divide-dark-border divide-x divide-slate-100 dark:border-slate-805 pt-2">
                      <button
                        onClick={() => handleUpdateStatus(post.id, 'sold')}
                        className="py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/20 cursor-pointer text-center"
                      >
                        Mark Sold
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(post.id, 'taken')}
                        className="py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50/20 cursor-pointer text-center"
                      >
                        Mark Taken
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'archive' ? (
        archivedListings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No archived listings</p>
            <p className="text-xs text-slate-400 mt-1">Once listings are marked sold or taken, they move here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 opacity-75 animate-fade-in">
            {archivedListings.map((post) => (
              <div
                key={post.id}
                className="h-[340px] flex flex-col bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm justify-between"
              >
                <div onClick={() => navigate(`/listings/${post.id}`)} className="h-1/2 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden grayscale cursor-pointer">
                  {post.images && post.images[0] && (
                    <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute inset-0 bg-slate-950/40 flex items-center justify-center text-white font-extrabold text-[10px] tracking-widest uppercase">
                    {post.status}
                  </span>
                  <button
                    onClick={(e) => handleShare(post, e)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 dark:bg-dark-surface/90 hover:bg-white text-slate-700 border border-light-border dark:border-dark-border transition-all duration-200 cursor-pointer pointer-events-auto shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                  </button>
                </div>

                <div className="h-1/2 p-4 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest">{post.category}</span>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 truncate mt-0.5">{post.title}</h3>
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(post.id, 'active')}
                    className="w-full py-2 border border-brand-200 dark:border-brand-900/40 text-[10px] font-bold text-brand-605 dark:text-brand-405 hover:bg-brand-50/20 rounded-xl cursor-pointer text-center"
                  >
                    Re-list Active
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'saved' ? (
        loadingSaved ? (
          <div className="flex flex-col items-center justify-center p-10 text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <Bookmark className="w-8 h-8 text-slate-350 dark:text-slate-500 mx-auto mb-2 animate-bounce" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No bookmarked items</p>
            <p className="text-xs text-slate-400 mt-1">Browse listings in the Feed and click the bookmark icon to save them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {savedPosts.map((post) => (
              <div
                key={post.id}
                className="h-[340px] flex flex-col bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative animate-fade-in"
              >
                <div onClick={() => navigate(`/listings/${post.id}`)} className="h-1/2 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0 cursor-pointer">
                  {post.images && post.images[0] && (
                    <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                  )}
                  <button
                    onClick={(e) => handleRemoveBookmark(post.id, e)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 dark:bg-dark-surface/90 hover:bg-white text-brand-600 border border-light-border dark:border-dark-border transition-all duration-200 cursor-pointer pointer-events-auto shadow-sm"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-brand-600 text-brand-600" />
                  </button>
                  <button
                    onClick={(e) => handleShare(post, e)}
                    className="absolute top-2.5 right-11 p-1.5 rounded-lg bg-white/90 dark:bg-dark-surface/90 hover:bg-white text-slate-700 border border-light-border dark:border-dark-border transition-all duration-200 cursor-pointer pointer-events-auto shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                  </button>
                </div>

                <div className="h-1/2 p-4 flex flex-col justify-between text-left">
                  <div>
                    <span className="text-[9px] font-extrabold text-brand-600 uppercase tracking-widest">{post.category}</span>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 mt-0.5">{post.title}</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                    {post.type === 'free' ? 'FREE' : `₹${post.price}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'posts' ? (
        userSocialPosts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <Rss className="w-10 h-10 text-slate-350 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-205">No social updates yet</p>
            <p className="text-xs text-slate-400 mt-1">
              {isOwnProfile ? "Updates posted by you on the Campus Feed will render here." : "Updates posted by this user on the Campus Feed will render here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {userSocialPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/campus-feed?post=${post.id}`)}
                className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer text-left flex flex-col gap-3 group animate-fade-in"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/10 px-2.5 py-0.5 rounded-lg border border-brand-100 dark:border-brand-900/25">
                      {post.college}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
                {post.images && post.images.length > 0 && (
                  <div className={`grid ${post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 rounded-xl overflow-hidden border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-900`}>
                    {post.images.map((img: string, i: number) => (
                      <img key={i} src={img} alt="Post attachment" className="w-full h-full max-h-60 object-cover" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        // activeTab === 'reviews'
        reviews.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <ThumbsUp className="w-10 h-10 text-slate-350 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No feedback received yet</p>
            <p className="text-xs text-slate-400 mt-1">Ratings will populate here after trading on the campus platform.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between gap-3 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/profile/${rev.buyerId}`)}
                        className="text-xs font-extrabold text-slate-805 dark:text-slate-205 hover:text-brand-605 transition-colors"
                      >
                        {rev.buyerName}
                      </button>
                      {myProfile?.uid === rev.buyerId && (
                        <span className="px-1.5 py-0.25 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-[8px] font-extrabold rounded-md uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-semibold">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      {myProfile?.uid === rev.buyerId && editingReviewId !== rev.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingReviewId(rev.id);
                              setEditReviewText(rev.content);
                              setEditReviewThumbsUp(rev.thumbsUp);
                            }}
                            className="p-0.5 rounded text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit review"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-0.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors cursor-pointer"
                            title="Delete review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editingReviewId === rev.id ? (
                    <div className="flex flex-col gap-2 mt-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-light-border dark:border-dark-border">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-505 uppercase tracking-wider">Feedback:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditReviewThumbsUp(true)}
                            className={`p-1 rounded-lg border transition-all cursor-pointer ${
                              editReviewThumbsUp 
                                ? 'bg-emerald-500 text-white border-emerald-500' 
                                : 'bg-white dark:bg-dark-surface text-slate-400 border-light-border dark:border-dark-border'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditReviewThumbsUp(false)}
                            className={`p-1 rounded-lg border transition-all cursor-pointer ${
                              !editReviewThumbsUp 
                                ? 'bg-rose-505 text-white border-rose-505' 
                                : 'bg-white dark:bg-dark-surface text-slate-400 border-light-border dark:border-dark-border'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={editReviewText}
                        onChange={(e) => setEditReviewText(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none text-xs font-semibold resize-none"
                        rows={2}
                      />
                      <div className="flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingReviewId(null)}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-655 font-bold text-[9px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateReview(rev.id)}
                          disabled={reviewUpdateLoading || !editReviewText.trim()}
                          className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-[9px] cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-655 dark:text-slate-350 leading-relaxed italic mt-2.5">
                      "{rev.content}"
                    </p>
                  )}
                </div>
                {editingReviewId !== rev.id && (
                  <div className="flex items-center gap-1.5 mt-1 border-t border-slate-50 dark:border-slate-800/40 pt-2.5">
                    {rev.thumbsUp ? (
                      <>
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Positive Feedback</span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-455 uppercase tracking-wider">Negative Feedback</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <h3 className="text-xl font-extrabold text-slate-855 dark:text-slate-100 tracking-tight mb-5 text-left">Edit Profile Information</h3>

            <form onSubmit={handleEditProfileSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campus College</label>
                <select
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-205 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {collegesList.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {editCollege === 'Other / Enter Custom...' && (
                <div className="flex flex-col gap-1.5 text-left fade-in">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom College Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IIT Madras"
                    value={editCustomCollege}
                    onChange={(e) => setEditCustomCollege(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-605 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editProfileLoading}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-brand-500/10"
                >
                  {editProfileLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
