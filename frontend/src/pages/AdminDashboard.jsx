import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Package, Handshake, IndianRupee, CheckCircle2, XCircle, Flag,
  UserCheck, PackageCheck, ArrowRight
} from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import { adminFetch } from "../utils/adminApi";

const STATUS_BADGE_STYLES = {
  PENDING: 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300',
  ACCEPTED: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  PROCESSING: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
  READY_FOR_HANDOVER: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  COMPLETED: 'bg-green-500/20 border-green-500/50 text-green-300',
  REJECTED: 'bg-red-500/20 border-red-500/50 text-red-300',
  CANCELLED: 'bg-red-500/20 border-red-500/50 text-red-300'
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          adminFetch('/dashboard/stats'),
          adminFetch('/dashboard/recent-activity')
        ]);
        setStats(statsData);
        setActivity(activityData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AdminSidebarLayout title="Dashboard">
      {loading ? (
        <div className="text-center py-24 text-white/60">Loading dashboard...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">{error}</div>
      ) : (
        <div className="space-y-8">
          {/* Primary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Users" value={stats.totalUsers} color="yellow" />
            <StatCard icon={Package} label="Listings" value={stats.totalListings} color="blue" />
            <StatCard icon={Handshake} label="Deals" value={stats.totalDeals} color="purple" />
            <StatCard icon={IndianRupee} label="Sales" value={`₹${stats.totalSalesValue.toLocaleString()}`} color="green" />
          </div>

          {/* Secondary stat chips */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MiniStat icon={UserCheck} label="Active Users" value={stats.activeUsers} />
            <MiniStat icon={PackageCheck} label="Active Listings" value={stats.activeListings} />
            <MiniStat icon={CheckCircle2} label="Completed Deals" value={stats.completedDeals} tone="text-green-400" />
            <MiniStat icon={XCircle} label="Cancelled Deals" value={stats.cancelledDeals} tone="text-red-400" />
            <MiniStat icon={Flag} label="Pending Reports" value={stats.pendingReports} tone="text-amber-400" />
          </div>

          {/* Growth charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GrowthChart title="User Growth" series={stats.charts.userGrowth} valueKey="count" />
            <GrowthChart title="Listings" series={stats.charts.listingGrowth} valueKey="count" />
            <GrowthChart title="Deals" series={stats.charts.dealGrowth} valueKey="count" />
            <GrowthChart title="Sales" series={stats.charts.salesGrowth} valueKey="value" prefix="₹" />
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickLinkCard
              icon={Users}
              title="User Management"
              description="Add, edit, verify, and manage every account."
              onClick={() => navigate('/admin/users')}
            />
            <QuickLinkCard
              icon={Package}
              title="Listing Management"
              description="Review listings and remove inappropriate ones."
              onClick={() => navigate('/admin/listings')}
            />
            <QuickLinkCard
              icon={Handshake}
              title="Deal Management"
              description="Monitor every order across the marketplace."
              onClick={() => navigate('/admin/orders')}
            />
            <QuickLinkCard
              icon={Flag}
              title="Reports"
              description="Review complaints and resolve issues."
              onClick={() => navigate('/admin/reports')}
            />
          </div>

          {/* Recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityPanel title="Recent Deals">
              {activity.recentDeals.length === 0 ? (
                <EmptyRow text="No deals yet." />
              ) : (
                activity.recentDeals.map((deal) => (
                  <div key={deal._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{deal.productTitle}</p>
                      <p className="text-xs text-white/50">{deal.buyerName} ← {deal.sellerName}</p>
                    </div>
                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full flex-shrink-0 ${STATUS_BADGE_STYLES[deal.status] || 'bg-white/10 border-white/20 text-white/70'}`}>
                      {deal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              )}
            </ActivityPanel>

            <ActivityPanel title="Recent Reports">
              {activity.recentReports.length === 0 ? (
                <EmptyRow text="No reports yet." />
              ) : (
                activity.recentReports.map((report) => (
                  <div key={report._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{report.reportedUsername}</p>
                      <p className="text-xs text-white/50 truncate">{report.reportText}</p>
                    </div>
                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full flex-shrink-0 ${
                      report.status === 'OPEN' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' :
                      report.status === 'RESOLVED' ? 'bg-green-500/20 border-green-500/50 text-green-300' :
                      'bg-white/10 border-white/20 text-white/60'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                ))
              )}
            </ActivityPanel>

            <ActivityPanel title="Recent Users">
              {activity.recentUsers.length === 0 ? (
                <EmptyRow text="No users yet." />
              ) : (
                activity.recentUsers.map((u) => (
                  <div key={u._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                      <p className="text-xs text-white/50 truncate">{u.collegeEmail}</p>
                    </div>
                    <span className={`text-[10px] font-bold ${u.isActive === false ? 'text-red-400' : 'text-green-400'}`}>
                      {u.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                    </span>
                  </div>
                ))
              )}
            </ActivityPanel>

            <ActivityPanel title="Recent Listings">
              {activity.recentListings.length === 0 ? (
                <EmptyRow text="No listings yet." />
              ) : (
                activity.recentListings.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                      <p className="text-xs text-white/50 truncate">{p.sellerName} · ₹{Number(p.price).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full flex-shrink-0 ${STATUS_BADGE_STYLES[p.status] || 'bg-white/10 border-white/20 text-white/70'}`}>
                      {p.status}
                    </span>
                  </div>
                ))
              )}
            </ActivityPanel>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    yellow: 'from-yellow-400/20 to-amber-500/10 border-yellow-400/30 text-yellow-300',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-300'
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={22} />
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-sm text-white/60 mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
      <Icon size={18} className={tone} />
      <div className="min-w-0">
        <p className={`text-xl font-bold ${tone}`}>{value}</p>
        <p className="text-[11px] text-white/50 truncate">{label}</p>
      </div>
    </div>
  );
}

function GrowthChart({ title, series, valueKey, prefix = '' }) {
  const max = Math.max(1, ...series.map((s) => s[valueKey]));
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white/80 mb-3">{title}</p>
      <div className="flex items-end gap-1 h-20">
        {series.map((point, idx) => (
          <div
            key={idx}
            className="flex-1 bg-gradient-to-t from-yellow-400 to-amber-300 rounded-t"
            style={{ height: `${Math.max(4, (point[valueKey] / max) * 100)}%` }}
            title={`${point.label}: ${prefix}${point[valueKey]}`}
          />
        ))}
      </div>
      <p className="text-[11px] text-white/40 mt-2">Last {series.length} weeks</p>
    </div>
  );
}

function QuickLinkCard({ icon: Icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-yellow-400/30 p-6 transition"
    >
      <div className="flex items-center justify-between">
        <div className="p-3 rounded-xl bg-yellow-400/10 text-yellow-300">
          <Icon size={22} />
        </div>
        <ArrowRight size={18} className="text-white/30 group-hover:text-yellow-300 group-hover:translate-x-1 transition" />
      </div>
      <h3 className="text-lg font-bold text-white mt-4">{title}</h3>
      <p className="text-white/60 text-sm mt-1">{description}</p>
    </button>
  );
}

function ActivityPanel({ title, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wide mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-white/40 text-sm py-4 text-center">{text}</p>;
}
