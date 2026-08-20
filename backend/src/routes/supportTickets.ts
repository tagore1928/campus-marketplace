import { Router, Response } from 'express';
import { db } from '../config/firebase';

const router = Router();

// Expose POST /api/support-tickets to log a support ticket in Firestore
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Bad Request', message: 'Name, email, and message are required.' });
  }

  // Basic email validation
  if (!email.toLowerCase().endsWith('.edu.in') && !email.toLowerCase().endsWith('.in') && email.toLowerCase() !== 'campusmarketadmin@gmail.com') {
    return res.status(400).json({ error: 'Bad Request', message: 'You must provide a valid college email address ending in .edu.in or .in.' });
  }

  try {
    const ticketRef = db.collection('support_tickets').doc();
    const newTicket = {
      id: ticketRef.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await ticketRef.set(newTicket);
    return res.status(201).json(newTicket);
  } catch (error) {
    console.error('Error logging support ticket:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record support ticket.' });
  }
});

export default router;
