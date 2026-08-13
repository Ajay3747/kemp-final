import React, { useEffect, useState } from "react";
import { Megaphone, Send, Clock, Users } from "lucide-react";
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

  useEffect(() => { fetchHistory(); }, []);

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
    </AdminSidebarLayout>
  );
}
