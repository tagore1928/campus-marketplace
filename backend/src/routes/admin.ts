import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { verifyToken, isAdmin, AuthRequest } from '../middleware/auth';
import { deobfuscateUid } from '../utils/obfuscate';

const router = Router();

// Apply auth protection & admin role check to all endpoints in this router
router.use(verifyToken);
router.use(isAdmin);

// Fetch all reported listing records
router.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.collection('reports').get();
    const reportsList: any[] = [];
    snapshot.forEach((doc) => reportsList.push(doc.data()));
    
    // Sort by newest first
    reportsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return res.status(200).json(reportsList);
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve reports.' });
  }
});

// Resolve a report (mark as processed) and notify reporters
router.patch('/reports/:id/resolve', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const reportRef = db.collection('reports').doc(id);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Report log not found.' });
    }

    const reportData = doc.data()!;
    const { postId, postTitle, postType } = reportData;

    // Mark the report as resolved
    await reportRef.update({ status: 'resolved' });

    // Fetch all reports for the same postId (so we notify every reporter)
    const reportsSnapshot = await db.collection('reports').where('postId', '==', postId).get();

    const notifiedUserIds = new Set<string>();
    const notificationsToCreate: any[] = [];

    reportsSnapshot.forEach((rDoc) => {
      const rData = rDoc.data();
      const reporterId = rData.reporterId;
      if (reporterId && !notifiedUserIds.has(reporterId)) {
        notifiedUserIds.add(reporterId);

        const notifRef = db.collection('notifications').doc();
        notificationsToCreate.push({
          ref: notifRef,
          data: {
            id: notifRef.id,
            userId: reporterId,
            type: 'report_resolution',
            title: 'Report Reviewed',
            content: `Your report on "${postTitle || 'Flagged Content'}" has been thoroughly reviewed and resolved.`,
            link: postType === 'social' ? `/campus-feed?post=${postId}` : `/posts/${postId}`,
            read: false,
            createdAt: new Date().toISOString()
          }
        });
      }
    });

    if (notificationsToCreate.length > 0) {
      const batch = db.batch();
      notificationsToCreate.forEach((n) => {
        batch.set(n.ref, n.data);
      });
      await batch.commit();
    }

    return res.status(200).json({ success: true, message: 'Report resolved and notifications sent.' });
  } catch (error) {
    console.error('Error resolving report:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update report.' });
  }
});

// Delete a reported listing or social post, mark related reports as resolved, and notify reporters
router.delete('/posts/:postId', async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;

  try {
    let deleted = false;
    let postTitle = 'Flagged Content';

    // 1. Try to delete from marketplace listings
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (postDoc.exists) {
      postTitle = postDoc.data()!.title;
      await postRef.delete();
      deleted = true;
    } else {
      // 2. Try to delete from social posts
      const socialPostRef = db.collection('social_posts').doc(postId);
      const socialPostDoc = await socialPostRef.get();
      if (socialPostDoc.exists) {
        postTitle = socialPostDoc.data()!.content.substring(0, 30);
        await socialPostRef.delete();
        deleted = true;
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Listing or post not found.' });
    }

    // 3. Mark related reports as resolved and notify reporters
    const reportsSnapshot = await db.collection('reports').where('postId', '==', postId).get();
    
    const notifiedUserIds = new Set<string>();
    const notificationsToCreate: any[] = [];
    const reportsBatch = db.batch();

    reportsSnapshot.forEach((doc) => {
      reportsBatch.update(doc.ref, { status: 'resolved' });
      const rData = doc.data();
      const reporterId = rData.reporterId;
      if (reporterId && !notifiedUserIds.has(reporterId)) {
        notifiedUserIds.add(reporterId);
        
        const notifRef = db.collection('notifications').doc();
        notificationsToCreate.push({
          ref: notifRef,
          data: {
            id: notifRef.id,
            userId: reporterId,
            type: 'report_resolution',
            title: 'Report Actioned',
            content: `The item "${rData.postTitle || postTitle}" you reported has been successfully removed from the platform.`,
            link: '', // Content is deleted, so no link
            read: false,
            createdAt: new Date().toISOString()
          }
        });
      }
    });

    await reportsBatch.commit();

    if (notificationsToCreate.length > 0) {
      const notifBatch = db.batch();
      notificationsToCreate.forEach((n) => {
        notifBatch.set(n.ref, n.data);
      });
      await notifBatch.commit();
    }

    return res.status(200).json({ success: true, message: 'Content deleted and related reports actioned.' });
  } catch (error) {
    console.error('Error removing post by admin:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to remove content.' });
  }
});

// List all registered platform users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.collection('users').get();
    const usersList: any[] = [];
    snapshot.forEach((doc) => usersList.push(doc.data()));

    return res.status(200).json(usersList);
  } catch (error) {
    console.error('Error retrieving users:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch user list.' });
  }
});

// Ban / delete a user and wipe their listings
router.delete('/users/:userId', async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  try {
    // 1. Delete user document from Firestore
    await db.collection('users').doc(userId).delete();

    // 2. Delete user from Firebase Auth
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      console.warn(`User ${userId} might not exist in Firebase Auth directly or was deleted already.`, authError);
    }

    // 3. Remove all listings created by this user
    const postsSnapshot = await db.collection('posts').where('creatorId', '==', userId).get();
    const batch = db.batch();
    postsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return res.status(200).json({ success: true, message: 'User profile and all associated listings have been deleted.' });
  } catch (error) {
    console.error('Error banning user:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete user.' });
  }
});

// Fetch all support tickets
router.get('/tickets', async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.collection('support_tickets').get();
    const ticketsList: any[] = [];
    snapshot.forEach((doc) => ticketsList.push(doc.data()));
    
    // Sort by newest first
    ticketsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return res.status(200).json(ticketsList);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve support tickets.' });
  }
});

// Resolve a support ticket
router.patch('/tickets/:id/resolve', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const ticketRef = db.collection('support_tickets').doc(id);
    const doc = await ticketRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Support ticket not found.' });
    }

    await ticketRef.update({ status: 'resolved' });
    return res.status(200).json({ success: true, message: 'Support ticket marked as resolved.' });
  } catch (error) {
    console.error('Error resolving support ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update support ticket.' });
  }
});

// Delete a support ticket
router.delete('/tickets/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const ticketRef = db.collection('support_tickets').doc(id);
    const doc = await ticketRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Support ticket not found.' });
    }

    await ticketRef.delete();
    return res.status(200).json({ success: true, message: 'Support ticket deleted.' });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete support ticket.' });
  }
});

// Reveal masked user identity and create audit log
router.post('/reveal-identity', async (req: AuthRequest, res: Response) => {
  const admin = req.user!;
  const { targetId, type } = req.body;

  if (!targetId || !type) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing targetId or type.' });
  }

  try {
    let targetUid: string | null = null;
    let detailMessage = '';

    if (type === 'post') {
      const doc = await db.collection('posts').doc(targetId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Not Found', message: 'Listing not found.' });
      }
      const data = doc.data()!;
      targetUid = data.creatorId;
      detailMessage = `Revealed creator of marketplace listing "${data.title}" (${targetId})`;
    } else if (type === 'social-feed') {
      const doc = await db.collection('social_posts').doc(targetId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Not Found', message: 'Social post not found.' });
      }
      const data = doc.data()!;
      targetUid = data.creatorId;
      detailMessage = `Revealed creator of social post "${data.content.substring(0, 30)}..." (${targetId})`;
    } else if (type === 'user') {
      targetUid = deobfuscateUid(targetId);
      detailMessage = `Revealed details of user with UID (${targetUid})`;
    } else {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid reveal type.' });
    }

    if (!targetUid) {
      return res.status(404).json({ error: 'Not Found', message: 'Associated user could not be found.' });
    }

    const userDoc = await db.collection('users').doc(targetUid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'User profile not found.' });
    }

    const userData = userDoc.data()!;

    // Create Audit Log
    const auditRef = db.collection('audit_logs').doc();
    const auditData = {
      id: auditRef.id,
      adminId: admin.uid,
      adminEmail: admin.email || 'unknown-admin',
      action: 'REVEAL_IDENTITY',
      targetId,
      targetType: type,
      targetUserId: targetUid,
      targetUserIdentity: `${userData.name || 'Anonymous User'} (${userData.email || 'hidden-email'})`,
      timestamp: new Date().toISOString(),
      details: `${detailMessage} | Target User Identity: ${userData.name || 'Anonymous User'} (${userData.email || 'hidden-email'})`,
    };
    await auditRef.set(auditData);

    return res.status(200).json({
      name: userData.name,
      email: userData.email,
    });
  } catch (error) {
    console.error('Error revealing identity:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to reveal user identity.' });
  }
});

// Fetch all admin audit logs
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.collection('audit_logs').get();
    const logsList: any[] = [];
    snapshot.forEach((doc) => logsList.push(doc.data()));
    
    // Sort by newest first
    logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return res.status(200).json(logsList);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve audit logs.' });
  }
});

// Permanently delete a resolved report log
router.delete('/reports/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const reportRef = db.collection('reports').doc(id);
    const doc = await reportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Report log not found.' });
    }

    const reportData = doc.data()!;
    if (reportData.status !== 'resolved') {
      return res.status(400).json({ error: 'Bad Request', message: 'Only resolved report logs can be deleted.' });
    }

    await reportRef.delete();
    return res.status(200).json({ success: true, message: 'Report log permanently deleted.' });
  } catch (error) {
    console.error('Error deleting report log:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete report log.' });
  }
});

// Purge all records within the audit_logs collection (handling Firestore's 500 batch limit)
router.delete('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.collection('audit_logs').get();
    const docs = snapshot.docs;
    
    if (docs.length === 0) {
      return res.status(200).json({ success: true, message: 'No audit logs to delete.' });
    }

    // Chunk size 500 for Firestore batch operations
    const chunkSize = 500;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = db.batch();
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return res.status(200).json({ success: true, message: 'All audit logs purged successfully.' });
  } catch (error) {
    console.error('Error purging audit logs:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to purge audit logs.' });
  }
});

export default router;

