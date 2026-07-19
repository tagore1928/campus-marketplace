import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import axios from 'axios';
import { MessageSquare, Send, CheckCheck, MapPin, Eye, Info } from 'lucide-react';
import { 
  collection, 
  doc, 
  setDoc,
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { obfuscateUid, deobfuscateUid } from '../utils/obfuscate';

export const Chat: React.FC = () => {
  const { user, token, profile } = useAuth();
  const { confirm } = useDialog();
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  // Fetch all chat channels
  const fetchChatRooms = async () => {
    if (!token) return;
    setLoadingRooms(true);
    try {
      const res = await axios.get('/api/chats');
      setRooms(res.data);
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchChatRooms();
  }, [token]);

  // Fetch messages and manage real-time updates when selectedRoom changes
  useEffect(() => {
    if (!selectedRoom || !token) return;

    setLoadingMessages(true);

    const q = query(
      collection(db, 'chats', selectedRoom.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      setLoadingMessages(false);

      // Update sidebar state reactively
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        setRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.id === selectedRoom.id
              ? {
                  ...room,
                  lastMessage: lastMsg.content,
                  lastMessageAt: lastMsg.createdAt,
                }
              : room
          )
        );
      }
    }, (err) => {
      console.error('Error listening to messages:', err);
      setLoadingMessages(false);
      setSelectedRoom(null);
      setMessages([]);
      fetchChatRooms();
    });

    // Mark messages as read via HTTP API
    const markAsRead = async () => {
      try {
        await axios.get(`/api/chats/${selectedRoom.id}/messages`);
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    };
    markAsRead();

    // Mark as read locally in sidebar state
    setRooms((prevRooms) =>
      prevRooms.map((room) =>
        room.id === selectedRoom.id
          ? {
              ...room,
              unreadByBuyer: room.buyerId === obfuscateUid(user?.uid || '') ? false : room.unreadByBuyer,
              unreadBySeller: room.sellerId === obfuscateUid(user?.uid || '') ? false : room.unreadBySeller,
            }
          : room
      )
    );

    return () => {
      unsubscribe();
    };
  }, [selectedRoom?.id, token]);

  // Scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const obfuscatedUid = obfuscateUid(user.uid);
      const isBuyer = selectedRoom.buyerId === obfuscatedUid;
      const isSeller = selectedRoom.sellerId === obfuscatedUid;

      // 1. Determine if identity should be masked
      let shouldMask = false;
      if (profile?.anonymousMode) {
        const recipientObfuscatedId = isBuyer ? selectedRoom.sellerId : selectedRoom.buyerId;
        const recipientUid = deobfuscateUid(recipientObfuscatedId);
        
        try {
          const recipientDocRef = doc(db, 'users', recipientUid);
          const recipientDoc = await getDoc(recipientDocRef);
          const receiverIsAdmin = recipientDoc.exists() && recipientDoc.data()?.role === 'admin';
          shouldMask = !receiverIsAdmin;
        } catch (err) {
          console.error('Error fetching recipient profile for masking:', err);
          shouldMask = true;
        }
      }

      // 2. Prepare message document
      const messagesCollection = collection(db, 'chats', selectedRoom.id, 'messages');
      const messageDocRef = doc(messagesCollection);
      const messageData = {
        id: messageDocRef.id,
        roomId: selectedRoom.id,
        senderId: user.uid,
        senderName: shouldMask ? 'Campus User' : (profile?.name || user.email?.split('@')[0] || 'User'),
        content,
        createdAt: new Date().toISOString(),
      };

      // 3. Write message directly to Firestore
      await setDoc(messageDocRef, messageData);

      // 4. Update chat room metadata
      const chatDocRef = doc(db, 'chats', selectedRoom.id);
      await updateDoc(chatDocRef, {
        lastMessage: content,
        lastMessageAt: messageData.createdAt,
        unreadByBuyer: isSeller,
        unreadBySeller: isBuyer,
      });

      // 5. Create alert notification for recipient
      const recipientObfuscatedId = isBuyer ? selectedRoom.sellerId : selectedRoom.buyerId;
      const recipientUid = deobfuscateUid(recipientObfuscatedId);

      const notifCollection = collection(db, 'notifications');
      const notifDocRef = doc(notifCollection);
      const notificationData = {
        id: notifDocRef.id,
        userId: recipientUid,
        type: 'message',
        title: `New Message from ${shouldMask ? 'Campus User' : (profile?.name || user.email?.split('@')[0] || 'User')}`,
        content: content.length > 60 ? `${content.substring(0, 60)}...` : content,
        link: `/chat/${selectedRoom.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      await setDoc(notifDocRef, notificationData);

    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const getPartnerName = (room: any) => {
    return room.buyerId === obfuscateUid(user?.uid || '') ? room.sellerName : room.buyerName;
  };

  const handleDeleteMessage = async (messageId: string, senderId: string) => {
    if (!selectedRoom) return;
    const confirmDelete = await confirm("Are you sure you want to delete this message?", "Delete Message");
    if (!confirmDelete) return;

    try {
      if (senderId === user?.uid) {
        const messageDocRef = doc(db, 'chats', selectedRoom.id, 'messages', messageId);
        await deleteDoc(messageDocRef);
      } else if (profile?.role === 'admin' && token) {
        await axios.delete(`/api/chats/${selectedRoom.id}/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleDeleteChatRoom = async () => {
    if (!selectedRoom || !token) return;
    const confirmDelete = await confirm("Are you sure you want to delete this chat room? This will permanently erase the entire conversation thread for both users.", "Delete Chat Room");
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/chats/${selectedRoom.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedRoom(null);
      setMessages([]);
      fetchChatRooms();
    } catch (err) {
      console.error('Error deleting chat room:', err);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col fade-in overflow-hidden">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface rounded-3xl overflow-hidden shadow-xl min-h-0">
        
        {/* Left Column: Chat Channels List */}
        <div className="md:col-span-4 border-r border-light-border dark:border-dark-border flex flex-col justify-between h-full bg-slate-50/50 dark:bg-dark-surface/40 min-h-0">
          <div className="p-5 border-b border-light-border dark:border-dark-border">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg tracking-tight">Messages</h3>
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">Active Conversations</p>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-light-border dark:divide-dark-border h-[calc(100vh-220px)]">
            {loadingRooms ? (
              <div className="flex flex-col gap-2 p-3 text-left">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3.5 p-3.5 items-center">
                    <div className="skeleton-box w-10 h-10 rounded-xl shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between">
                        <div className="skeleton-box w-1/3 h-3 rounded" />
                        <div className="skeleton-box w-10 h-2 rounded" />
                      </div>
                      <div className="skeleton-box w-1/2 h-2.5 rounded" />
                      <div className="skeleton-box w-2/3 h-2.5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-355 mx-auto mb-2" />
                <p className="text-xs font-bold">No chats active yet.</p>
                <p className="text-[10px] leading-relaxed mt-0.5">Browse the feed and message a seller to start.</p>
              </div>
            ) : (
              rooms.map((room) => {
                const partnerName = getPartnerName(room);
                const isSelected = selectedRoom?.id === room.id;
                const isUnread = room.buyerId === obfuscateUid(user?.uid || '') ? room.unreadByBuyer : room.unreadBySeller;

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-4 flex gap-3.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-100 dark:bg-slate-800/80 border-l-4 border-brand-600' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-605 dark:text-brand-400 flex items-center justify-center font-bold text-lg uppercase shadow-sm shrink-0 self-center">
                      {partnerName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className={`text-xs font-extrabold truncate ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {partnerName}
                        </h4>
                        <span className="text-[9px] text-slate-404 font-medium whitespace-nowrap">
                          {new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 truncate mb-1">
                        Re: {room.listingTitle}
                      </p>
                      <p className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-455 dark:text-slate-455'}`}>
                        {room.lastMessage}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-600 self-center shrink-0 shadow-sm shadow-brand-600/30" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat pane */}
        <div className="md:col-span-8 flex flex-col justify-between h-full bg-white dark:bg-dark-surface min-h-0">
          {selectedRoom ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-slate-50/20 dark:bg-dark-surface/40 shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const peerUid = deobfuscateUid(selectedRoom.buyerId === obfuscateUid(user?.uid || '') ? selectedRoom.sellerId : selectedRoom.buyerId);
                      navigate(`/profile/${peerUid}`);
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 hover:scale-105 transition-transform"
                  >
                    {selectedRoom.listingImage ? (
                      <img src={selectedRoom.listingImage} alt={selectedRoom.listingTitle} className="w-full h-full object-cover" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <div className="text-left">
                    <button
                      onClick={() => {
                        const peerUid = deobfuscateUid(selectedRoom.buyerId === obfuscateUid(user?.uid || '') ? selectedRoom.sellerId : selectedRoom.buyerId);
                        navigate(`/profile/${peerUid}`);
                      }}
                      className="text-sm font-extrabold text-slate-900 dark:text-slate-100 hover:text-brand-600 transition-colors text-left"
                    >
                      {getPartnerName(selectedRoom)}
                    </button>
                    <p className="text-[10px] font-semibold text-slate-400 leading-none flex items-center gap-1.5 mt-1">
                      <span>Re: {selectedRoom.listingTitle}</span>
                      {selectedRoom.sellerEmail && selectedRoom.buyerId === obfuscateUid(user?.uid || '') && (
                        <>
                          <span className="text-slate-350">•</span>
                          <span className="text-brand-505 font-bold flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> Identity Unmasked
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Info Card Popover & Delete Chat Room Button */}
                <div className="flex items-center gap-3">
                  {selectedRoom.sellerEmail && selectedRoom.buyerId === obfuscateUid(user?.uid || '') && (
                    <div className="relative group">
                      <Info className="w-5 h-5 text-slate-455 hover:text-slate-600 dark:hover:text-slate-200 cursor-help" />
                      <div className="absolute right-0 top-6 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl border border-white/10 hidden group-hover:block z-55 leading-relaxed font-semibold">
                        Seller details unmasked: {selectedRoom.sellerName} ({selectedRoom.sellerEmail})
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleDeleteChatRoom}
                    className="px-3.5 py-2 bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl font-extrabold text-xs cursor-pointer border border-rose-100/50 dark:border-rose-950 transition-all shadow-sm"
                  >
                    Delete Chat Room
                  </button>
                </div>
              </div>

              {/* Messages list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 h-[calc(100vh-280px)] min-h-[300px]">
                {loadingMessages ? (
                  <div className="flex flex-col gap-4 p-2 text-left">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'items-end' : 'items-start'} gap-2`}>
                        <div className="skeleton-box w-1/3 h-8 rounded-2xl" />
                        <div className="skeleton-box w-12 h-2.5 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.senderId === user?.uid;
                    const isAdmin = profile?.role === 'admin';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group relative`} data-testid="chat-message-item">
                        <div className="flex items-center gap-2">
                          {(isOwn || isAdmin) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id, msg.senderId)}
                              className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer shadow-sm text-[9px] font-extrabold border border-light-border dark:border-dark-border"
                              title="Delete Message"
                            >
                              ✕ Delete
                            </button>
                          )}
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isOwn
                              ? 'bg-brand-600 text-white rounded-tr-none font-bold text-right'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none font-semibold text-left'
                          }`}>
                            <p>{msg.content}</p>
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-light-border dark:border-dark-border bg-slate-50/20 dark:bg-dark-surface/40 flex gap-2">
                <input
                  type="text"
                  placeholder="Type message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs font-semibold shadow-inner"
                />
                <button
                  type="submit"
                  className="px-4.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-500/10 cursor-pointer flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h4 className="font-extrabold text-slate-800 dark:text-slate-250 mb-1">No Chat Active</h4>
              <p className="text-xs max-w-xs text-center font-medium leading-relaxed">
                Select a message thread from the sidebar panel to view conversation logs and chat in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
