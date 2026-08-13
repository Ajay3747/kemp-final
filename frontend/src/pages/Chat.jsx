import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, UserCircle2, Package } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/chat';
const POLL_INTERVAL_MS = 5000;

export default function Chat() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    }
  };

  const fetchMessages = async (id) => {
    try {
      const res = await fetch(`${API_URL}/conversations/${id}/messages`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (!userId || !token) {
      navigate('/');
      return;
    }
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userId || !token) return;
    const interval = setInterval(fetchConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    fetchMessages(conversationId);
    const interval = setInterval(() => fetchMessages(conversationId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !conversationId) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ text: messageText })
      });
      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setMessageText('');
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((c) => c._id === conversationId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 mb-4">
            <MessageCircle size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300 tracking-wide uppercase">Private Chat</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Messages</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden min-h-[500px]">
          {/* Conversation list */}
          <div className={`md:col-span-1 border-r border-white/10 max-h-[600px] overflow-y-auto ${conversationId ? 'hidden md:block' : ''}`}>
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                No conversations yet. Start one from a product's "Chat with Seller" button.
              </div>
            ) : (
              conversations.map((c) => {
                const other = c.otherParty;
                const active = c._id === conversationId;
                return (
                  <button
                    key={c._id}
                    onClick={() => navigate(`/chat/${c._id}`)}
                    className={`w-full text-left flex items-center gap-3 p-4 border-b border-white/5 transition-colors ${
                      active ? 'bg-yellow-400/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-black">
                      <UserCircle2 size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-semibold text-sm truncate">{other?.username || 'User'}</span>
                        {c.unreadCount > 0 && (
                          <span className="bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      {c.productTitle && (
                        <span className="text-yellow-300/80 text-xs flex items-center gap-1 truncate">
                          <Package size={11} /> {c.productTitle}
                        </span>
                      )}
                      <p className="text-gray-500 text-xs truncate mt-0.5">{c.lastMessageText || 'No messages yet'}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Active thread */}
          <div className={`md:col-span-2 flex flex-col ${!conversationId ? 'hidden md:flex' : ''}`}>
            {!conversationId ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8 text-center">
                Select a conversation to view messages.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 border-b border-white/10">
                  <button
                    onClick={() => navigate('/chat')}
                    className="md:hidden p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-black flex-shrink-0">
                    <UserCircle2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">
                      {activeConversation?.otherParty?.username || 'User'}
                    </h3>
                    {activeConversation?.productTitle && (
                      <span className="text-yellow-300/80 text-xs truncate">{activeConversation.productTitle}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[440px]">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No messages yet. Say hello!</p>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.senderId === userId || m.senderId?._id === userId;
                      return (
                        <div key={m._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMine
                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black'
                                : 'bg-white/10 text-gray-100 border border-white/10'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            <span className={`block text-[10px] mt-1 ${isMine ? 'text-black/60' : 'text-gray-400'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex gap-2 p-4 border-t border-white/10">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="premium-input flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 focus:outline-none placeholder-gray-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                    className="premium-btn bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
