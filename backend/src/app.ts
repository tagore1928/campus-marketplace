import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import routers
import authRouter from './routes/auth';
import postsRouter from './routes/posts';
import chatsRouter from './routes/chats';
import notificationsRouter from './routes/notifications';
import reviewsRouter from './routes/reviews';
import adminRouter from './routes/admin';
import supportTicketsRouter from './routes/supportTickets';
import socialFeedRouter from './routes/socialFeed';
import reportsRouter from './routes/reports';

// Import services and cron setups
import { startExpiryCron } from './cron/expiry';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Configure CORS to allow frontend origin
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploads statically (fallback directory for processed images)
const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Wire backend routers
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/support-tickets', supportTicketsRouter);
app.use('/api/social-feed', socialFeedRouter);
app.use('/api/reports', reportsRouter);


// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});



// Start the auto-expiry cron engine
startExpiryCron();

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`Campus Market Backend listening on port ${PORT}`);
  console.log(`==========================================`);
});

export default app;
