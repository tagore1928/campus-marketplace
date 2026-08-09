import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { obfuscateUid } from '../utils/obfuscate';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { 
  MapPin, 
  Tag, 
  ShieldAlert, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Edit, 
  Trash2, 
  CheckCircle,
  EyeOff,
  UserCheck,
  Bookmark,
  Share2
} from 'lucide-react';

export const PostDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, token } = useAuth();
  const { alert, confirm } = useDialog();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review states
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [thumbsUp, setThumbsUp] = useState(true);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);

  // Review Edit states
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState('');
  const [editReviewThumbsUp, setEditReviewThumbsUp] = useState(true);
  const [reviewUpdateLoading, setReviewUpdateLoading] = useState(false);

  // Report states
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitLoading, setReportSubmitLoading] = useState(false);

  const [revealedIdentity, setRevealedIdentity] = useState<{ name: string; email: string } | null>(null);
  const [revealingIdentity, setRevealingIdentity] = useState(false);

  const handleRevealIdentity = async () => {
    if (!token || !id) return;
    setRevealingIdentity(true);
    try {
      const res = await axios.post('/api/admin/reveal-identity', {
        targetId: id,
        type: 'post'
      });
      setRevealedIdentity(res.data);
      alert('Identity unmasked successfully.', 'Success');
    } catch (err) {
      console.error('Failed to reveal identity:', err);
      alert('Failed to reveal user identity. Check administrative privileges.', 'Error');
    } finally {
      setRevealingIdentity(false);
    }
  };

  // User's own report state
  const [myReport, setMyReport] = useState<any>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editReportReason, setEditReportReason] = useState('');
  const [reportUpdateLoading, setReportUpdateLoading] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editAnon, setEditAnon] = useState(false);
  const [editStatus, setEditStatus] = useState('active');

  const [isSaved, setIsSaved] = useState(false);

  const checkSavedStatus = async () => {
    if (!token || !id) return;
    try {
      const res = await axios.get('/api/posts/saved/ids');
      const savedIds = res.data;
      setIsSaved(savedIds.includes(id));
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const fetchUserReport = async () => {
    if (!token || !id) return;
    try {
      const res = await axios.get(`/api/reports/post/${id}`);
      setMyReport(res.data);
    } catch (err) {
      setMyReport(null);
    }
  };

  useEffect(() => {
    checkSavedStatus();
  }, [token, id]);

  useEffect(() => {
    if (token && id) {
      fetchUserReport();
    } else {
      setMyReport(null);
    }
  }, [token, id]);

  const handleToggleSave = async () => {
    if (!token || !id) {
      alert('Please log in to save listings.', 'Authentication Required');
      return;
    }
    const previousSaved = isSaved;

    // Optimistic Update
    setIsSaved(!previousSaved);

    try {
      if (previousSaved) {
        await axios.post(`/api/posts/${id}/unsave`);
      } else {
        await axios.post(`/api/posts/${id}/save`);
      }
    } catch (err) {
      // Revert on error
      setIsSaved(previousSaved);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        alert(err.response.data.message, 'Error');
      } else {
        console.error('Failed to toggle save:', err);
      }
    }
  };

  const handleSharePost = async () => {
    if (!post) return;
    const shareUrl = window.location.href;
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

  const fetchPostDetails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/posts/${id}`);
      setPost(res.data);

      // Initialize edit fields
      setEditTitle(res.data.title);
      setEditDesc(res.data.description);
      setEditPrice(res.data.price);
      setEditAnon(res.data.anonymous);
      setEditStatus(res.data.status);

      // Fetch reviews of the seller
      const reviewsRes = await axios.get(`/api/reviews/${res.data.creatorId}`);
      setReviews(reviewsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [id]);

  const handleCreateChat = async () => {
    if (!token) {
      navigate('/auth');
      return;
    }
    try {
      const res = await axios.post('/api/chats', { listingId: post.id });
      const roomId = res.data.id;
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to initialize chat.', 'Error');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      const res = await axios.put(`/api/posts/${post.id}`, { status });
      setPost(res.data);
      alert(`Listing status updated to ${status}.`, 'Success');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.', 'Error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.put(`/api/posts/${post.id}`, {
        title: editTitle,
        description: editDesc,
        price: editPrice,
        anonymous: editAnon,
        status: editStatus
      });
      setPost(res.data);
      setIsEditing(false);
      alert('Listing updated successfully.', 'Success');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update listing.', 'Error');
    }
  };

  const handleDeletePost = async () => {
    const confirmed = await confirm('Are you sure you want to permanently delete this listing?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/posts/${post.id}`);
      alert('Listing deleted successfully.', 'Success');
      navigate('/feed');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete listing.', 'Error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitLoading(true);
    try {
      const res = await axios.post('/api/reviews', {
        sellerId: post.creatorId,
        thumbsUp,
        content: reviewContent
      });
      setReviews((prev) => [res.data, ...prev]);
      setShowReviewForm(false);
      setReviewContent('');
      alert('Rating submitted successfully.', 'Success');
      fetchPostDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit review.', 'Error');
    } finally {
      setReviewSubmitLoading(false);
    }
  };

  const handleUpdateReview = async (reviewId: string) => {
    setReviewUpdateLoading(true);
    try {
      const res = await axios.put(`/api/reviews/${reviewId}`, {
        thumbsUp: editReviewThumbsUp,
        content: editReviewText
      });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.data : r)));
      setEditingReviewId(null);
      alert('Review updated successfully.', 'Success');
      fetchPostDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update review.', 'Error');
    } finally {
      setReviewUpdateLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = await confirm('Are you sure you want to permanently delete your review?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      alert('Review deleted successfully.', 'Success');
      fetchPostDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete review.', 'Error');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitLoading(true);
    try {
      await axios.post(`/api/posts/${post.id}/report`, {
        reason: reportReason
      });
      setShowReportForm(false);
      setReportReason('');
      alert('Listing reported. Administrators will check this report.', 'Report Submitted');
      fetchPostDetails();
      fetchUserReport();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to report listing.', 'Error');
    } finally {
      setReportSubmitLoading(false);
    }
  };

  const handleUpdateReport = async () => {
    if (!myReport) return;
    setReportUpdateLoading(true);
    try {
      const res = await axios.put(`/api/reports/${myReport.id}`, {
        reason: editReportReason
      });
      setMyReport(res.data);
      setIsEditingReport(false);
      alert('Report updated successfully.', 'Success');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update report.', 'Error');
    } finally {
      setReportUpdateLoading(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!myReport) return;
    const confirmed = await confirm('Are you sure you want to retract your report?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/reports/${myReport.id}`);
      setMyReport(null);
      alert('Report successfully retracted.', 'Success');
      fetchPostDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to retract report.', 'Error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-605 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Loading listing details...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-20 text-left">
        <p className="text-rose-600 font-bold text-lg mb-2">Error</p>
        <p className="text-sm font-semibold text-slate-400">{error || 'Post not found.'}</p>
        <button onClick={() => navigate('/feed')} className="mt-4 px-6 py-2 bg-brand-605 text-white rounded-xl font-bold text-xs">
          Return to Feed
        </button>
      </div>
    );
  }

  const isCreator = profile?.uid === post.creatorId;
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="p-8 max-w-5xl mx-auto fade-in">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Side: Images & Review Feed */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-100 dark:bg-slate-900 border border-light-border dark:border-dark-border rounded-3xl overflow-hidden aspect-video relative shadow-sm">
            {post.images && post.images.length > 0 ? (
              <img
                src={post.images[0]}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                No Media Available
              </div>
            )}
            
            {/* Status Overlays */}
            {post.status !== 'active' && (
              <div className="absolute inset-0 bg-slate-955/50 backdrop-blur-sm flex items-center justify-center">
                <span className="px-6 py-2 rounded-2xl bg-white text-slate-900 font-extrabold text-sm uppercase tracking-widest border border-white/20">
                  {post.status}
                </span>
              </div>
            )}
          </div>

          {/* Seller Ratings Feed */}
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-202 text-base mb-4 flex items-center justify-between">
              <span>Seller Ratings & History</span>
              {!isCreator && token && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  Write Rating
                </button>
              )}
            </h3>

            {/* Review Input */}
            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="mb-6 p-4 border border-light-border dark:border-dark-border rounded-2xl bg-slate-50 dark:bg-slate-900/50 fade-in flex flex-col gap-4 text-left">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-505 uppercase tracking-wider">Transaction Feedback:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setThumbsUp(true)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        thumbsUp 
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/10' 
                          : 'bg-white dark:bg-dark-surface text-slate-400 border-light-border dark:border-dark-border'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbsUp(false)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        !thumbsUp 
                          ? 'bg-rose-505 text-white border-rose-505 shadow-sm shadow-rose-505/10' 
                          : 'bg-white dark:bg-dark-surface text-slate-400 border-light-border dark:border-dark-border'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-505 uppercase tracking-wider">Comment</label>
                  <textarea
                    placeholder="Write a brief review regarding the trade process (e.g. quick meet, item matches desc)..."
                    required
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none text-xs font-semibold"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-350 rounded-xl text-slate-655 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitLoading}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-brand-500/10"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}

            {/* List Reviews */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-60 overflow-y-auto pr-2 text-left">
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 font-semibold text-center">No seller rating feedback recorded yet.</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/profile/${rev.buyerId}`)}
                          className="text-xs font-extrabold text-slate-855 dark:text-slate-200 hover:text-brand-600 transition-colors"
                        >
                          {rev.buyerName}
                        </button>
                        {profile?.uid === rev.buyerId && (
                          <span className="px-1.5 py-0.25 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-[8px] font-extrabold rounded-md uppercase tracking-wider">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-450">{new Date(rev.createdAt).toLocaleDateString()}</span>
                        {profile?.uid === rev.buyerId && editingReviewId !== rev.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingReviewId(rev.id);
                                setEditReviewText(rev.content);
                                setEditReviewThumbsUp(rev.thumbsUp);
                              }}
                              className="p-0.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit review"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="p-0.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors cursor-pointer"
                              title="Delete review"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {editingReviewId === rev.id ? (
                      <div className="flex flex-col gap-2 mt-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-light-border dark:border-dark-border">
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
                              <ThumbsUp className="w-3 h-3" />
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
                              <ThumbsDown className="w-3 h-3" />
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
                      <div className="flex items-start gap-2.5">
                        {rev.thumbsUp ? (
                          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 mt-0.5">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
                          {rev.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Product Details & Options */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col gap-5 text-left">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{post.category}</span>
                <span className="text-xs font-bold text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>

              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight mb-2 tracking-tight">
                {post.title}
              </h2>

              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 leading-none">
                {post.type === 'free' ? 'FREE' : `₹${post.price}`}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {post.description}
              </p>
            </div>

            {/* Meta tags */}
            <div className="flex flex-col gap-3 py-4 border-y border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold">{post.college} Campus</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350">
                <Tag className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider">{post.type}</span>
              </div>
            </div>

            {/* Seller Info Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-light-border dark:border-dark-border gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/profile/${post.creatorId}`)}
                  className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg shadow-sm uppercase shrink-0 hover:opacity-85 border-none cursor-pointer"
                >
                  {revealedIdentity ? revealedIdentity.name[0] : (post.creatorName ? post.creatorName[0] : '?')}
                </button>
                <div className="overflow-hidden text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/profile/${post.creatorId}`)}
                      className="text-xs font-extrabold text-slate-800 dark:text-slate-205 hover:text-brand-605 transition-colors bg-transparent border-none p-0 cursor-pointer text-left leading-tight"
                    >
                      {revealedIdentity ? revealedIdentity.name : post.creatorName}
                    </button>
                    {(post.anonymous || post.isAnonymous || post.creatorAnonymousMode) && <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />}

                    {(post.anonymous || post.isAnonymous || post.creatorAnonymousMode) && profile?.role === 'admin' && (
                      <div className="shrink-0 inline-flex ml-1">
                        {revealedIdentity ? (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[9px] uppercase tracking-wider shadow-sm">
                            Unmasked
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevealIdentity();
                            }}
                            disabled={revealingIdentity}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-extrabold text-[9px] uppercase tracking-wider cursor-pointer transition-colors shadow-md border-none"
                          >
                            {revealingIdentity ? 'Unmasking...' : 'Reveal Identity'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-slate-405 truncate mt-0.5">
                    {revealedIdentity ? revealedIdentity.email : post.creatorEmail}
                  </p>
                </div>
              </div>

              {/* Seller Score */}
              <div className="flex items-center gap-1.5 self-center text-xs font-bold shrink-0">
                <span className="text-emerald-500 flex items-center gap-0.5">
                  <ThumbsUp className="w-3 h-3" /> {reviews.filter(r => r.thumbsUp).length}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-rose-505 flex items-center gap-0.5">
                  <ThumbsDown className="w-3 h-3" /> {reviews.filter(r => !r.thumbsUp).length}
                </span>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-col gap-2.5 mt-2">
              {isCreator ? (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Listing
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleUpdateStatus('sold')}
                      className="py-2.5 border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-305 rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all duration-200"
                    >
                      Mark Sold
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('taken')}
                      className="py-2.5 border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-305 rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all duration-200"
                    >
                      Mark Taken
                    </button>
                  </div>

                  <button
                    onClick={handleDeletePost}
                    className="w-full py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-955/40 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Item
                  </button>
                </>
              ) : (
                <>
                  {post.status === 'active' && (
                    <button
                      onClick={handleCreateChat}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Seller
                    </button>
                  )}

                  <button
                    onClick={handleToggleSave}
                    className={`w-full py-3 border rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
                      isSaved
                        ? 'border-brand-300 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-950/30'
                        : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-705 dark:text-slate-300'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-brand-600 text-brand-600' : 'text-slate-450 dark:text-slate-400'}`} />
                    {isSaved ? 'Saved Item' : 'Save Product'}
                  </button>

                  {myReport ? (
                    <div className="w-full p-4 border border-rose-200 dark:border-rose-900/30 rounded-2xl bg-rose-50/20 dark:bg-rose-955/10 flex flex-col gap-3 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-rose-605 dark:text-rose-455 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          You Reported This Listing
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setIsEditingReport(true);
                              setEditReportReason(myReport.reason);
                            }}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit report reason"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleDeleteReport}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors cursor-pointer"
                            title="Delete report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {isEditingReport ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editReportReason}
                            onChange={(e) => setEditReportReason(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-rose-200 dark:border-rose-900/30 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setIsEditingReport(false)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-655 font-bold text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateReport}
                              disabled={reportUpdateLoading || !editReportReason.trim()}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-normal">
                          Reason: <span className="italic">"{myReport.reason}"</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowReportForm(!showReportForm)}
                      className="w-full py-3 border border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-955/10 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-600 dark:text-rose-405 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Report Listing
                    </button>
                  )}
                </>
              )}

              {/* Share Listing button (available for all users) */}
              <button
                onClick={handleSharePost}
                className="w-full py-3 border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
              >
                <Share2 className="w-4 h-4 text-blue-500" />
                Share Listing
              </button>

              {/* Admin delete overrides */}
              {isAdmin && !isCreator && (
                <button
                  onClick={handleDeletePost}
                  className="w-full py-3 mt-4 border border-rose-500 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Admin Remove Listing
                </button>
              )}
            </div>

            {/* Report Form Dialog */}
            {showReportForm && (
              <form onSubmit={handleReportSubmit} className="mt-4 p-4 border border-rose-200 dark:border-rose-900/30 rounded-2xl bg-rose-50/20 dark:bg-rose-955/10 flex flex-col gap-4 fade-in text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-rose-605 dark:text-rose-450 uppercase tracking-wider">Reason for Report</label>
                  <textarea
                    placeholder="Provide specific reasons (e.g. offensive content, scam item, spam listing)..."
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-dark-surface border border-rose-200 dark:border-rose-900/30 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-405 focus:outline-none text-xs font-semibold"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-350 rounded-xl text-slate-655 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitLoading}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-rose-500/10"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form Modal/Overlays */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <h3 className="text-xl font-extrabold text-slate-855 dark:text-slate-100 tracking-tight mb-5 text-left">Edit Listing Details</h3>
            
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-205 text-sm font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-205 text-sm font-semibold"
                  rows={4}
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price (Set to 0 if Free)</label>
                <input
                  type="number"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-200 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-light-border dark:border-dark-border my-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <EyeOff className="w-4 h-4 text-slate-450" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold">Anonymous Listing</span>
                    <span className="text-[10px] text-slate-400">Mask profile statistics until direct chat is initiated.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editAnon}
                  onChange={(e) => setEditAnon(e.target.checked)}
                  className="w-4.5 h-4.5 accent-brand-605 rounded cursor-pointer"
                />
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-655 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-brand-500/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
