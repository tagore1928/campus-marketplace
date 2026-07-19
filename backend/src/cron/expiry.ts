import cron from 'node-cron';
import { db } from '../config/firebase';

// Helper to scan active posts and transition posts past their expiresAt date to 'expired' status
export const checkAndExpireListings = async () => {
  console.log('[Auto-Expiry Engine] Checking for expired listings...');
  try {
    const now = new Date().toISOString();
    
    // Query active posts in Firestore
    const snapshot = await db.collection('posts')
      .where('status', '==', 'active')
      .get();

    if (snapshot.empty) {
      console.log('[Auto-Expiry Engine] No active listings found.');
      return;
    }

    const batch = db.batch();
    let expiredCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.expiresAt && new Date(data.expiresAt).getTime() <= new Date(now).getTime()) {
        batch.update(doc.ref, { status: 'expired' });
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      await batch.commit();
      console.log(`[Auto-Expiry Engine] Marked ${expiredCount} listings as expired.`);
    } else {
      console.log('[Auto-Expiry Engine] No listings met the expiration threshold.');
    }
  } catch (error) {
    console.error('[Auto-Expiry Engine] Error checking expired listings:', error);
  }
};

// Scheduled background task to clean up old user reports and closed listings
export const checkAndCleanMaintenance = async () => {
  console.log('[Maintenance Service] Running daily database cleanup...');
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Delete user reports older than 30 days
    const reportsSnapshot = await db.collection('reports')
      .where('createdAt', '<', thirtyDaysAgo)
      .get();

    if (!reportsSnapshot.empty) {
      const batch = db.batch();
      reportsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`[Maintenance Service] Hard-deleted ${reportsSnapshot.size} reports older than 30 days.`);
    }

    // 2. Delete posts/listings in closed status (sold, taken, expired) older than 30 days
    const closedStatuses = ['sold', 'taken', 'expired'];
    let prunedListingsCount = 0;

    for (const status of closedStatuses) {
      const postsSnapshot = await db.collection('posts')
        .where('status', '==', status)
        .get();

      if (!postsSnapshot.empty) {
        const batch = db.batch();
        let currentBatchCount = 0;
        postsSnapshot.forEach((doc) => {
          const data = doc.data();
          const checkDate = data.updatedAt || data.createdAt;
          if (checkDate && checkDate < thirtyDaysAgo) {
            batch.delete(doc.ref);
            currentBatchCount++;
            prunedListingsCount++;
          }
        });
        if (currentBatchCount > 0) {
          await batch.commit();
        }
      }
    }

    if (prunedListingsCount > 0) {
      console.log(`[Maintenance Service] Hard-deleted ${prunedListingsCount} closed/archived/expired listings older than 30 days.`);
    }
  } catch (error) {
    console.error('[Maintenance Service] Error during maintenance execution:', error);
  }
};

// Initializes the cron scheduler (runs every day at midnight and also checks once at startup)
export const startExpiryCron = () => {
  console.log('[Auto-Expiry Engine] Lifecycle Engine initialized.');
  
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    await checkAndExpireListings();
    await checkAndCleanMaintenance();
  });

  // Run on startup
  checkAndExpireListings();
  checkAndCleanMaintenance();
};
