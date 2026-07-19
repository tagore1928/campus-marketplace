import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, optionalVerifyToken, AuthRequest } from '../middleware/auth';
import { upload, handleImageUpload, UploadRequest } from '../middleware/upload';
import { obfuscateUid } from '../utils/obfuscate';

const router = Router();

// Privacy masking helper for social posts
const applyPrivacyMask = async (post: any, currentUser?: { uid: string; role: string }) => {
  const isOwner = currentUser && post.creatorId === currentUser.uid;

  let shouldMaskEmail = !isOwner;
  let shouldMaskName = post.anonymous === true;
  let creatorAnonymousMode = false;

  // Check if creator has anonymousMode ON in their profile
  try {
    const creatorDoc = await db.collection('users').doc(post.creatorId).get();
    if (creatorDoc.exists) {
      const creatorData = creatorDoc.data();
      if (creatorData && creatorData.anonymousMode) {
        shouldMaskName = true;
        creatorAnonymousMode = true;
      }
    }
  } catch (err) {
    console.error('Error fetching creator profile for social post privacy mask:', err);
  }

  // Adjust masking condition based on owner rules
  shouldMaskName = shouldMaskName && !isOwner;

  const result = { ...post };
  if (shouldMaskEmail) {
    result.creatorEmail = 'hidden-profile@campusmarket.edu.in';
  }
  if (shouldMaskName) {
    result.creatorName = 'Campus User';
  }
  if (creatorAnonymousMode) {
    result.creatorAnonymousMode = true;
  }

  if (result.creatorId) {
    result.creatorId = obfuscateUid(result.creatorId);
  }

  // Mask comment authors if they have anonymousMode enabled, or if they are the post creator of an anonymous post
  if (result.comments && Array.isArray(result.comments)) {
    result.comments = await Promise.all(result.comments.map(async (c: any) => {
      const isCommentOwner = currentUser && c.userId === currentUser.uid;
      let maskCommentAuthor = false;

      if (!isCommentOwner) {
        if (post.anonymous && c.userId === post.creatorId) {
          maskCommentAuthor = true;
        } else {
          try {
            const commentCreatorDoc = await db.collection('users').doc(c.userId).get();
            if (commentCreatorDoc.exists) {
              const commentCreatorData = commentCreatorDoc.data();
              if (commentCreatorData && commentCreatorData.anonymousMode) {
                maskCommentAuthor = true;
              }
            }
          } catch (err) {
            console.error('Error checking comment creator privacy:', err);
          }
        }
      }

      const commentResult = { ...c };
      if (maskCommentAuthor) {
        commentResult.userName = 'Campus User';
      }
      if (commentResult.userId) {
        commentResult.userId = obfuscateUid(commentResult.userId);
      }
      return commentResult;
    }));
  }

  return result;
};

// Create a new social feed post (supports 0, 1, or 2 images)
router.post('/', verifyToken, upload.array('images', 2), handleImageUpload, async (req: UploadRequest & AuthRequest, res: Response) => {
  const user = req.user!;
  const { content, college } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Bad Request', message: 'Content is required.' });
  }

  if (req.processedImages && req.processedImages.length > 2) {
    return res.status(400).json({ error: 'Bad Request', message: 'You can attach a maximum of 2 images.' });
  }

  try {
    const postRef = db.collection('social_posts').doc();
    
    const postData = {
      id: postRef.id,
      content,
      images: req.processedImages || [],
      creatorId: user.uid,
      creatorName: user.name || user.email?.split('@')[0] || 'Campus User',
      creatorEmail: user.email || '',
      college: college || 'Global',
      anonymous: req.body.anonymous === 'true' || req.body.anonymous === true,
      likes: [],
      comments: [],
      reportsCount: 0,
      reportedBy: [],
      createdAt: new Date().toISOString()
    };

    await postRef.set(postData);
    return res.status(201).json(postData);
  } catch (error) {
    console.error('Error creating social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create social post.' });
  }
});

// Fetch social posts (with optional college/creatorId filters)
router.get('/', optionalVerifyToken, async (req: AuthRequest, res: Response) => {
  const { college, creatorId } = req.query;

  try {
    const snapshot = await db.collection('social_posts').get();
    let posts: any[] = [];
    
    snapshot.forEach((doc) => {
      posts.push(doc.data());
    });

    const viewer = req.user;
    const isAdmin = viewer?.role === 'admin';

    let viewerCollege = '';
    if (viewer && !isAdmin) {
      const viewerDoc = await db.collection('users').doc(viewer.uid).get();
      if (viewerDoc.exists) {
        viewerCollege = viewerDoc.data()?.college || '';
      }
    }

    // Apply Intra-College Isolation and Admin Omnipresent access
    posts = posts.filter(post => {
      if (isAdmin) return true;

      const postCollege = (post.college || 'Global').toLowerCase();
      if (postCollege !== 'global') {
        if (!viewer || !viewerCollege || viewerCollege.toLowerCase() !== postCollege) {
          return false;
        }
      }
      return true;
    });

    // Filter by creatorId or college query parameters
    if (creatorId) {
      posts = posts.filter(post => post.creatorId === creatorId);
    } else if (college) {
      const targetCollege = (college as string).toLowerCase();
      if (isAdmin && targetCollege === 'campus_feed_admin') {
        // Admin gets all localized posts (where college is NOT global)
        posts = posts.filter(post => post.college.toLowerCase() !== 'global');
      } else if (targetCollege === 'global') {
        posts = posts.filter(post => post.college.toLowerCase() === 'global');
      } else {
        posts = posts.filter(post => post.college.toLowerCase() === targetCollege);
      }
    }

    // Sort: newest first
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply privacy masking asynchronously
    const maskedPosts = await Promise.all(
      posts.map(post => applyPrivacyMask(post, req.user))
    );

    return res.status(200).json(maskedPosts);
  } catch (error) {
    console.error('Error fetching social feed:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch social posts.' });
  }
});

// Toggle Like on a social post
router.post('/:id/like', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const postRef = db.collection('social_posts').doc(id);
    const doc = await postRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found.' });
    }

    const post = doc.data()!;
    const likes: string[] = post.likes || [];
    const index = likes.indexOf(user.uid);

    if (index > -1) {
      // Unlike
      likes.splice(index, 1);
    } else {
      // Like
      likes.push(user.uid);
    }

    await postRef.update({ likes });
    return res.status(200).json({ success: true, likes });
  } catch (error) {
    console.error('Error toggling like on social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to toggle like.' });
  }
});

// Add a comment to a social post
router.post('/:id/comment', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Bad Request', message: 'Comment content is required.' });
  }

  try {
    const postRef = db.collection('social_posts').doc(id);
    const doc = await postRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found.' });
    }

    const post = doc.data()!;
    const comments: any[] = post.comments || [];

    const newComment = {
      id: db.collection('temp').doc().id, // Generate a unique ID for comment
      userId: user.uid,
      userName: user.name || user.email?.split('@')[0] || 'Campus User',
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);
    await postRef.update({ comments });

    return res.status(200).json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Error adding comment to social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to post comment.' });
  }
});

// Save/Bookmark a social post
router.post('/:id/save', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const postDoc = await db.collection('social_posts').doc(id).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Social post not found.' });
    }

    const savedRef = db.collection('users').doc(user.uid).collection('savedSocialPosts').doc(id);
    await savedRef.set({
      savedAt: new Date().toISOString(),
      postId: id
    });

    return res.status(200).json({ success: true, message: 'Social post saved.' });
  } catch (error) {
    console.error('Error saving social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to save post.' });
  }
});

// Unsave/Remove bookmark on a social post
router.post('/:id/unsave', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const savedRef = db.collection('users').doc(user.uid).collection('savedSocialPosts').doc(id);
    await savedRef.delete();
    return res.status(200).json({ success: true, message: 'Social post unsaved.' });
  } catch (error) {
    console.error('Error unsaving social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to unsave post.' });
  }
});

// Fetch all saved social posts
router.get('/saved', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  try {
    const snapshot = await db.collection('users').doc(user.uid).collection('savedSocialPosts').get();
    const savedIds: string[] = [];
    snapshot.forEach(doc => {
      savedIds.push(doc.id);
    });

    const posts: any[] = [];
    for (const id of savedIds) {
      const doc = await db.collection('social_posts').doc(id).get();
      if (doc.exists) {
        posts.push(await applyPrivacyMask(doc.data(), user));
      }
    }

    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching saved social posts:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve saved social posts.' });
  }
});

// Flag/Report a social post
router.post('/:id/report', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { reason } = req.body;

  try {
    const postRef = db.collection('social_posts').doc(id);
    const doc = await postRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Social post not found.' });
    }

    const post = doc.data()!;
    const reportedBy = post.reportedBy || [];

    if (reportedBy.includes(user.uid)) {
      return res.status(400).json({ error: 'Bad Request', message: 'You have already reported this post.' });
    }

    reportedBy.push(user.uid);
    const reportsCount = (post.reportsCount || 0) + 1;

    await postRef.update({ reportedBy, reportsCount });

    // Store in admin reports collection
    const reportRef = db.collection('reports').doc();
    await reportRef.set({
      id: reportRef.id,
      postId: id,
      postTitle: `Social Post: "${post.content.substring(0, 30)}..."`,
      postType: 'social',
      reporterId: user.uid,
      reporterEmail: user.email,
      sellerId: post.creatorId,
      reason: reason || 'Unspecified reason',
      createdAt: new Date().toISOString(),
      status: 'pending'
    });

    return res.status(200).json({ success: true, reportsCount });
  } catch (error) {
    console.error('Error reporting social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to report social post.' });
  }
});

// Delete a social post (owner or admin)
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const postRef = db.collection('social_posts').doc(id);
    const doc = await postRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Social post not found.' });
    }

    const post = doc.data()!;
    if (post.creatorId !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this post.' });
    }

    await postRef.delete();
    return res.status(200).json({ success: true, message: 'Social post deleted successfully.' });
  } catch (error) {
    console.error('Error deleting social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete social post.' });
  }
});

// Edit a social post (text content only)
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const user = req.user!;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'Content is required.' });
  }

  try {
    const postRef = db.collection('social_posts').doc(id);
    const doc = await postRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found.' });
    }

    const post = doc.data()!;
    if (post.creatorId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to edit this post.' });
    }

    await postRef.update({
      content: content.trim(),
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await postRef.get();
    return res.status(200).json(updatedDoc.data());
  } catch (error) {
    console.error('Error updating social post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update post.' });
  }
});

export default router;

