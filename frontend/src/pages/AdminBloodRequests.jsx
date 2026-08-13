import React, { useEffect, useState } from 'react';
import { Droplet, Send, Clock, Users, MapPin, Phone, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import AdminSidebarLayout from '../components/AdminSidebarLayout';
import {
  createBloodRequest,
  listBloodRequests,
  getBloodRequestResponders,
  updateBloodRequestStatus
} from '../utils/bloodRequestApi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const URGENCY_STYLES = {
  LOW: 'bg-white/10 border-white/20 text-white/70',
  MEDIUM: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  HIGH: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  CRITICAL: 'bg-red-500/20 border-red-500/50 text-red-300'
};

const STATUS_STYLES = {
  ACTIVE: 'bg-green-500/20 border-green-500/50 text-green-300',
  FULFILLED: 'bg-white/10 border-white/20 text-white/70',
  CANCELLED: 'bg-red-500/20 border-red-500/50 text-red-300'
};

const initialForm = {
  bloodGroup: 'A+',
  unitsRequired: 1,
  urgency: 'MEDIUM',
  location: '',
  description: '',
  contactName: '',
  contactPhone: '',
  contactEmail: ''
};

// Reuses the Notification model for donor broadcast (same pattern as
// AdminAnnouncements) and the exact donationAvailability+bloodGroup
// matching filter as adminController.listBloodDonors — this page just adds
// the "create a request" and "manage its lifecycle" UI on top of that.
export default function AdminBloodRequests() {
  const [form, setForm] = useState(initialForm);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [responders, setResponders] = useState({});
  const [respondersLoading, setRespondersLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await listBloodRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const submit = async () => {
    setFormError('');
    if (!form.location.trim() || !form.contactName.trim() || !form.contactPhone.trim()) {
      setFormError('Location, contact name and contact phone are required.');
      return;
    }
    try {
      setSending(true);
      const data = await createBloodRequest({
        ...form,
        unitsRequired: Number(form.unitsRequired)
      });
      setNotice(data.message);
      setTimeout(() => setNotice(''), 5000);
      setForm(initialForm);
      fetchRequests();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  };

  const toggleResponders = async (requestId) => {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);
    if (!responders[requestId]) {
      try {
        setRespondersLoading(true);
        const data = await getBloodRequestResponders(requestId);
        setResponders((prev) => ({ ...prev, [requestId]: data }));
      } catch (err) {
        setResponders((prev) => ({ ...prev, [requestId]: { error: err.message } }));
      } finally {
        setRespondersLoading(false);
      }
    }
  };

  const changeStatus = async (requestId, status) => {
    try {
      setUpdatingId(requestId);
      await updateBloodRequestStatus(requestId, status);
      fetchRequests();
    } catch (err) {
      alert(`Failed to update request.\n\nError: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminSidebarLayout title="Blood Requests">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Droplet className="text-red-400" size={20} />
            <h2 className="text-lg font-bold text-white">New Blood Request</h2>
          </div>
          <p className="text-white/50 text-sm mb-4">
            Matching donors (available to donate, same blood group) are notified immediately via the existing notification system.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Blood Group</label>
                <select
                  value={form.bloodGroup}
                  onChange={handleChange('bloodGroup')}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400 cursor-pointer"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg} className="bg-gray-900">{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Units Required</label>
                <input
                  type="number"
                  min="1"
                  value={form.unitsRequired}
                  onChange={handleChange('unitsRequired')}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Urgency</label>
              <select
                value={form.urgency}
                onChange={handleChange('urgency')}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400 cursor-pointer"
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u} className="bg-gray-900">{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Campus / Location</label>
              <input
                type="text"
                value={form.location}
                onChange={handleChange('location')}
                placeholder="e.g. KMCH, Erode"
                className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Description</label>
              <textarea
                value={form.description}
                onChange={handleChange('description')}
                placeholder="Any extra context for donors..."
                className="w-full h-20 p-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Contact Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={handleChange('contactName')}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Contact Phone</label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={handleChange('contactPhone')}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Contact Email (optional)</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={handleChange('contactEmail')}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {notice && <p className="mt-4 text-green-400 text-sm">{notice}</p>}
          {formError && <p className="mt-4 text-red-400 text-sm">{formError}</p>}

          <button
            onClick={submit}
            disabled={sending}
            className="w-full mt-6 flex items-center justify-center gap-2 p-3 text-lg font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
          >
            <Send size={18} /> {sending ? 'Sending...' : 'Send Request'}
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Requests</h2>
          {listError && <p className="text-red-400 text-sm mb-3">{listError}</p>}
          {loading ? (
            <p className="text-white/50 text-sm">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No blood requests sent yet.</p>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto">
              {requests.map((r) => (
                <div key={r._id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 border border-red-500/40 bg-red-500/10 text-red-300 text-xs font-bold rounded-full">{r.bloodGroup}</span>
                      <span className="text-white font-semibold">{r.unitsRequired} unit{r.unitsRequired === 1 ? '' : 's'}</span>
                      <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${URGENCY_STYLES[r.urgency]}`}>{r.urgency}</span>
                      <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mt-2 flex items-center gap-1"><MapPin size={12} /> {r.location}</p>
                  {r.description && <p className="text-white/50 text-xs mt-1">{r.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-white/40 text-xs mt-2">
                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(r.createdAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {r.notifiedCount} notified</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => toggleResponders(r._id)}
                      className="flex items-center gap-1 text-sm text-yellow-400 hover:underline font-medium"
                    >
                      {r.responderCount} donor{r.responderCount === 1 ? '' : 's'} responded
                      {expandedId === r._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {r.canManage && r.status === 'ACTIVE' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => changeStatus(r._id, 'FULFILLED')}
                          disabled={updatingId === r._id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white transition disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> Fulfilled
                        </button>
                        <button
                          onClick={() => changeStatus(r._id, 'CANCELLED')}
                          disabled={updatingId === r._id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white transition disabled:opacity-50"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {expandedId === r._id && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      {respondersLoading && !responders[r._id] ? (
                        <p className="text-white/40 text-xs">Loading responders...</p>
                      ) : responders[r._id]?.error ? (
                        <p className="text-red-400 text-xs">{responders[r._id].error}</p>
                      ) : (responders[r._id] || []).length === 0 ? (
                        <p className="text-white/40 text-xs">No responses yet.</p>
                      ) : (
                        (responders[r._id] || []).map((donor) => (
                          <div key={donor._id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-xs">
                            <div>
                              <span className="text-white font-semibold">{donor.username}</span>
                              <span className="text-white/40 ml-2">{donor.department} &middot; {donor.year}</span>
                            </div>
                            <span className="flex items-center gap-1 text-white/70"><Phone size={11} /> {donor.phone}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminSidebarLayout>
  );
}
