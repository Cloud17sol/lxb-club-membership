// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, CheckCircle, XCircle, LogOut, Settings } from 'lucide-react';
import { API_URL } from '@/apiConfig';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="bg-[#050505] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/lxb-logo.jpg" alt="LXB Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-2xl font-black bebas tracking-tight text-white">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#A0A0AB] text-sm hidden md:block">{user?.full_name}</span>
            <Button
              onClick={logout}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
              data-testid="admin-logout-button"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="admin-stats-section">
          <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <Users size={32} className="text-[#FF5722]" />
              <div className="text-right">
                <div className="text-3xl font-black bebas text-white">{stats?.total_members || 0}</div>
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Total Members</div>
          </div>

          <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle size={32} className="text-[#4CAF50]" />
              <div className="text-right">
                <div className="text-3xl font-black bebas text-white">{stats?.active_members || 0}</div>
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Active (Paid)</div>
          </div>

          <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <XCircle size={32} className="text-[#F44336]" />
              <div className="text-right">
                <div className="text-3xl font-black bebas text-white">{stats?.unpaid_members || 0}</div>
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Unpaid</div>
          </div>

          <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={32} className="text-[#FF5722]" />
              <div className="text-right">
                <div className="text-2xl font-black bebas text-white">₦{stats?.total_collected_this_month?.toLocaleString() || 0}</div>
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">This Month</div>
          </div>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/admin/members')}
            className="bg-[#0F0F12] border border-white/10 rounded-sm p-8 hover:border-white/20 transition-all text-left group"
            data-testid="manage-members-button"
          >
            <Users size={48} className="text-[#FF5722] mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-black bebas uppercase tracking-tight text-white mb-2">Manage Members</h3>
            <p className="text-[#A0A0AB] text-sm">View, filter, and manage all club members</p>
          </button>

          <button
            onClick={() => navigate('/admin/payments')}
            className="bg-[#0F0F12] border border-white/10 rounded-sm p-8 hover:border-white/20 transition-all text-left group"
            data-testid="view-payments-button"
          >
            <DollarSign size={48} className="text-[#4CAF50] mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-black bebas uppercase tracking-tight text-white mb-2">View Payments</h3>
            <p className="text-[#A0A0AB] text-sm">Track all payment transactions and history</p>
          </button>

          <button
            onClick={() => navigate('/admin/settings')}
            className="bg-[#0F0F12] border border-white/10 rounded-sm p-8 hover:border-white/20 transition-all text-left group"
            data-testid="dues-settings-button"
          >
            <Settings size={48} className="text-[#FF5722] mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-black bebas uppercase tracking-tight text-white mb-2">Dues Settings</h3>
            <p className="text-[#A0A0AB] text-sm">Set and update monthly membership dues</p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
