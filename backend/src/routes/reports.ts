import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all reports submitted by the logged-in user
router.get('/my-reports', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    const snapshot = await db.collection('reports').where('reporterId', '==', user.uid).get();
    const reportsList: any[] = [];
    snapshot.forEach((doc) => reportsList.push(doc.data()));
    return res.status(200).json(reportsList);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve your reports.' });
  }
});

// Get a single report submitted by the logged-in user for a specific post/listing
router.get('/post/:postId', verifyToken, async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const user = req.user!;
  try {
    const snapshot = await db.collection('reports')
      .where('reporterId', '==', user.uid)
      .where('postId', '==', postId)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    let report: any = null;
    snapshot.forEach((doc) => {
      report = doc.data();
    });
    return res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching report by post ID:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve report.' });
  }
});

// Update a report (reason only)
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'Reason is required.' });
  }

  try {
    const reportRef = db.collection('reports').doc(id);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Report not found.' });
    }

    const report = doc.data()!;
    if (report.reporterId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to edit this report.' });
    }

    await reportRef.update({
      reason: reason.trim(),
      updatedAt: new Date().toISOString()
    });

    const updatedDoc = await reportRef.get();
    return res.status(200).json(updatedDoc.data());
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update report.' });
  }
});

// Delete a report (decrements reportsCount and removes user UID from reportedBy in post/social post)
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const reportRef = db.collection('reports').doc(id);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Report not found.' });
    }

    const report = doc.data()!;
    if (report.reporterId !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this report.' });
    }

    const { postId } = report;

    // 1. Try to find and update in 'posts' collection (Marketplace Listings)
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (postDoc.exists) {
      const postData = postDoc.data()!;
      const reportedBy = postData.reportedBy || [];
      const updatedReportedBy = reportedBy.filter((uid: string) => uid !== report.reporterId);
      const newReportsCount = Math.max(0, (postData.reportsCount || 0) - 1);
      await postRef.update({
        reportedBy: updatedReportedBy,
        reportsCount: newReportsCount
      });
    } else {
      // 2. Try to find and update in 'social_posts' collection (Social Feed)
      const socialPostRef = db.collection('social_posts').doc(postId);
      const socialPostDoc = await socialPostRef.get();
      if (socialPostDoc.exists) {
        const socialPostData = socialPostDoc.data()!;
        const reportedBy = socialPostData.reportedBy || [];
        const updatedReportedBy = reportedBy.filter((uid: string) => uid !== report.reporterId);
        const newReportsCount = Math.max(0, (socialPostData.reportsCount || 0) - 1);
        await socialPostRef.update({
          reportedBy: updatedReportedBy,
          reportsCount: newReportsCount
        });
      }
    }

    // 3. Delete the report document
    await reportRef.delete();

    return res.status(200).json({ success: true, message: 'Report successfully deleted.' });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete report.' });
  }
});

export default router;
