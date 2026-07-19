import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, optionalVerifyToken, AuthRequest } from '../middleware/auth';
import { upload, handleImageUpload, UploadRequest } from '../middleware/upload';
import { obfuscateUid } from '../utils/obfuscate';

const router = Router();

// Mask seller information if listing is anonymous or creator has global anonymousMode active
const applyPrivacyMask = async (post: any, currentUser?: { uid: string; role: string }) => {
  const isOwner = currentUser && post.creatorId === currentUser.uid;

  let shouldMaskEmail = !isOwner;
  let shouldMaskName = false;
  let creatorAnonymousMode = false;

  if (post.anonymous) {
    shouldMaskName = !isOwner;
  } else {
    try {
      const creatorDoc = await db.collection('users').doc(post.creatorId).get();
      if (creatorDoc.exists) {
        const creatorData = creatorDoc.data();
        if (creatorData && creatorData.anonymousMode) {
          shouldMaskName = !isOwner;
          creatorAnonymousMode = true;
        }
      }
    } catch (err) {
      console.error('Error fetching creator profile for privacy mask:', err);
    }
  }

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

  return result;
};

// Create a new listing (with image uploads processed by Multer + Sharp)
router.post('/', verifyToken, upload.array('images', 5), handleImageUpload, async (req: UploadRequest & AuthRequest, res: Response) => {
  const user = req.user!;
  const { title, description, price, type, category, college, anonymous, expiryOption } = req.body;

  if (!title || !type || !category || !college) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing required fields (title, type, category, college).' });
  }

  try {
    const postRef = db.collection('posts').doc();
    const parsedPrice = parseFloat(price) || 0;
    const isAnonymous = anonymous === 'true' || anonymous === true;

    const chosenExpiryOption = expiryOption || 'none';
    let expiresAt: string | null = null;
    if (chosenExpiryOption !== 'none') {
      const days = parseInt(chosenExpiryOption) || 30;
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const postData = {
      id: postRef.id,
      title,
      description: description || '',
      price: parsedPrice,
      type, // 'selling' | 'free'
      category,
      college,
      images: req.processedImages || [],
      creatorId: user.uid,
      creatorName: user.name || user.email?.split('@')[0] || 'Seller',
      creatorEmail: user.email || '',
      anonymous: isAnonymous,
      expiryOption: chosenExpiryOption,
      status: 'active', // 'active' | 'sold' | 'taken' | 'expired'
      reportsCount: 0,
      reportedBy: [],
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    await postRef.set(postData);

    // Trigger campus alerts for all registered students of the same college asynchronously
    (async () => {
      try {
        const usersSnapshot = await db.collection('users').where('college', '==', college).get();
        
        usersSnapshot.forEach(async (userDoc) => {
          const u = userDoc.data();
          // Exclude the listing creator
          if (u.uid && u.uid !== user.uid) {
            const notifRef = db.collection('notifications').doc();
            const notificationData = {
              id: notifRef.id,
              userId: u.uid,
              type: 'product',
              title: `New Listing in ${college}`,
              content: `A new item "${title}" has been listed on your campus feed.`,
              link: `/posts/${postRef.id}`,
              read: false,
              createdAt: new Date().toISOString(),
            };
            
            await notifRef.set(notificationData);
          }
        });
      } catch (err) {
        console.error('Error triggering campus alerts:', err);
      }
    })();

    return res.status(201).json(postData);
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create listing.' });
  }
});

// Advanced Feed & Search with Auto-complete matching
router.get('/', optionalVerifyToken, async (req: AuthRequest, res: Response) => {
  const { search, college, type, category, minPrice, maxPrice, days, creatorId } = req.query;

  try {
    let queryRef: any = db.collection('posts');

    // Fetch listings
    const snapshot = await queryRef.get();
    let listings: any[] = [];
    
    snapshot.forEach((doc: any) => {
      listings.push(doc.data());
    });

    // Apply Filters in memory for maximum search flexibility in local dev
    listings = listings.filter((item) => {
      // Filter by status (allow owners to see their sold/taken items)
      if (item.status !== 'active') {
        if (!creatorId || item.creatorId !== creatorId) {
          return false;
        }
      }

      // Filter by specific creator
      if (creatorId && item.creatorId !== creatorId) {
        return false;
      }

      // Filter by specific college (campus-specific feed)
      if (req.user?.role !== 'admin') {
        if (college && college !== 'Global' && item.college.toLowerCase() !== (college as string).toLowerCase()) {
          return false;
        }
      }

      // Filter by listing type (selling vs free)
      if (type && item.type.toLowerCase() !== (type as string).toLowerCase()) {
        return false;
      }

      // Filter by category
      if (category && item.category.toLowerCase() !== (category as string).toLowerCase()) {
        return false;
      }

      // Filter by price range
      if (minPrice && item.price < parseFloat(minPrice as string)) {
        return false;
      }
      if (maxPrice && item.price > parseFloat(maxPrice as string)) {
        return false;
      }

      // Filter by date range (days posted)
      if (days) {
        const pastDate = Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000;
        const itemDate = new Date(item.createdAt).getTime();
        if (itemDate < pastDate) {
          return false;
        }
      }

      // Autocomplete search match
      if (search) {
        const query = (search as string).toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesCollege = item.college.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCategory && !matchesCollege) {
          return false;
        }
      }

      return true;
    });

    // Sort active listings: newest first
    listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply Privacy Masking to results asynchronously
    const maskedListings = await Promise.all(
      listings.map((post) => applyPrivacyMask(post, req.user))
    );

    return res.status(200).json(maskedListings);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch feeds.' });
  }
});

// Get all posts bookmarked by the user
router.get('/saved', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    const snapshot = await db.collection('users').doc(user.uid).collection('savedProducts').get();
    const savedIds: string[] = [];
    snapshot.forEach((doc) => {
      savedIds.push(doc.id);
    });

    const posts: any[] = [];
    for (const id of savedIds) {
      const postDoc = await db.collection('posts').doc(id).get();
      if (postDoc.exists) {
        posts.push(await applyPrivacyMask(postDoc.data(), user));
      }
    }
    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch saved posts.' });
  }
});

// Get list of saved listing IDs for active highlights
router.get('/saved/ids', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    const snapshot = await db.collection('users').doc(user.uid).collection('savedProducts').get();
    const savedIds: string[] = [];
    snapshot.forEach((doc) => {
      savedIds.push(doc.id);
    });
    return res.status(200).json(savedIds);
  } catch (error) {
    console.error('Error fetching saved post IDs:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch saved post IDs.' });
  }
});

// Get detailed view of a single listing
router.get('/:id', optionalVerifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const postDoc = await db.collection('posts').doc(id).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Listing not found.' });
    }

    const post = postDoc.data();
    const maskedPost = await applyPrivacyMask(post, req.user);
    return res.status(200).json(maskedPost);
  } catch (error) {
    console.error('Error fetching post details:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load details.' });
  }
});


// Update an active listing
router.put('/:id', verifyToken, upload.array('images', 5), handleImageUpload, async (req: UploadRequest & AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { title, description, price, type, category, college, anonymous, status } = req.body;

  try {
    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Listing not found.' });
    }

    const post = postDoc.data()!;
    // Guard: only creator or admin can edit
    if (post.creatorId !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to edit this listing.' });
    }

    const updatedData: any = {};
    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;
    if (price !== undefined) updatedData.price = parseFloat(price) || 0;
    if (type !== undefined) updatedData.type = type;
    if (category !== undefined) updatedData.category = category;
    if (college !== undefined) updatedData.college = college;
    if (anonymous !== undefined) updatedData.anonymous = anonymous === 'true' || anonymous === true;
    if (status !== undefined) updatedData.status = status; // 'active' | 'sold' | 'taken' | 'expired'
    
    // Add new images if uploaded
    if (req.processedImages && req.processedImages.length > 0) {
      updatedData.images = [...(post.images || []), ...req.processedImages];
    }

    updatedData.updatedAt = new Date().toISOString();

    await postRef.update(updatedData);
    
    const refreshedDoc = await postRef.get();
    return res.status(200).json(refreshedDoc.data());
  } catch (error) {
    console.error('Error updating post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update listing.' });
  }
});

// Delete a listing
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Listing not found.' });
    }

    const post = postDoc.data()!;
    // Guard: only creator or admin can delete
    if (post.creatorId !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this listing.' });
    }

    await postRef.delete();
    return res.status(200).json({ success: true, message: 'Listing successfully deleted.' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete listing.' });
  }
});

// Flag/Report a listing
router.post('/:id/report', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { reason } = req.body;

  try {
    const postRef = db.collection('posts').doc(id);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Listing not found.' });
    }

    const post = postDoc.data()!;
    const reportedBy = post.reportedBy || [];

    if (reportedBy.includes(user.uid)) {
      return res.status(400).json({ error: 'Bad Request', message: 'You have already reported this listing.' });
    }

    const newReportsCount = (post.reportsCount || 0) + 1;
    reportedBy.push(user.uid);

    await postRef.update({
      reportsCount: newReportsCount,
      reportedBy,
    });

    // Log the report in a central 'reports' collection for Admin access
    const reportRef = db.collection('reports').doc();
    await reportRef.set({
      id: reportRef.id,
      postId: id,
      postTitle: post.title,
      postType: 'listing',
      reporterId: user.uid,
      reporterEmail: user.email,
      sellerId: post.creatorId,
      reason: reason || 'Unspecified reason',
      createdAt: new Date().toISOString(),
      status: 'pending', // 'pending' | 'resolved'
    });

    return res.status(200).json({ success: true, reportsCount: newReportsCount });
  } catch (error) {
    console.error('Error reporting listing:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to submit report.' });
  }
});

// Save/Bookmark a listing (Limit to 50 items)
router.post('/:id/save', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    // Check if post exists
    const postDoc = await db.collection('posts').doc(id).get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Listing not found.' });
    }

    // Check existing bookmarks count
    const savedProductsRef = db.collection('users').doc(user.uid).collection('savedProducts');
    const snapshot = await savedProductsRef.get();
    if (snapshot.size >= 50) {
      return res.status(400).json({
        error: 'Limit Reached',
        message: 'You have reached the limit of 50 bookmarked items. Please remove some before saving more.'
      });
    }

    await savedProductsRef.doc(id).set({
      savedAt: new Date().toISOString(),
      listingId: id
    });

    return res.status(200).json({ success: true, message: 'Listing bookmarked successfully.' });
  } catch (error) {
    console.error('Error saving listing:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to bookmark listing.' });
  }
});

// Unsave/Remove a bookmark (POST fallback)
router.post('/:id/unsave', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const savedRef = db.collection('users').doc(user.uid).collection('savedProducts').doc(id);
    await savedRef.delete();
    return res.status(200).json({ success: true, message: 'Listing removed from bookmarks.' });
  } catch (error) {
    console.error('Error unsaving listing:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to remove bookmark.' });
  }
});

// Unsave/Remove a bookmark (DELETE standard)
router.delete('/:id/save', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const savedRef = db.collection('users').doc(user.uid).collection('savedProducts').doc(id);
    await savedRef.delete();
    return res.status(200).json({ success: true, message: 'Listing removed from bookmarks.' });
  } catch (error) {
    console.error('Error unsaving listing:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to remove bookmark.' });
  }
});

export default router;
