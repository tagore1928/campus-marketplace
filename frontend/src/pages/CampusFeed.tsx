import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  MessageSquare,
  Heart,
  Share2,
  Bookmark,
  AlertTriangle,
  Trash2,
  Image as ImageIcon,
  Send,
  Loader2,
  X,
  Globe,
  MapPin,
  Sparkles,
  Plus,
  Edit2,
  Check,
  MoreVertical
} from 'lucide-react';

export const CampusFeed: React.FC = () => {
  const { profile, token } = useAuth();
  const { alert, confirm } = useDialog();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useState<any[]>([]);
  const [feedType, setFeedType] = useState<'global' | 'campus'>('global');
  
  // Post creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createVisibility, setCreateVisibility] = useState<'global' | 'campus'>('global');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Inline editing state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Comments toggle states (per post ID)
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [newCommentText, setNewCommentText] = useState<{ [key: string]: string }>({});
  
  // Report states (per post ID)
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  // User's own submitted reports state
  const [myReports, setMyReports] = useState<any[]>([]);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportReasonText, setEditReportReasonText] = useState('');
  const [reportUpdateLoading, setReportUpdateLoading] = useState(false);

  // Saved post IDs for active highlight
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [revealedPostCreators, setRevealedPostCreators] = useState<Record<string, string>>({});
  const [revealingPostId, setRevealingPostId] = useState<string | null>(null);

  const handleRevealSocialIdentity = async (postId: string) => {
    setRevealingPostId(postId);
    try {
      const res = await axios.post('/api/admin/reveal-identity', {
        targetId: postId,
        type: 'social-feed'
      });
      setRevealedPostCreators((prev) => ({
        ...prev,
        [postId]: res.data.name
      }));
      alert('Identity unmasked successfully.', 'Success');
    } catch (err) {
      console.error('Failed to reveal social post creator identity:', err);
      alert('Failed to reveal creator identity. Check administrative privileges.', 'Error');
    } finally {
      setRevealingPostId(null);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [colleges, setColleges] = useState<string[]>([]);
  const [selectedTargetCollege, setSelectedTargetCollege] = useState('');

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await axios.get('/api/auth/colleges');
        setColleges(res.data.filter((c: string) => c !== 'Other / Enter Custom...'));
      } catch (err) {
        console.error('Error fetching colleges registry:', err);
      }
    };
    fetchColleges();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let collegeParam = 'Global';
      if (feedType === 'campus') {
        if (profile?.role === 'admin') {
          collegeParam = 'campus_feed_admin';
        } else {
          collegeParam = profile?.college || 'Global';
        }
      }
      
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(
        `/api/social-feed?college=${encodeURIComponent(collegeParam)}`,
        config
      );
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching social feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedPostIds = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/social-feed/saved', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedPostIds(res.data.map((p: any) => p.id));
    } catch (err) {
      console.error('Error fetching saved social posts:', err);
    }
  };

  const fetchMyReports = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/reports/my-reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyReports(res.data);
    } catch (err) {
      console.error('Error fetching user reports:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchSavedPostIds();
    fetchMyReports();
  }, [feedType, token, profile?.college]);

  // Handle URL post parameters to scroll to specific post if shared
  useEffect(() => {
    const postId = id || searchParams.get('post');
    if (postId && posts.length > 0) {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-brand-500', 'dark:ring-brand-400');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-brand-500', 'dark:ring-brand-400');
        }, 3000);
      }
    }
  }, [posts, id, searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (selectedImages.length + files.length > 2) {
      alert('You can attach a maximum of 2 images.', 'Limit Exceeded');
      return;
    }

    const updatedFiles = [...selectedImages, ...files];
    setSelectedImages(updatedFiles);

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...previews]);
  };

  const removeImage = (index: number) => {
    const updatedFiles = [...selectedImages];
    updatedFiles.splice(index, 1);
    setSelectedImages(updatedFiles);

    const updatedPreviews = [...imagePreviews];
    URL.revokeObjectURL(updatedPreviews[index]);
    updatedPreviews.splice(index, 1);
    setImagePreviews(updatedPreviews);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedImages.length === 0) return;
    if (!token) {
      alert('You must be logged in to post.', 'Authentication Required');
      return;
    }

    setPosting(true);
    const formData = new FormData();
    formData.append('content', content.trim());
    
    let targetCollege = 'Global';
    if (createVisibility === 'campus') {
      if (profile?.role === 'admin') {
        targetCollege = selectedTargetCollege;
      } else {
        targetCollege = profile?.college || 'Global';
      }
    }
    
    if (createVisibility === 'campus' && profile?.role === 'admin' && !targetCollege) {
      alert('Please select a target college campus.', 'Selection Required');
      setPosting(false);
      return;
    }

    formData.append('college', targetCollege);
    formData.append('anonymous', String(isAnonymous));
    
    selectedImages.forEach((image) => {
      formData.append('images', image);
    });

    try {
      await axios.post('/api/social-feed', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setContent('');
      setSelectedImages([]);
      setImagePreviews([]);
      setIsAnonymous(false);
      setIsCreateModalOpen(false);
      fetchPosts();
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert(err.response?.data?.message || 'Failed to create social post.', 'Post Failed');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!token || !profile) {
      alert('Please log in to like posts.', 'Authentication Required');
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isLiked = post.likes && post.likes.includes(profile.uid);
    let updatedLikes = [...(post.likes || [])];
    if (isLiked) {
      updatedLikes = updatedLikes.filter((id: string) => id !== profile.uid);
    } else {
      updatedLikes.push(profile.uid);
    }

    // Optimistic Update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: updatedLikes } : p))
    );

    try {
      const res = await axios.post(`/api/social-feed/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: res.data.likes } : p))
      );
    } catch (err) {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: post.likes } : p))
      );
      console.error('Error liking post:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    const commentText = newCommentText[postId]?.trim();
    if (!commentText || !token) return;

    try {
      const res = await axios.post(
        `/api/social-feed/${postId}/comment`,
        { content: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...(p.comments || []), res.data.comment]
            };
          }
          return p;
        })
      );
      setNewCommentText((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const handleSaveToggle = async (postId: string) => {
    if (!token) {
      alert('Please log in to save posts.', 'Authentication Required');
      return;
    }
    const isSaved = savedPostIds.includes(postId);
    try {
      if (isSaved) {
        await axios.post(`/api/social-feed/${postId}/unsave`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedPostIds((prev) => prev.filter((id) => id !== postId));
      } else {
        await axios.post(`/api/social-feed/${postId}/save`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedPostIds((prev) => [...prev, postId]);
      }
    } catch (err) {
      console.error('Error saving post:', err);
    }
  };

  const handleShare = async (postId: string) => {
    const shareUrl = `${window.location.origin}/campus-feed?post=${postId}`;
    const shareData = {
      title: 'Campus Feed Post',
      text: 'Check out this post on CampusMarket Feed!',
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
    alert('Post link copied to clipboard!', 'Success');
  };

  const handleMessageCreator = async (post: any) => {
    if (!token) {
      alert('Please log in to message.', 'Authentication Required');
      return;
    }
    if (post.creatorId === profile?.uid) {
      alert('You cannot message yourself.', 'Invalid Recipient');
      return;
    }
    try {
      const res = await axios.post('/api/chats', {
        listingId: post.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const roomId = res.data.id;
      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error('Error initiating chat with post creator:', err);
      alert('Failed to start chat thread.', 'Error');
    }
  };

  const handleReportPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReportId || !reportReason.trim() || !token) return;

    setReporting(true);
    try {
      await axios.post(
        `/api/social-feed/${activeReportId}/report`,
        { reason: reportReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Post reported successfully to platform administrators.', 'Report Submitted');
      setActiveReportId(null);
      setReportReason('');
      fetchMyReports();
      fetchPosts();
    } catch (err: any) {
      console.error('Error reporting post:', err);
      alert(err.response?.data?.message || 'Failed to submit report.', 'Error');
    } finally {
      setReporting(false);
    }
  };

  const handleUpdateReport = async (reportId: string) => {
    if (!editReportReasonText.trim() || !token) return;
    setReportUpdateLoading(true);
    try {
      await axios.put(`/api/reports/${reportId}`, {
        reason: editReportReasonText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingReportId(null);
      setEditReportReasonText('');
      alert('Report updated successfully.', 'Success');
      fetchMyReports();
    } catch (err: any) {
      console.error('Error updating report:', err);
      alert(err.response?.data?.message || 'Failed to update report.', 'Error');
    } finally {
      setReportUpdateLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const confirmed = await confirm('Are you sure you want to retract your report?', 'Confirm Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Report successfully retracted.', 'Success');
      fetchMyReports();
      fetchPosts();
    } catch (err: any) {
      console.error('Error retracting report:', err);
      alert(err.response?.data?.message || 'Failed to retract report.', 'Error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = await confirm('Are you sure you want to delete this social post permanently?', 'Delete Social Post');
    if (!confirmed) return;

    const previousPosts = [...posts];

    // Optimistic Update
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await axios.delete(`/api/social-feed/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Post deleted successfully.', 'Success');
    } catch (err) {
      // Revert on error
      setPosts(previousPosts);
      console.error('Error deleting social post:', err);
      alert('Failed to delete post.', 'Error');
    }
  };

  const startEditingPost = (postId: string, currentText: string) => {
    setEditingPostId(postId);
    setEditingContent(currentText);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editingContent.trim()) return;
    setSavingEdit(true);
    try {
      await axios.put(`/api/social-feed/${postId}`, {
        content: editingContent.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, content: editingContent.trim() } : p))
      );
      setEditingPostId(null);
    } catch (err: any) {
      console.error('Error updating social post:', err);
      alert(err.response?.data?.message || 'Failed to edit post.', 'Error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 fade-in flex flex-col gap-6 relative min-h-[calc(100vh-4rem)]">
      {/* Feed Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-brand-605 animate-pulse" />
            Campus Social Feed
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Connect, share updates, and see what is happening in your college community.
          </p>
        </div>

        {/* Feed Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-850 p-1.5 rounded-2xl border border-light-border dark:border-dark-border self-start">
          <button
            onClick={() => setFeedType('global')}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              feedType === 'global'
                ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Global Feed
          </button>
          <button
            onClick={() => setFeedType('campus')}
            disabled={!profile?.college && profile?.role !== 'admin'}
            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all disabled:opacity-50 ${
              feedType === 'campus'
                ? 'bg-white dark:bg-dark-surface text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-805 dark:hover:text-slate-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Campus Feed
          </button>
        </div>
      </div>

      {/* Feed List Container with Isolated Scroll */}
      <div className="h-[calc(100vh-14rem)] overflow-y-auto pr-2 flex flex-col gap-5 scrollbar-thin">
        {loading ? (
        <div className="flex flex-col gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="skeleton-box w-10 h-10 rounded-full" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="skeleton-box w-1/4 h-3.5 rounded" />
                  <div className="skeleton-box w-1/6 h-2.5 rounded" />
                </div>
              </div>
              <div className="skeleton-box w-full h-16 rounded-xl" />
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-4">
                  <div className="skeleton-box w-12 h-5 rounded" />
                  <div className="skeleton-box w-12 h-5 rounded" />
                </div>
                <div className="skeleton-box w-16 h-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-8 shadow-sm">
          <Globe className="w-12 h-12 text-slate-350 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No posts yet</h3>
          <p className="text-sm font-semibold text-slate-450 max-w-sm mx-auto mt-1.5">
            Be the first to share an update on this feed! Click the floating button below to publish.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {posts.map((post) => {
            const isLiked = token && post.likes?.includes(profile?.uid);
            const isSaved = token && savedPostIds.includes(post.id);
            const commentsOpen = expandedComments[post.id] || false;
            const isPostOwner = profile?.uid === post.creatorId;
            const isAdmin = profile?.role === 'admin';
            const isEditing = editingPostId === post.id;

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-5 shadow-sm flex flex-col gap-4 transition-all duration-300"
              >
                {/* Post Header */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/profile/${post.creatorId}`)}
                      className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-655 dark:text-indigo-400 flex items-center justify-center font-bold text-lg uppercase shadow-sm shrink-0 hover:scale-105 transition-transform"
                    >
                      {revealedPostCreators[post.id] ? revealedPostCreators[post.id][0] : (post.creatorName ? post.creatorName[0] : '?')}
                    </button>
                    <div className="text-left flex flex-col justify-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/profile/${post.creatorId}`)}
                          className="text-sm font-extrabold text-slate-800 dark:text-slate-205 hover:text-brand-605 transition-colors"
                        >
                          {revealedPostCreators[post.id] || post.creatorName}
                        </button>
                        
                        {(post.anonymous || post.isAnonymous || post.creatorAnonymousMode) && profile?.role === 'admin' && (
                          <div className="shrink-0 inline-flex ml-1">
                            {revealedPostCreators[post.id] ? (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[9px] uppercase tracking-wider shadow-sm">
                                Unmasked
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevealSocialIdentity(post.id);
                                }}
                                disabled={revealingPostId === post.id}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-extrabold text-[9px] uppercase tracking-wider cursor-pointer transition-colors shadow-md border-none"
                              >
                                {revealingPostId === post.id ? 'Unmasking...' : 'Reveal Identity'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-450 mt-0.5 flex-wrap">
                        {post.college && post.college !== 'Global' ? (
                          <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 rounded-full font-bold text-[9px] uppercase tracking-wider">
                            Campus: {post.college}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-405 rounded-full font-bold text-[9px] uppercase tracking-wider">
                            Global
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(post.createdAt).toLocaleDateString()} at{' '}
                          {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Delete/Edit) */}
                  <div className="flex gap-1.5">
                    {isPostOwner && !isEditing && (
                      <button
                        onClick={() => startEditingPost(post.id, post.content)}
                        title="Edit post"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {(isPostOwner || isAdmin) && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        title="Delete post"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-650 dark:hover:bg-rose-955/20 dark:hover:text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                {isEditing ? (
                  <div className="flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-light-border dark:border-dark-border">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      className="w-full bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none transition-all"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingPostId(null)}
                        disabled={savingEdit}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-655 dark:text-slate-300 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(post.id)}
                        disabled={savingEdit || !editingContent.trim()}
                        className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1"
                      >
                        {savingEdit ? <Loader2 className="w-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

                {/* Image Attachments */}
                {post.images && post.images.length > 0 && (
                  <div className={`grid ${post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 rounded-2xl overflow-hidden border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-900`}>
                    {post.images.map((img: string, i: number) => (
                      <img key={i} src={img} alt="Post attachment" className="w-full h-full max-h-96 object-cover" />
                    ))}
                  </div>
                )}

                {/* Utility Bar */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 text-slate-500 dark:text-slate-400">
                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      isLiked ? 'text-rose-600 dark:text-rose-455' : ''
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 dark:fill-rose-455' : ''}`} />
                    <span>{post.likes?.length || 0}</span>
                  </button>

                  {/* Comment Toggle */}
                  <button
                    onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !commentsOpen }))}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      commentsOpen ? 'text-brand-605 dark:text-brand-400' : ''
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments?.length || 0}</span>
                  </button>

                  {/* Save Button */}
                  <button
                    onClick={() => handleSaveToggle(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      isSaved ? 'text-amber-500' : ''
                    }`}
                  >
                    {isSaved ? <Bookmark className="w-4 h-4 fill-amber-500" /> : <Bookmark className="w-4 h-4" />}
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  {/* Chat Message Creator */}
                  {!isPostOwner && (
                    <button
                      onClick={() => handleMessageCreator(post)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      <span>Chat</span>
                    </button>
                  )}

                  {/* Share Button */}
                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-blue-505" />
                    <span>Share</span>
                  </button>

                  {/* Report Button */}
                  {!isPostOwner && !myReports.some((r) => r.postId === post.id) && (
                    <button
                      onClick={() => setActiveReportId(post.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Report</span>
                    </button>
                  )}
                </div>

                {/* User Report Banner & Actions */}
                {(() => {
                  const userReport = myReports.find((r) => r.postId === post.id);
                  if (!userReport) return null;
                  return (
                    <div className="mx-1 mt-2.5 p-3 bg-rose-50/20 dark:bg-rose-955/10 border border-rose-200/40 dark:border-rose-900/20 rounded-2xl flex flex-col gap-2 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-rose-605 dark:text-rose-455 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                          You Reported This Post
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setEditingReportId(userReport.id);
                              setEditReportReasonText(userReport.reason);
                            }}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit report reason"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReport(userReport.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-colors cursor-pointer"
                            title="Retract report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {editingReportId === userReport.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editReportReasonText}
                            onChange={(e) => setEditReportReasonText(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-dark-surface border border-rose-200 dark:border-rose-900/30 rounded-xl text-slate-850 dark:text-slate-200 text-xs font-semibold focus:outline-none resize-none"
                            rows={2}
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => setEditingReportId(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-350 rounded-lg text-slate-655 font-bold text-[9px] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateReport(userReport.id)}
                              disabled={reportUpdateLoading || !editReportReasonText.trim()}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[9px] cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-455 leading-relaxed">
                          Reason: <span className="italic">"{userReport.reason}"</span>
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Comments Section (Expanded) */}
                {commentsOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col gap-3">
                    <h5 className="text-xs font-extrabold text-slate-850 dark:text-slate-205 uppercase tracking-wider mb-1">
                      Comments ({post.comments?.length || 0})
                    </h5>

                    {post.comments && post.comments.length > 0 && (
                      <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                        {post.comments.map((comment: any) => (
                          <div key={comment.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-light-border dark:border-dark-border rounded-2xl flex flex-col gap-1">
                            <div className="flex justify-between items-center text-left">
                              <button
                                onClick={() => navigate(`/profile/${comment.userId}`)}
                                className="text-xs font-bold text-slate-805 dark:text-slate-200 hover:text-brand-600 transition-colors"
                              >
                                {comment.userName}
                              </button>
                              <span className="text-[9px] font-semibold text-slate-400">
                                {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-350 whitespace-pre-wrap leading-relaxed text-left">
                              {comment.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Write Comment Box */}
                    {token ? (
                      <div className="flex gap-2 items-center mt-1">
                        <input
                          type="text"
                          placeholder="Write an inline comment..."
                          value={newCommentText[post.id] || ''}
                          onChange={(e) =>
                            setNewCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(post.id);
                            }
                          }}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-light-border dark:border-dark-border rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-105 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newCommentText[post.id]?.trim()}
                          className="p-2 bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 rounded-xl cursor-pointer transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 text-center py-2">
                        You must be logged in to comment on posts.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Twitter-Style Sticky Floating Action Button */}
      {token && (
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-full shadow-lg shadow-brand-500/35 transition-all hover:scale-110 flex items-center justify-center cursor-pointer border-none"
          title="Create New Social Post"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Multi-Step High-Fidelity Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-5 transform scale-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600 animate-pulse" />
                Create Social Post
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setContent('');
                  setSelectedImages([]);
                  setImagePreviews([]);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
              {/* Visibility Choice Tabs */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Visibility Target</label>
                <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-light-border dark:border-dark-border">
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('global')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      createVisibility === 'global'
                        ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    Global Post
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('campus')}
                    disabled={!profile?.college && profile?.role !== 'admin'}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer ${
                      createVisibility === 'campus'
                        ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Campus Only
                  </button>
                </div>
                
                {/* Visibility Tip */}
                <p className="text-[10px] font-semibold text-slate-450 leading-relaxed italic">
                  {createVisibility === 'global' 
                    ? '💡 Visible to students across all campuses on the Global Feed.'
                    : profile?.role === 'admin'
                      ? '🔒 Restricted strictly to the targeted college campus feed.'
                      : `🔒 Restricted strictly to your campus network: ${profile?.college}.`
                  }
                </p>
              </div>

              {/* Anonymous Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border border-light-border dark:border-dark-border">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-205">Publish in Anonymous Mode?</span>
                  <span className="text-[10px] text-slate-450 mt-0.5">Mask your identity as "Campus User" on feeds and comments.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
                </label>
              </div>

              {/* Admin College Selector */}
              {profile?.role === 'admin' && createVisibility === 'campus' && (
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Campus College</label>
                  <select
                    value={selectedTargetCollege}
                    onChange={(e) => setSelectedTargetCollege(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="" disabled>-- Select targeted campus college --</option>
                    {colleges.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Text Input */}
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg uppercase shrink-0 shadow-sm">
                  {profile?.name ? profile.name[0] : 'U'}
                </div>
                <textarea
                  placeholder={
                    createVisibility === 'campus'
                      ? `Post updates exclusively to ${profile?.college || 'your college'}...`
                      : "Share a thought, ask a question to all campuses..."
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-light-border dark:border-dark-border rounded-2xl p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all resize-none"
                  autoFocus
                />
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pl-13">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border border-light-border dark:border-dark-border bg-slate-100 dark:bg-slate-900">
                      <img src={preview} alt="Attachment preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex justify-between items-center pl-13 border-t border-slate-105 dark:border-slate-800/60 pt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imagePreviews.length >= 2}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer font-bold text-xs transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-brand-600" />
                  <span>Attach Images (Max 2)</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <button
                  type="submit"
                  disabled={posting || (!content.trim() && selectedImages.length === 0)}
                  className="py-2.5 px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-500/10 flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200"
                >
                  {posting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Post
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Report Modal */}
      {activeReportId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Report Social Post
              </h3>
              <button
                onClick={() => {
                  setActiveReportId(null);
                  setReportReason('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              Please help us keep CampusMarket a safe and welcoming space. Explain why you are reporting this social post.
            </p>

            <form onSubmit={handleReportPost} className="flex flex-col gap-4">
              <textarea
                placeholder="Reason (e.g. offensive content, spam, harassment, safety issue)..."
                required
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-light-border dark:border-dark-border rounded-2xl p-3 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all resize-none"
              />

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveReportId(null);
                    setReportReason('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-605 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting || !reportReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/10 transition-colors"
                >
                  {reporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Reporting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
