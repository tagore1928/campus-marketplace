/**
 * Campus Market - Firestore Database Document Schemas
 * This file outlines the structural definitions and types for all Firestore collections on the client.
 */

// Colleges Collection
export interface CollegeDocument {
  id: string;            // Document ID
  name: string;          // Name of the college (e.g., "IIT Bombay")
  domain: string;        // College email domain (e.g., "iitb.ac.in" or "edu.in")
  allowCustom?: boolean; // Manual configuration toggle
  createdAt: string;     // ISO timestamp
}

// Users Collection
export interface UserDocument {
  uid: string;           // Firebase Auth User UID
  email: string;         // Logged in email address (must end with .edu.in or be admin)
  name: string;          // Full display name
  college: string;       // Chosen college name
  isCustomCollege: boolean; // Flag if college entered manually
  role: 'student' | 'admin'; // Authorization roles
  thumbsUp: number;      // Aggregated positive rating count
  thumbsDown: number;    // Aggregated negative rating count
  anonymousMode: boolean; // Privacy configuration toggle
  createdAt: string;     // ISO timestamp
  updatedAt: string;     // ISO timestamp
}

// Listings Collection (matching posts in db)
export interface ListingDocument {
  id: string;            // Document ID
  title: string;         // Product title
  description: string;   // Markdown description
  price: number;         // Numeric listing price (0 if free)
  type: 'selling' | 'free'; // Listing transaction condition type
  category: string;      // Product category (e.g. "Textbooks", "Electronics")
  college: string;       // Associated campus location
  images: string[];      // Compressed Cloudinary image URLs
  creatorId: string;     // Author user UID
  creatorName: string;   // Author name
  creatorEmail: string;  // Author email
  anonymous: boolean;    // Flag to mask author's name
  status: 'active' | 'sold' | 'taken' | 'expired'; // Status constraints
  reportsCount: number;  // Moderation flag counter
  reportedBy: string[];  // User UIDs that reported this listing
  createdAt: string;     // ISO creation date
  expiresAt: string;     // Auto-expiry target ISO date
  updatedAt?: string;    // Last modification ISO date
}

// Messages Collection
export interface MessageDocument {
  id: string;            // Document ID
  roomId: string;        // Associated Chat Room ID
  senderId: string;      // User UID of the author
  content: string;       // Text payload
  createdAt: string;     // ISO creation timestamp
}

// Chat Rooms Collection (Metadata parent of messages)
export interface ChatRoomDocument {
  id: string;            // Document ID
  postId: string;        // Associated listing ID
  listingTitle: string;  // Listing title snapshot
  listingImage?: string; // Listing first image thumbnail
  buyerId: string;       // Participant 1 User UID
  buyerName: string;     // Participant 1 Name snapshot
  sellerId: string;      // Participant 2 User UID
  sellerName: string;    // Participant 2 Name snapshot
  sellerEmail: string;   // Participant 2 Email (unmasked after transaction/context)
  lastMessage: string;   // Last message content snippet
  lastMessageAt: string; // Last message creation ISO timestamp
  unreadByBuyer: boolean; // Notification flags
  unreadBySeller: boolean; // Notification flags
  createdAt: string;     // Room setup ISO date
}

// Notifications Collection
export interface NotificationDocument {
  id: string;            // Document ID
  userId: string;        // Target recipient user UID
  type: 'message' | 'product' | 'review' | 'report'; // Notification type
  title: string;         // Alert title
  content: string;       // Alert text description
  link: string;          // Target client redirection link
  read: boolean;         // Read state flag
  createdAt: string;     // ISO timestamp
}

// Reports Collection
export interface ReportDocument {
  id: string;            // Document ID
  postId: string;        // Target flagged listing ID
  postTitle: string;     // Flagged listing title snapshot
  reporterId: string;    // Reporting user UID
  reporterEmail: string; // Reporting user email address
  sellerId: string;      // Creator/Seller UID of the flagged product
  reason: string;        // Detailed reasoning string for administrative moderation
  createdAt: string;     // ISO timestamp
  status: 'pending' | 'resolved'; // Review status
}

// Reviews Collection
export interface ReviewDocument {
  id: string;            // Document ID
  sellerId: string;      // User UID of reviewed seller
  buyerId: string;       // User UID of reviewer buyer
  buyerName: string;     // Reviewer name snapshot
  thumbsUp: boolean;     // Binary review metric (true = up, false = down)
  content: string;       // Review comment string
  createdAt: string;     // ISO timestamp
  updatedAt: string;     // ISO timestamp
}

// Saved Listings (savedProducts sub-collection under user doc)
export interface SavedListingDocument {
  listingId: string;     // ID of the bookmarked listing
  savedAt: string;       // ISO timestamp when saved
}
