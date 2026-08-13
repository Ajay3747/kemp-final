import React, { useEffect, useState } from "react";
import { Flag, X, CheckCircle2, XCircle, UserX, Trash2, Clock } from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import { adminFetch } from "../utils/adminApi";

const STATUS_STYLES = {
  OPEN: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  RESOLVED: 'bg-green-500/20 border-green-500/50 text-green-300',
  DISMISSED: 'bg-white/10 border-white/20 text-white/60'
};

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchReports(); }, [statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");
      const params = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const data = await adminFetch(`/reports${params}`);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const openDetail = (report) => { setSelected(report); setNote(''); };

  const resolve = async (dismiss = false) => {
    try {
      setBusy(true);
      const data = await adminFetch(`/reports/${selected._id}/${dismiss ? 'dismiss' : 'resolve'}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolutionNote: note })
      });
      setReports((prev) => prev.map((r) => (r._id === data.report._id ? data.report : r)));
      setSelected(null);
      flash(dismiss ? 'Report dismissed.' : 'Report resolved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const suspendUser = async () => {
    if (!selected?.reportedUserId?._id) return;
    if (!window.confirm(`Suspend ${selected.reportedUsername}?`)) return;
    try {
      setBusy(true);
      await adminFetch(`/users/${selected.reportedUserId._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false })
      });
      flash('User suspended.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeReportedListing = async () => {
    if (!selected?.reportedProductId?._id) return;
    if (!window.confirm('Remove this listing from the marketplace?')) return;
    try {
      setBusy(true);
      await adminFetch(`/products/${selected.reportedProductId._id}/remove`, { method: 'PATCH' });
      flash('Listing removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminSidebarLayout title="Reports & Complaints">
      <div className="flex gap-3 mb-6 flex-wrap">
        {['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              statusFilter === s ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {notice && <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-sm">{notice}</div>}
      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-white/60">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <Flag className="mx-auto mb-4 text-white/20" size={48} />
          <p className="text-white/40">No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <button
              key={report._id}
              onClick={() => openDetail(report)}
              className="w-full text-left bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-white">{report.reportedUsername}</h3>
                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${STATUS_STYLES[report.status]}`}>{report.status}</span>
                    {report.reason && (
                      <span className="px-2 py-0.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-[10px] font-bold rounded-full">{report.reason}</span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm truncate">{report.reportText}</p>
                  <p className="text-white/40 text-xs mt-1 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(report.reportedAt).toLocaleString()}</span>
                    {report.reporterId?.username && <span>· Reported by {report.reporterId.username}</span>}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-white/20 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={22} />
            </button>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-2xl font-bold text-yellow-400">{selected.reportedUsername}</h2>
              <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
              {selected.reason && (
                <span className="px-2 py-0.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-[10px] font-bold rounded-full">{selected.reason}</span>
              )}
            </div>
            <p className="text-white/40 text-xs mb-4">
              {new Date(selected.reportedAt).toLocaleString()}
              {selected.reporterId?.username && ` · Reported by ${selected.reporterId.username} (${selected.reporterId.collegeEmail || 'no email'})`}
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <p className="text-white/50 text-xs mb-1">Report details</p>
              <p className="text-white text-sm">{selected.reportText}</p>
            </div>

            {selected.reportedProductId?._id && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                <p className="text-white/50 text-xs mb-1">Related listing</p>
                <p className="text-white text-sm">{selected.reportedProductId.title}</p>
              </div>
            )}

            {selected.evidence?.length > 0 && (
              <div className="mb-4">
                <p className="text-white/50 text-xs mb-2">Evidence ({selected.evidence.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {selected.evidence.map((src, idx) => (
                    <a key={idx} href={src} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-white/10 aspect-square">
                      <img src={src} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <InfoChip label="Email" value={selected.reportedEmail} />
              <InfoChip label="Department" value={selected.reportedDepartment} />
              <InfoChip label="Roll No" value={selected.reportedRollNo} />
              <InfoChip label="Phone" value={selected.reportedPhone} />
            </div>

            {selected.status === 'OPEN' ? (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Resolution note (optional)..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 resize-none mb-4 text-sm"
                />

                <div className="flex gap-2 mb-3">
                  {selected.reportedUserId?._id && (
                    <button onClick={suspendUser} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-sm font-semibold transition disabled:opacity-50">
                      <UserX size={14} /> Suspend User
                    </button>
                  )}
                  {selected.reportedProductId?._id && (
                    <button onClick={removeReportedListing} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-sm font-semibold transition disabled:opacity-50">
                      <Trash2 size={14} /> Remove Listing
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => resolve(true)} disabled={busy} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition disabled:opacity-50">
                    <XCircle size={16} /> Dismiss
                  </button>
                  <button onClick={() => resolve(false)} disabled={busy} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition disabled:opacity-50">
                    <CheckCircle2 size={16} /> Resolve
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white/50 text-xs mb-1">Resolution</p>
                <p className="text-white text-sm">{selected.resolutionNote || 'No note added.'}</p>
                {selected.resolvedBy?.username && (
                  <p className="text-white/40 text-xs mt-2">By {selected.resolvedBy.username} on {new Date(selected.resolvedAt).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
      <p className="text-white/40 text-[11px]">{label}</p>
      <p className="text-white truncate">{value || 'N/A'}</p>
    </div>
  );
}
