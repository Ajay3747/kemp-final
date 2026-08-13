import React, { useEffect, useState } from "react";
import { Users, Package, Handshake, IndianRupee } from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import { adminFetch } from "../utils/adminApi";

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch('/dashboard/stats')
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminSidebarLayout title="Analytics">
      {loading ? (
        <div className="text-center py-24 text-white/60">Loading analytics...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">{error}</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`${stats.activeUsers} active`} />
            <SummaryCard icon={Package} label="Total Listings" value={stats.totalListings} sub={`${stats.activeListings} active`} />
            <SummaryCard icon={Handshake} label="Total Deals" value={stats.totalDeals} sub={`${stats.completedDeals} completed · ${stats.cancelledDeals} cancelled`} />
            <SummaryCard icon={IndianRupee} label="Total Sales Value" value={`₹${stats.totalSalesValue.toLocaleString()}`} sub="from completed deals" />
          </div>

          <BigChart title="User Growth (weekly signups)" series={stats.charts.userGrowth} valueKey="count" />
          <BigChart title="Listings Created (weekly)" series={stats.charts.listingGrowth} valueKey="count" />
          <BigChart title="Deals Created (weekly)" series={stats.charts.dealGrowth} valueKey="count" />
          <BigChart title="Sales Value (weekly, completed deals)" series={stats.charts.salesGrowth} valueKey="value" prefix="₹" />
        </div>
      )}
    </AdminSidebarLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <Icon size={22} className="text-yellow-400 mb-3" />
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-sm text-white/60 mt-1">{label}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

function BigChart({ title, series, valueKey, prefix = '' }) {
  const max = Math.max(1, ...series.map((s) => s[valueKey]));
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <p className="font-semibold text-white mb-4">{title}</p>
      <div className="flex items-end gap-2 h-40">
        {series.map((point, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full bg-gradient-to-t from-yellow-400 to-amber-300 rounded-t"
              style={{ height: `${Math.max(4, (point[valueKey] / max) * 100)}%` }}
              title={`${point.label}: ${prefix}${point[valueKey]}`}
            />
            <span className="text-[9px] text-white/30 rotate-0">{point.label.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
