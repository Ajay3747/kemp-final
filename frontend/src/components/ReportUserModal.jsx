import React, { useState } from 'react';
import { X, Flag, Image as ImageIcon, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const REPORT_REASONS = [
  'Scam/Fraud',
  'Fake Listing',
  'Harassment/Abuse',
  'Inappropriate Content',
  'Prohibited Item',
  'Misleading Information',
  'Other'
];

const MAX_EVIDENCE_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Reports another user for platform misuse. This is a UX-only precheck on
// file type/count — the backend (POST /api/reports) re-validates everything,
// including the actual image bytes (reused from the existing listing-image
// validator) and that the reporter isn't reporting themselves.
export default function ReportUserModal({ isOpen, onClose, reportedUserId, reportedUsername, listingId }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]); // [{ id, file }]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetAndClose = () => {
    setReason('');
    setDescription('');
    setEvidenceFiles([]);
    setError('');
    onClose();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (files.length === 0) return;

    if (evidenceFiles.length + files.length > MAX_EVIDENCE_FILES) {
      setError(`You can attach up to ${MAX_EVIDENCE_FILES} evidence images.`);
      return;
    }

    const invalid = files.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      setError('Only JPG, JPEG, PNG and WEBP images are allowed for evidence.');
      return;
    }

    setError('');
    setEvidenceFiles((prev) => [
      ...prev,
      ...files.map((file) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file }))
    ]);
  };

  const handleRemoveFile = (id) => {
    setEvidenceFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to report a user.');
      return;
    }

    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('reportedUserId', reportedUserId);
      form.append('reason', reason);
      form.append('description', description.trim());
      if (listingId) form.append('listingId', listingId);
      evidenceFiles.forEach(({ file }) => form.append('evidence', file));

      const response = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit report');
      }

      alert('Report submitted successfully. Our team will review the report.');
      resetAndClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
            <Flag size={22} /> Report User
          </h2>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-6">Reporting <span className="text-white font-semibold">{reportedUsername}</span></p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-200 text-sm animate-fadeIn">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="report-reason" className="block text-white font-semibold mb-2">Reason</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="premium-input w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 focus:outline-none appearance-none cursor-pointer"
              required
              disabled={submitting}
            >
              <option value="" disabled className="bg-gray-900">Select a reason</option>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r} className="bg-gray-900">{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-description" className="block text-white font-semibold mb-2">Description</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              placeholder="Describe what happened..."
              className="premium-input w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 focus:outline-none placeholder-gray-500 resize-none"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Evidence (optional)</label>
            <label
              htmlFor="report-evidence"
              className={`flex items-center justify-center gap-2 border-2 border-dashed border-white/15 bg-white/[0.02] rounded-xl p-4 text-gray-400 text-sm transition-all duration-200 hover:border-yellow-400/60 ${submitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <ImageIcon size={18} />
              Add screenshots or photos (up to {MAX_EVIDENCE_FILES})
            </label>
            <input
              id="report-evidence"
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={submitting}
            />

            {evidenceFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {evidenceFiles.map(({ id, file }) => (
                  <div key={id} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                    <img src={URL.createObjectURL(file)} alt="Evidence preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(id)}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`premium-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-lg shadow-lg ${
              submitting
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-yellow-500/25'
            }`}
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Flag size={20} />}
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
