import React, { useEffect, useState } from "react";
import { Megaphone, Send, Clock, Users, Pin, PinOff } from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import { adminFetch } from "../utils/adminApi";

export default function AdminAnnouncements() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Pinned Community notice — a separate mechanism from the broadcast
  // above: this posts straight into the Community board (pinned to top)
  // instead of pushing a Notification to every student.
  const [pinned, setPinned] = useState([]);
  const [pinnedLoading, setPinnedLoading] = useState(true);
  const [pinError, setPinError] = useState("");
  const [pinNotice, setPinNotice] = useState("");
  const [pinTitle, setPinTitle] = useState("");
  const [pinContent, setPinContent] = useState("");
  const [pinning, setPinning] = useState(false);
  const [unpinningId, setUnpinningId] = useState(null);

  useEffect(() => { fetchHistory(); fetchPinned(); }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await adminFetch('/announcements');
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    setError("");
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }
    try {
      setSending(true);
      const data = await adminFetch('/announcements', { method: 'POST', body: JSON.stringify({ title, message }) });
      setNotice(`Announcement sent to ${data.recipientCount} student${data.recipientCount === 1 ? '' : 's'}.`);
      setTimeout(() => setNotice(""), 4000);
      setTitle("");
      setMessage("");
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const fetchPinned = async () => {
    try {
      setPinnedLoading(true);
      const data = await adminFetch('/pinned-posts');
      setPinned(Array.isArray(data) ? data : []);
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinnedLoading(false);
    }
  };

  const pinToCommunity = async () => {
    setPinError("");
    if (!pinTitle.trim()) {
      setPinError('Title is required.');
      return;
    }
    try {
      setPinning(true);
      await adminFetch('/pinned-posts', { method: 'POST', body: JSON.stringify({ title: pinTitle, content: pinContent }) });
      setPinNotice('Pinned to the Community board.');
      setTimeout(() => setPinNotice(""), 4000);
      setPinTitle("");
      setPinContent("");
      fetchPinned();
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinning(false);
    }
  };

  const unpin = async (id) => {
    setPinError("");
    try {
      setUnpinningId(id);
      await adminFetch(`/pinned-posts/${id}`, { method: 'DELETE' });
      setPinned((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setPinError(err.message);
    } finally {
      setUnpinningId(null);
    }
  };

  return (
    <AdminSidebarLayout title="Announcements">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="text-yellow-400" size={20} />
            <h2 className="text-lg font-bold text-white">Compose Announcement</h2>
          </div>
          <p className="text-white/50 text-sm mb-4">Delivered via the existing notification system to every active student.</p>

          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Marketplace maintenance tonight"
                className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the announcement..."
                className="w-full h-32 p-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </div>

          {notice && <p className="mt-4 text-green-400 text-sm">{notice}</p>}
          {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

          <button
            onClick={send}
            disabled={sending}
            className="w-full mt-6 flex items-center justify-center gap-2 p-3 text-lg font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
          >
            <Send size={18} /> {sending ? 'Sending...' : 'Send Announcement'}
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Sent History</h2>
          {loading ? (
            <p className="text-white/50 text-sm">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No announcements sent yet.</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {history.map((a) => (
                <div key={a._id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-300">{a.title}</h3>
                  <p className="text-white/70 text-sm mt-1">{a.message}</p>
                  <div className="flex items-center gap-4 text-white/40 text-xs mt-2">
                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(a.createdAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {a.recipientCount} recipients</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Pin className="text-yellow-400" size={20} />
            <h2 className="text-lg font-bold text-white">Pin a Notice to Community Board</h2>
          </div>
          <p className="text-white/50 text-sm mb-4">Posted directly to the Community feed, pinned to the top. No notifications are sent — this is separate from the broadcast above.</p>

          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Title</label>
              <input
                type="text"
                value={pinTitle}
                onChange={(e) => setPinTitle(e.target.value)}
                placeholder="e.g. Campus fest this weekend"
                className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Details (optional)</label>
              <textarea
                value={pinContent}
                onChange={(e) => setPinContent(e.target.value)}
                placeholder="Add details..."
                className="w-full h-24 p-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </div>

          {pinNotice && <p className="mt-4 text-green-400 text-sm">{pinNotice}</p>}
          {pinError && <p className="mt-4 text-red-400 text-sm">{pinError}</p>}

          <button
            onClick={pinToCommunity}
            disabled={pinning}
            className="w-full mt-6 flex items-center justify-center gap-2 p-3 text-lg font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
          >
            <Pin size={18} /> {pinning ? 'Pinning...' : 'Pin to Community Board'}
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Currently Pinned</h2>
          {pinnedLoading ? (
            <p className="text-white/50 text-sm">Loading...</p>
          ) : pinned.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No pinned notices right now.</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {pinned.map((p) => (
                <div key={p._id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-yellow-300">{p.title}</h3>
                    <button
                      onClick={() => unpin(p._id)}
                      disabled={unpinningId === p._id}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-white/50 hover:text-red-400 transition disabled:opacity-50"
                    >
                      <PinOff size={13} /> {unpinningId === p._id ? 'Unpinning...' : 'Unpin'}
                    </button>
                  </div>
                  {p.content && <p className="text-white/70 text-sm mt-1">{p.content}</p>}
                  <span className="flex items-center gap-1 text-white/40 text-xs mt-2">
                    <Clock size={11} /> {new Date(p.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminSidebarLayout>
  );
}
