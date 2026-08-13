import React, { useEffect, useState } from "react";
import { X, Search, UserPlus, Eye, Pencil, Power, Trash2, ShieldCheck, Mail, Phone, Hash, Building2, Calendar } from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import { adminFetch } from "../utils/adminApi";

const ROLE_BADGE = {
  admin: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
  user: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  staff: 'bg-white/10 border-white/20 text-white/60'
};

const EMPTY_FORM = { name: '', email: '', phone: '', registerNo: '', department: '', year: '', password: '', role: 'user' };

export default function AdminUsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminFetch('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || u.username?.toLowerCase().includes(q) || u.collegeEmail?.toLowerCase().includes(q) || u.rollNo?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(""); setShowAddModal(true); };

  const submitAdd = async () => {
    setFormError("");
    if (!form.name || !form.email || !form.phone || !form.registerNo || !form.department || !form.password) {
      setFormError("All fields except Year are required.");
      return;
    }
    try {
      setSubmitting(true);
      const data = await adminFetch('/users', { method: 'POST', body: JSON.stringify(form) });
      setUsers((prev) => [data.user, ...prev]);
      setShowAddModal(false);
      flash('User created successfully.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      name: user.username, email: user.collegeEmail, phone: user.phone,
      registerNo: user.rollNo, department: user.department, year: user.year || '',
      password: '', role: user.role === 'admin' ? 'admin' : 'user'
    });
    setFormError("");
  };

  const submitEdit = async () => {
    setFormError("");
    try {
      setSubmitting(true);
      const data = await adminFetch(`/users/${editUser._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone,
          registerNo: form.registerNo, department: form.department, year: form.year, role: form.role
        })
      });
      setUsers((prev) => prev.map((u) => (u._id === data.user._id ? data.user : u)));
      setEditUser(null);
      flash('User updated successfully.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    const nextActive = user.isActive === false;
    try {
      const data = await adminFetch(`/users/${user._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive })
      });
      setUsers((prev) => prev.map((u) => (u._id === data.user._id ? data.user : u)));
      flash(`User ${nextActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const verifyUser = async (user) => {
    try {
      const data = await adminFetch(`/users/${user._id}/verify`, { method: 'PATCH' });
      setUsers((prev) => prev.map((u) => (u._id === data.user._id ? data.user : u)));
      setViewUser((prev) => (prev && prev._id === data.user._id ? data.user : prev));
      flash('User verified.');
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.username}? This cannot be undone.`)) return;
    try {
      await adminFetch(`/users/${user._id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      flash('User deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminSidebarLayout title="Users Management">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, email, or register number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-gray-800 border border-white/20 text-white focus:outline-none focus:border-yellow-400"
        >
          <option value="all">All Roles</option>
          <option value="user">Student</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff (legacy)</option>
        </select>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition flex-shrink-0"
        >
          <UserPlus size={18} /> Add User
        </button>
      </div>

      {notice && <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-sm">{notice}</div>}
      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-white/60">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 text-white/40">No users found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/10 border-b border-white/20">
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Register No</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-yellow-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="px-4 py-3 font-semibold text-white text-sm">{user.username}</td>
                  <td className="px-4 py-3 text-white/70 text-sm">{user.collegeEmail}</td>
                  <td className="px-4 py-3 text-white/70 text-sm">{user.rollNo}</td>
                  <td className="px-4 py-3 text-white/70 text-sm">{user.department}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${ROLE_BADGE[user.role] || ROLE_BADGE.user}`}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'staff' ? 'Staff' : 'Student'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${
                      user.isActive === false ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-green-500/20 border-green-500/50 text-green-300'
                    }`}>
                      {user.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <IconBtn title="View" onClick={() => setViewUser(user)}><Eye size={15} /></IconBtn>
                      <IconBtn title="Edit" onClick={() => openEdit(user)}><Pencil size={15} /></IconBtn>
                      <IconBtn title={user.isActive === false ? 'Activate' : 'Deactivate'} onClick={() => toggleActive(user)} tone={user.isActive === false ? 'text-green-400' : 'text-amber-400'}>
                        <Power size={15} />
                      </IconBtn>
                      <IconBtn title="Delete" onClick={() => deleteUser(user)} tone="text-red-400"><Trash2 size={15} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <UserFormModal
          title="Add New User"
          form={form}
          setForm={setForm}
          formError={formError}
          submitting={submitting}
          showPassword
          onCancel={() => setShowAddModal(false)}
          onSubmit={submitAdd}
        />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <UserFormModal
          title={`Edit ${editUser.username}`}
          form={form}
          setForm={setForm}
          formError={formError}
          submitting={submitting}
          showPassword={false}
          onCancel={() => setEditUser(null)}
          onSubmit={submitEdit}
        />
      )}

      {/* View User Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-white/20 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={22} />
            </button>
            <h2 className="text-2xl font-bold text-yellow-400 mb-1">{viewUser.username}</h2>
            <p className="text-white/50 text-sm mb-6">{viewUser.fullName}</p>

            <div className="space-y-3">
              <DetailRow icon={Mail} label="Email" value={viewUser.collegeEmail} />
              <DetailRow icon={Phone} label="Phone" value={viewUser.phone} />
              <DetailRow icon={Hash} label="Register No" value={viewUser.rollNo} />
              <DetailRow icon={Building2} label="Department" value={viewUser.department} />
              {viewUser.year && <DetailRow icon={Calendar} label="Year" value={viewUser.year} />}
              <DetailRow
                icon={ShieldCheck}
                label="Verification"
                value={viewUser.identityVerificationStatus || 'Not verified'}
              />
            </div>

            <div className="flex gap-3 mt-6">
              {viewUser.identityVerificationStatus !== 'VERIFIED' && (
                <button
                  onClick={() => verifyUser(viewUser)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition"
                >
                  <ShieldCheck size={16} /> Verify User
                </button>
              )}
              <button
                onClick={() => setViewUser(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
}

function IconBtn({ children, onClick, title, tone = 'text-white/70' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition ${tone}`}
    >
      {children}
    </button>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
      <Icon size={16} className="text-yellow-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-white text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

function UserFormModal({ title, form, setForm, formError, submitting, showPassword, onCancel, onSubmit }) {
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-white/20 max-h-[90vh] overflow-y-auto">
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={22} />
        </button>
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">{title}</h2>

        <div className="space-y-4">
          <FormInput label="Name" value={form.name} onChange={set('name')} />
          <FormInput label="Email" type="email" value={form.email} onChange={set('email')} />
          <FormInput label="Phone Number" value={form.phone} onChange={set('phone')} />
          <FormInput label="Register Number" value={form.registerNo} onChange={set('registerNo')} />
          <FormInput label="Department" value={form.department} onChange={set('department')} />
          <FormInput label="Year" value={form.year} onChange={set('year')} placeholder="e.g. 2nd Year" />
          {showPassword && <FormInput label="Password" type="password" value={form.password} onChange={set('password')} />}
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Role</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full p-3 rounded-lg bg-gray-800 border border-white/10 text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="user">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {formError && <p className="mt-4 text-red-400 text-sm">{formError}</p>}

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full mt-6 p-3 text-lg font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-white/60 text-sm mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400"
      />
    </div>
  );
}
