import React, { useEffect, useMemo, useState } from 'react';
import { Droplet, User, Phone, Hash } from 'lucide-react';
import AdminSidebarLayout from '../components/AdminSidebarLayout';
import { adminFetch } from '../utils/adminApi';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Admin-only view of users who currently have donationAvailability: true.
// The backend (adminController.listBloodDonors) is the actual filter —
// this page never fetches the full user list and hides unavailable users
// client-side; unavailable users are never sent to the browser at all.
export default function AdminBloodDonors() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  useEffect(() => { fetchDonors(); }, [bloodGroupFilter]);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      setError('');
      const params = bloodGroupFilter === 'All' ? '' : `?bloodGroup=${encodeURIComponent(bloodGroupFilter)}`;
      const data = await adminFetch(`/blood-donors${params}`);
      setDonors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Department options are derived from the donors actually returned, not a
  // hardcoded list — filtering is only ever among users who are currently
  // available to donate, per the requirement.
  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(donors.map((d) => d.department).filter(Boolean)));
    return unique.sort();
  }, [donors]);

  const visibleDonors = useMemo(() => {
    if (departmentFilter === 'All') return donors;
    return donors.filter((d) => d.department === departmentFilter);
  }, [donors, departmentFilter]);

  return (
    <AdminSidebarLayout title="Blood Donors">
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-white/50 text-xs font-semibold mb-1.5">Blood Group</label>
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer"
          >
            <option value="All" className="bg-gray-900">All</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg} className="bg-gray-900">{bg}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-white/50 text-xs font-semibold mb-1.5">Department</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 cursor-pointer min-w-[10rem]"
          >
            <option value="All" className="bg-gray-900">All</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept} className="bg-gray-900">{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-white/60">Loading donors...</div>
      ) : visibleDonors.length === 0 ? (
        <div className="text-center py-16">
          <Droplet className="mx-auto mb-4 text-white/20" size={48} />
          <p className="text-white/40">No available donors match this filter.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-left text-white/50 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Blood Group</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Register No.</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Availability</th>
                </tr>
              </thead>
              <tbody>
                {visibleDonors.map((donor) => (
                  <tr key={donor._id} className="border-t border-white/10 hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-white font-semibold">{donor.username}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 border border-red-500/40 bg-red-500/10 text-red-300 text-xs font-bold rounded-full">{donor.bloodGroup}</span>
                    </td>
                    <td className="px-4 py-3 text-white/80">{donor.department || 'N/A'}</td>
                    <td className="px-4 py-3 text-white/80">{donor.year || 'N/A'}</td>
                    <td className="px-4 py-3 text-white/80">{donor.rollNo || 'N/A'}</td>
                    <td className="px-4 py-3 text-white/80">{donor.phone || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 border border-green-500/50 bg-green-500/20 text-green-300 text-xs font-bold rounded-full">Available</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visibleDonors.map((donor) => (
              <div key={donor._id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-yellow-400" />
                    <span className="font-bold text-white">{donor.username}</span>
                  </div>
                  <span className="px-2 py-0.5 border border-red-500/40 bg-red-500/10 text-red-300 text-xs font-bold rounded-full">{donor.bloodGroup}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                  <p>Dept: <span className="text-white">{donor.department || 'N/A'}</span></p>
                  <p>Year: <span className="text-white">{donor.year || 'N/A'}</span></p>
                  <p className="flex items-center gap-1"><Hash size={11} /> {donor.rollNo || 'N/A'}</p>
                  <p className="flex items-center gap-1"><Phone size={11} /> {donor.phone || 'N/A'}</p>
                </div>
                <span className="inline-block mt-3 px-2 py-0.5 border border-green-500/50 bg-green-500/20 text-green-300 text-xs font-bold rounded-full">Available</span>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminSidebarLayout>
  );
}
