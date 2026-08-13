import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Droplet, MapPin, Phone, Mail, User, Clock, HeartHandshake, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import {
  getBloodRequest,
  getBloodRequestResponders,
  respondToBloodRequest,
  updateBloodRequestStatus
} from '../utils/bloodRequestApi';

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

// Donor-facing view — reached by tapping a "blood_request" notification.
// Shows the contact info a donor needs (that's the point of the request)
// but never the identities of other responding donors unless the viewer is
// the request's creator or an admin/staff member (canManage, server-computed).
export default function BloodRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [responders, setResponders] = useState(null);
  const [respondersLoading, setRespondersLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const data = await getBloodRequest(id);
      setRequest(data);
      if (data.canManage) {
        fetchResponders();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponders = async () => {
    try {
      setRespondersLoading(true);
      const data = await getBloodRequestResponders(id);
      setResponders(data);
    } catch (err) {
      setResponders([]);
    } finally {
      setRespondersLoading(false);
    }
  };

  const handleRespond = async () => {
    try {
      setResponding(true);
      await respondToBloodRequest(id);
      setRequest((prev) => ({ ...prev, hasResponded: true, responderCount: prev.responderCount + 1 }));
    } catch (err) {
      alert(err.message);
    } finally {
      setResponding(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      setUpdatingStatus(true);
      await updateBloodRequestStatus(id, status);
      fetchRequest();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="text-center">
          <p className="text-red-300 mb-4">{error || 'Blood request not found.'}</p>
          <button onClick={() => navigate('/home')} className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b18] text-white p-6">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30">
              <Droplet className="text-red-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{request.bloodGroup} Blood Needed</h1>
              <p className="text-white/50 text-sm">{request.unitsRequired} unit{request.unitsRequired === 1 ? '' : 's'} required</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className={`px-2.5 py-1 border text-xs font-bold rounded-full ${URGENCY_STYLES[request.urgency]}`}>{request.urgency} URGENCY</span>
            <span className={`px-2.5 py-1 border text-xs font-bold rounded-full ${STATUS_STYLES[request.status]}`}>{request.status}</span>
          </div>

          <div className="mt-5 space-y-2 text-sm text-white/80">
            <p className="flex items-center gap-2"><MapPin size={15} className="text-yellow-400" /> {request.location}</p>
            {request.description && <p className="text-white/60">{request.description}</p>}
            <p className="flex items-center gap-2 text-white/40 text-xs"><Clock size={13} /> Posted {new Date(request.createdAt).toLocaleString()}</p>
          </div>

          <div className="mt-5 p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-white/50 text-xs uppercase tracking-wide font-semibold mb-2">Contact to help</p>
            <p className="flex items-center gap-2 text-white"><User size={14} /> {request.contactName}</p>
            <p className="flex items-center gap-2 text-white mt-1"><Phone size={14} /> {request.contactPhone}</p>
            {request.contactEmail && <p className="flex items-center gap-2 text-white mt-1"><Mail size={14} /> {request.contactEmail}</p>}
          </div>

          <div className="mt-6">
            {request.status !== 'ACTIVE' ? (
              <p className="text-center text-white/50 text-sm py-2">This request is {request.status.toLowerCase()} — no further responses are needed.</p>
            ) : request.hasResponded ? (
              <div className="flex items-center justify-center gap-2 text-green-300 bg-green-500/10 border border-green-500/30 rounded-xl py-3 font-semibold">
                <HeartHandshake size={18} /> You've offered to help — thank you!
              </div>
            ) : (
              <button
                onClick={handleRespond}
                disabled={responding}
                className="w-full flex items-center justify-center gap-2 p-3 text-lg font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
              >
                <HeartHandshake size={18} /> {responding ? 'Submitting...' : 'I Can Help'}
              </button>
            )}
          </div>

          {request.canManage && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/60 text-sm font-semibold">{request.responderCount} donor{request.responderCount === 1 ? '' : 's'} responded</p>
                {request.status === 'ACTIVE' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => changeStatus('FULFILLED')}
                      disabled={updatingStatus}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-500 hover:bg-green-600 text-white transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} /> Mark Fulfilled
                    </button>
                    <button
                      onClick={() => changeStatus('CANCELLED')}
                      disabled={updatingStatus}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white transition disabled:opacity-50"
                    >
                      <XCircle size={12} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {respondersLoading ? (
                <p className="text-white/40 text-xs">Loading responders...</p>
              ) : (responders || []).length === 0 ? (
                <p className="text-white/40 text-xs">No responses yet.</p>
              ) : (
                <div className="space-y-2">
                  {responders.map((donor) => (
                    <div key={donor._id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-xs">
                      <div>
                        <span className="text-white font-semibold">{donor.username}</span>
                        <span className="text-white/40 ml-2">{donor.department} &middot; {donor.year}</span>
                      </div>
                      <span className="flex items-center gap-1 text-white/70"><Phone size={11} /> {donor.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
