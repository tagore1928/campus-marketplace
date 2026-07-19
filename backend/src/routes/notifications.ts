import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all notifications for the authenticated user
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', user.uid)
      .get();

    const alerts: any[] = [];
    snapshot.forEach((doc) => alerts.push(doc.data()));

    // Sort by newest first
    alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json(alerts);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve notifications.' });
  }
});

// Mark a single notification as read
router.patch('/:id/read', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const notifRef = db.collection('notifications').doc(id);
    const doc = await notifRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Notification not found.' });
    }

    const notif = doc.data()!;
    if (notif.userId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to modify this notification.' });
    }

    await notifRef.update({ read: true });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update notification.' });
  }
});

// Mark all notifications as read
router.post('/read-all', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', user.uid)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    return res.status(200).json({ success: true, count: snapshot.size });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to mark notifications.' });
  }
});

// Clear (delete) all notifications for the authenticated user
router.delete('/clear-all', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', user.uid)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return res.status(200).json({ success: true, count: snapshot.size, message: 'All notifications cleared.' });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to clear notifications.' });
  }
});

export default router;

