import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Recalculate and update the aggregate thumbsUp/thumbsDown counts for a seller
const updateSellerRatingAggregate = async (sellerId: string) => {
  try {
    const snapshot = await db.collection('reviews').where('sellerId', '==', sellerId).get();
    let thumbsUp = 0;
    let thumbsDown = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.thumbsUp) {
        thumbsUp++;
      } else {
        thumbsDown++;
      }
    });

    await db.collection('users').doc(sellerId).update({
      thumbsUp,
      thumbsDown
    });
  } catch (error) {
    console.error(`Failed to update rating aggregates for user ${sellerId}:`, error);
  }
};

// Add a review for a seller
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  const buyer = req.user!;
  const { sellerId, thumbsUp, content } = req.body;

  if (!sellerId || thumbsUp === undefined) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing sellerId or thumbsUp selection.' });
  }

  if (sellerId === buyer.uid) {
    return res.status(400).json({ error: 'Bad Request', message: 'You cannot submit a review for yourself.' });
  }

  try {
    // Check if buyer has already reviewed this seller
    const existingSnapshot = await db.collection('reviews')
      .where('sellerId', '==', sellerId)
      .where('buyerId', '==', buyer.uid)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(400).json({ error: 'Bad Request', message: 'You have already reviewed this seller. You can edit your existing review.' });
    }

    const reviewRef = db.collection('reviews').doc();
    const newReview = {
      id: reviewRef.id,
      sellerId,
      buyerId: buyer.uid,
      buyerName: buyer.name || buyer.email?.split('@')[0] || 'Anonymous',
      thumbsUp: !!thumbsUp,
      content: content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await reviewRef.set(newReview);
    await updateSellerRatingAggregate(sellerId);

    // Send a real-time notification alert to the seller
    const notifRef = db.collection('notifications').doc();
    await notifRef.set({
      id: notifRef.id,
      userId: sellerId,
      type: 'review',
      title: 'New Review Received',
      content: `${newReview.buyerName} left you a rating: ${thumbsUp ? 'Thumbs Up' : 'Thumbs Down'}.`,
      link: '/profile',
      read: false,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to submit review.' });
  }
});

// Get reviews for a specific seller
router.get('/:sellerId', async (req: AuthRequest, res: Response) => {
  const { sellerId } = req.params;

  try {
    const snapshot = await db.collection('reviews').where('sellerId', '==', sellerId).get();
    const reviewsList: any[] = [];
    snapshot.forEach((doc) => reviewsList.push(doc.data()));

    // Sort by newest first
    reviewsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json(reviewsList);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve reviews.' });
  }
});

// Edit an existing review
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const buyer = req.user!;
  const { thumbsUp, content } = req.body;

  try {
    const reviewRef = db.collection('reviews').doc(id);
    const doc = await reviewRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Review not found.' });
    }

    const review = doc.data()!;
    if (review.buyerId !== buyer.uid) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to edit this review.' });
    }

    const updatedData: any = {};
    if (thumbsUp !== undefined) updatedData.thumbsUp = !!thumbsUp;
    if (content !== undefined) updatedData.content = content;
    updatedData.updatedAt = new Date().toISOString();

    await reviewRef.update(updatedData);
    await updateSellerRatingAggregate(review.sellerId);

    const refreshedDoc = await reviewRef.get();
    return res.status(200).json(refreshedDoc.data());
  } catch (error) {
    console.error('Error editing review:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update review.' });
  }
});

// Delete a review
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const buyer = req.user!;

  try {
    const reviewRef = db.collection('reviews').doc(id);
    const doc = await reviewRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Review not found.' });
    }

    const review = doc.data()!;
    if (review.buyerId !== buyer.uid && buyer.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this review.' });
    }

    await reviewRef.delete();
    await updateSellerRatingAggregate(review.sellerId);

    return res.status(200).json({ success: true, message: 'Review successfully deleted.' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete review.' });
  }
});

export default router;
