# Campus Market Platform

Campus Market is a secure, hyper-local peer-to-peer peer marketplace and social interaction network built exclusively for university students. It combines verified student e-commerce listings with college social feeds, real-time message boards, and strict privacy guardrails.

---

## 🚀 Core Technology Stack

- **Frontend**: React (v18+), Vite, Tailwind CSS, Lucide Icons, Firebase Client SDK (Firestore onSnapshot, Auth), Axios, React Router Dom.
- **Backend**: Node.js, Express, TypeScript, Firebase Admin SDK (configured for serverless execution on Vercel).
- **Database & Services**: Firebase Firestore (primary document store with client-side Firestore listeners & writes), Firebase Authentication.

---

## 🛠️ Key Feature Sets

### 1. Omnipresent Administrative Access
- **Intra-Campus Decoupling**: Admin accounts are decoupled from single-campus restrictions.
- **Moderation Feeds**: Admins bypass college isolation filters to monitor all localized campus social posts under a unified dashboard.
- **Targeted Announcements**: Admins can explicitly select targeted campus destinations to publish notifications.

### 2. Multi-Tier Privacy Toggles (Anonymous Mode)
- **Deep Identity Masking**: Standard users can toggle "Anonymous Mode" from their profile settings to replace name and email indicators with the "Campus User" moniker across active listings, real-time chats, and notifications.
- **Anonymous Post Submissions**: When publishing a social post, users can select the "Publish in Anonymous Mode?" checkbox. This masks their creator credentials on the post card and comments.

### 3. Granular Chat Room Deletion Engine
- **Message-Level Deletion**: Users can hover over their sent messages (or admins over any message) to delete specific text bubbles instantly.
- **Thread-Level Deletion**: A "Delete Chat Room" button at the top header allows users to permanently wipe out the entire conversation thread and nested messages.
- **Real-Time Synchronicity**: Chat updates, message delivery, and deletion updates are propagated to peers in real-time using native Firestore `onSnapshot` listeners and direct client-side database writes.

### 4. Layout & Theme Consistency
- **Default Light Mode**: First-time platform visitors land on a clean Light Mode theme. Manual toggle preferences are saved in `localStorage` for returning users.
- **Responsive Footer Pages**: The footer contains router navigation paths to beautiful, dedicated informational pages:
  - **About Us**: Platform mission and student trust guidelines.
  - **Privacy Policy**: Email verification guardrails, `.edu.in` domain isolation, and anonymity masking.
  - **Terms of Service**: Code of conduct, forbidden listings, and moderation mandates.

---

## 📁 Repository Structure

```text
Campusmarket/
├── backend/
│   ├── src/
│   │   ├── config/          # Firebase initialization
│   │   ├── cron/            # Auto-expiry listing cleanups
│   │   ├── middleware/      # Auth & image upload handlers
│   │   ├── routes/          # Express API route controllers
│   │   │   ├── admin.ts
│   │   │   ├── auth.ts
│   │   │   ├── chats.ts
│   │   │   ├── socialFeed.ts
│   │   │   └── ...
│   │   └── app.ts           # Server initialization
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Common components (Footer, Sidebar, NotificationCenter)
│   │   ├── context/         # Auth, Dialog, and Theme context providers
│   │   ├── pages/           # Pages (Home, Feed, CampusFeed, Chat, Profile, Docs)
│   │   └── App.tsx          # Client routing & layout configuration
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
- Node.js (v18+)
- Firebase Project setup with Authentication & Firestore database enabled.

### 2. Configure Backend `.env`
Create a `.env` file in the `backend/` directory:
```env
PORT=8080
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/firebase-service-account.json
# Client Allowed Origins
FRONTEND_URLS=http://localhost:5173,http://localhost:5174
```

### 3. Configure Frontend Credentials
Setup Firebase configuration variables inside `frontend/src/config/firebase.ts`.

### 4. Run Development Servers
In separate terminal tabs, run:
```bash
# Start the backend server
cd backend
npm install
npm run dev

# Start the frontend dev server
cd frontend
npm install
npm run dev
```
