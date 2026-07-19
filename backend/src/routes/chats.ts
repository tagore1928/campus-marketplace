import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { obfuscateUid, deobfuscateUid } from '../utils/obfuscate';

const router = Router();

const applyChatMask = async (room: any, currentUser: { uid: string; role: string }) => {
  const result = { ...room };

  const [buyerDoc, sellerDoc] = await Promise.all([
    db.collection('users').doc(room.buyerId).get(),
    db.collection('users').doc(room.sellerId).get()
  ]);

  if (buyerDoc.exists) {
    const buyerData = buyerDoc.data()!;
    if (buyerData.anonymousMode && room.buyerId !== currentUser.uid) {
      result.buyerName = 'Campus User';
      if (result.buyerEmail) result.buyerEmail = 'hidden-profile@campusmarket.edu.in';
    }
  }

  if (sellerDoc.exists) {
    const sellerData = sellerDoc.data()!;
    if (sellerData.anonymousMode && room.sellerId !== currentUser.uid) {
      result.sellerName = 'Campus User';
      if (result.sellerEmail) result.sellerEmail = 'hidden-profile@campusmarket.edu.in';
    }
  }

  if (result.buyerId) result.buyerId = obfuscateUid(result.buyerId);
  if (result.sellerId) result.sellerId = obfuscateUid(result.sellerId);

  return result;
};

// Create or retrieve a persistent user-to-user chat thread (P2P)
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  const currentUser = req.user!;
  const { listingId, peerId: inputPeerId } = req.body;

  let peerId = inputPeerId ? deobfuscateUid(inputPeerId) : undefined;
  let listingTitle = 'Direct Conversation';
  let listingImage = '';

  try {
    // 1. Resolve peerId if listingId is provided
    if (listingId) {
      let postDoc = await db.collection('posts').doc(listingId).get();
      let isSocial = false;
      let post: any;

      if (postDoc.exists) {
        post = postDoc.data()!;
      } else {
        // Try fetching from social_posts
        const socialDoc = await db.collection('social_posts').doc(listingId).get();
        if (socialDoc.exists) {
          post = socialDoc.data()!;
          isSocial = true;
        }
      }

      if (post) {
        peerId = post.creatorId;
        listingTitle = isSocial ? (post.content.length > 35 ? post.content.substring(0, 35) + '...' : post.content) : post.title;
        listingImage = post.images && post.images.length > 0 ? post.images[0] : '';
      }
    }

    if (!peerId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing peerId or listingId.' });
    }

    if (peerId === currentUser.uid) {
      return res.status(400).json({ error: 'Bad Request', message: 'You cannot start a chat thread with yourself.' });
    }

    // 2. Fetch both users to get their latest names/emails (handling anonymous modes)
    const peerDoc = await db.collection('users').doc(peerId).get();
    if (!peerDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Peer user profile not found.' });
    }
    const peerData = peerDoc.data()!;

    // 3. Unique room identifier: sorted alphabetically p2p_uid1_uid2
    const [uid1, uid2] = [currentUser.uid, peerId].sort();
    const roomId = `p2p_${uid1}_${uid2}`;
    const chatRef = db.collection('chats').doc(roomId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      // Setup buyer/seller designations based on uid1 and uid2 sorting
      const isCurrentUserUid1 = currentUser.uid === uid1;
      
      const newChatRoom = {
        id: roomId,
        listingId: listingId || '',
        listingTitle,
        listingImage,
        buyerId: uid1,
        buyerName: isCurrentUserUid1 
          ? (currentUser.name || currentUser.email?.split('@')[0] || 'User')
          : (peerData.name || 'User'),
        sellerId: uid2,
        sellerName: isCurrentUserUid1
          ? (peerData.name || 'User')
          : (currentUser.name || currentUser.email?.split('@')[0] || 'User'),
        sellerEmail: isCurrentUserUid1 ? (peerData.email || '') : (currentUser.email || ''),
        lastMessage: 'Chat started.',
        lastMessageAt: new Date().toISOString(),
        unreadByBuyer: false,
        unreadBySeller: false,
        createdAt: new Date().toISOString(),
      };

      await chatRef.set(newChatRoom);
      const maskedRoom = await applyChatMask(newChatRoom, currentUser);
      return res.status(201).json(maskedRoom);
    }

    // Return existing chat room
    const maskedRoom = await applyChatMask(chatDoc.data(), currentUser);
    return res.status(200).json(maskedRoom);

  } catch (error) {
    console.error('Error creating chat thread:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to initialize chat thread.' });
  }
});

// Get all active chat threads for the logged-in user
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  try {
    const chatsRef = db.collection('chats');
    const list: any[] = [];

    // Query chats where user is buyer
    const buyerSnapshot = await chatsRef.where('buyerId', '==', user.uid).get();
    buyerSnapshot.forEach((doc) => list.push(doc.data()));

    // Query chats where user is seller
    const sellerSnapshot = await chatsRef.where('sellerId', '==', user.uid).get();
    sellerSnapshot.forEach((doc) => list.push(doc.data()));

    // Sort by last message date descending
    list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const maskedList = await Promise.all(list.map(room => applyChatMask(room, user)));
    return res.status(200).json(maskedList);
  } catch (error) {
    console.error('Error retrieving chats list:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch chats list.' });
  }
});

// Get message history for a specific chat room (only if user is a participant)
router.get('/:roomId/messages', verifyToken, async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;
  const user = req.user!;

  try {
    const chatRef = db.collection('chats').doc(roomId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Chat room not found.' });
    }

    const chat = chatDoc.data()!;
    if (chat.buyerId !== user.uid && chat.sellerId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to access this chat history.' });
    }

    // Fetch messages in sub-collection
    const messagesSnapshot = await chatRef.collection('messages').orderBy('createdAt', 'asc').get();
    const messages: any[] = [];
    messagesSnapshot.forEach((doc) => messages.push(doc.data()));

    // Mark notifications/unread indicators as read
    if (chat.buyerId === user.uid && chat.unreadByBuyer) {
      await chatRef.update({ unreadByBuyer: false });
    } else if (chat.sellerId === user.uid && chat.unreadBySeller) {
      await chatRef.update({ unreadBySeller: false });
    }

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve messages.' });
  }
});

// Delete a specific message in a chat room
router.delete('/:roomId/messages/:messageId', verifyToken, async (req: AuthRequest, res: Response) => {
  const { roomId, messageId } = req.params;
  const user = req.user!;

  try {
    const chatRef = db.collection('chats').doc(roomId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Chat room not found.' });
    }

    const chat = chatDoc.data()!;
    if (chat.buyerId !== user.uid && chat.sellerId !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized access to this chat room.' });
    }

    const messageRef = chatRef.collection('messages').doc(messageId);
    const messageDoc = await messageRef.get();
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Message not found.' });
    }

    const msgData = messageDoc.data()!;
    if (msgData.senderId !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own messages.' });
    }

    await messageRef.delete();

    return res.status(200).json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete message.' });
  }
});

// Delete a chat room and all messages inside it
router.delete('/:roomId', verifyToken, async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;
  const user = req.user!;

  try {
    const chatRef = db.collection('chats').doc(roomId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Chat room not found.' });
    }

    const chat = chatDoc.data()!;
    if (chat.buyerId !== user.uid && chat.sellerId !== user.uid && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized to delete this chat room.' });
    }

    // Delete all messages sub-collection documents
    const messagesSnapshot = await chatRef.collection('messages').get();
    const batch = db.batch();
    messagesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the chat room document
    await chatRef.delete();

    return res.status(200).json({ success: true, message: 'Chat room deleted successfully.' });
  } catch (error) {
    console.error('Error deleting chat room:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete chat room.' });
  }
});

export default router;
