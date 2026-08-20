import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Self-invoking database alignment for existing admins
(async () => {
  try {
    const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    const batch = db.batch();
    let count = 0;
    adminsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.college !== '' || data.isCustomCollege !== false) {
        batch.update(doc.ref, { college: '', isCustomCollege: false });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      console.log(`[Admin Realignment] Cleared college restrictions for ${count} admin profiles.`);
    }
  } catch (err) {
    console.error('Error during admin database realignment:', err);
  }
})();

// Endpoint to retrieve all colleges from master collection
router.get('/colleges', async (req, res) => {
  try {
    const snapshot = await db.collection('colleges').get();
    const collegesList: string[] = [];
    snapshot.forEach((doc) => {
      collegesList.push(doc.id);
    });

    collegesList.sort();

    const defaults = ['IIT Bombay', 'IIT Delhi', 'BITS Pilani', 'VIT Vellore', 'RV College of Engineering'];
    const merged = Array.from(new Set([...defaults, ...collegesList]));
    return res.status(200).json(merged);
  } catch (error) {
    console.error('Error fetching colleges list:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve college registry.' });
  }
});

// Endpoint to create or update a user's campus profile after Firebase registration/login
// Checked by rate limiter
router.post('/profile', authRateLimiter, verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(400).json({ error: 'Bad Request', message: 'User object missing.' });
  }

  const { college, isCustomCollege, name } = req.body;

  // Domain validation: Restrict standard registration explicitly to college emails ending in .edu.in or .in (except admin)
  const email = user.email || '';
  const isValidDomain = email.toLowerCase().endsWith('.edu.in') || email.toLowerCase().endsWith('.in');
  const isAdminEmail = email.toLowerCase() === 'campusmarketadmin@gmail.com';
  
  if (!isValidDomain && !isAdminEmail) {
    return res.status(400).json({
      error: 'Invalid Domain',
      message: 'Registration is restricted explicitly to college email addresses ending in .edu.in or .in'
    });
  }

  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    const existingData = doc.exists ? doc.data() : null;

    const role = isAdminEmail ? 'admin' : (user.role || (existingData ? existingData.role : 'student'));

    // Admin decoupling validation: college name is neither required nor applicable for administrators
    const profileData = {
      uid: user.uid,
      email: email.toLowerCase(),
      name: name || (existingData ? existingData.name : null) || user.name || email.split('@')[0],
      college: role === 'admin' ? '' : (college || (existingData ? existingData.college : 'Unspecified')),
      isCustomCollege: role === 'admin' ? false : (isCustomCollege !== undefined ? !!isCustomCollege : (existingData ? !!existingData.isCustomCollege : false)),
      role,
      updatedAt: new Date().toISOString(),
    };

    if (!doc.exists) {
      // Initialize profile
      Object.assign(profileData, {
        createdAt: new Date().toISOString(),
        thumbsUp: 0,
        thumbsDown: 0,
        anonymousMode: false,
      });
      await userRef.set(profileData);
    } else {
      // Update existing
      await userRef.update(profileData);
    }

    // Dynamic Onboarding auto-populating registry
    if (profileData.role !== 'admin' && profileData.isCustomCollege && profileData.college && profileData.college !== 'Unspecified') {
      const colName = profileData.college.trim();
      if (colName) {
        await db.collection('colleges').doc(colName).set({
          name: colName,
          createdAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[College Onboarding] Auto-ingested custom college: ${colName}`);
      }
    }

    const finalDoc = await userRef.get();
    return res.status(200).json(finalDoc.data());
  } catch (error) {
    console.error('Error saving user profile:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to sync user profile.' });
  }
});

// Endpoint to fetch the logged-in user's profile
router.get('/profile', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(400).json({ error: 'Bad Request', message: 'User object missing.' });
  }

  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Profile not found.' });
    }
    return res.status(200).json(doc.data());
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve profile.' });
  }
});

// Endpoint to update anonymous mode toggle
router.patch('/profile/anonymous', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(400).json({ error: 'Bad Request', message: 'User object missing.' });
  }

  const { anonymousMode } = req.body;

  try {
    const userRef = db.collection('users').doc(user.uid);
    await userRef.update({ anonymousMode: !!anonymousMode });
    return res.status(200).json({ success: true, anonymousMode });
  } catch (error) {
    console.error('Error updating privacy mode:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update privacy settings.' });
  }
});

// Endpoint to fetch another user's profile (with anonymous mode masking)
router.get('/profile/:uid', verifyToken, async (req: AuthRequest, res: Response) => {
  const { uid } = req.params;
  const currentUser = req.user!;

  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Profile not found.' });
    }

    const userData = doc.data()!;
    const isOwner = currentUser.uid === uid;
    const isAdmin = currentUser.role === 'admin';

    // Mask name & email if anonymousMode is true and current user is not owner/admin
    if (userData.anonymousMode && !isOwner && !isAdmin) {
      userData.name = 'Campus User';
      userData.email = 'hidden-profile@campusmarket.edu.in';
    }

    // Mask admin role & metadata for normal users to protect their interaction space
    if (userData.role === 'admin' && !isOwner && !isAdmin) {
      userData.role = 'student';
    }

    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error getting peer user profile:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve user profile.' });
  }
});

export default router;
