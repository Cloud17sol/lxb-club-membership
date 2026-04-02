// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Filter, Edit, User, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { buildFileUrl } from '@/utils/fileHelpers';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AdminMembers = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMembers(await response.json());
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleDelete = async (userId: string, fullName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${fullName}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Member deleted successfully');
        fetchMembers();
      } else {
        throw new Error('Failed to delete member');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/admin/export/csv`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lxb_members_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('CSV exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/admin/export/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lxb_members_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const filteredMembers = members.filter(member => {
    if (filter === 'all') return true;
    return member.payment_status === filter;
  });

  const activeCount = members.filter(m => m.payment_status === 'active').length;
  const inactiveCount = members.filter(m => m.payment_status === 'inactive').length;

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#050505] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
            data-testid="back-to-admin-button"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-black bebas uppercase tracking-tight text-white">Manage Members</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter buttons and Export buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4" data-testid="member-filter-section">
            <Filter size={20} className="text-[#A0A0AB]" />
            <Button
              onClick={() => setFilter('all')}
              className={`rounded-sm ${filter === 'all' ? 'bg-[#FF5722] hover:bg-[#E64A19] text-white' : 'bg-[#0F0F12] border border-white/10 text-white hover:bg-white/5'}`}
              data-testid="filter-all-button"
            >
              All ({members.length})
            </Button>
            <Button
              onClick={() => setFilter('active')}
              className={`rounded-sm ${filter === 'active' ? 'bg-[#4CAF50] hover:bg-[#45a049] text-white' : 'bg-[#0F0F12] border border-white/10 text-white hover:bg-white/5'}`}
              data-testid="filter-active-button"
            >
              Active ({activeCount})
            </Button>
            <Button
              onClick={() => setFilter('inactive')}
              className={`rounded-sm ${filter === 'inactive' ? 'bg-[#F44336] hover:bg-[#d32f2f] text-white' : 'bg-[#0F0F12] border border-white/10 text-white hover:bg-white/5'}`}
              data-testid="filter-inactive-button"
            >
              Unpaid ({inactiveCount})
            </Button>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={exporting || members.length === 0}
              className="bg-[#0F0F12] border border-white/10 text-white hover:bg-white/5 rounded-sm"
              data-testid="export-csv-button"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={exporting || members.length === 0}
              className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm"
              data-testid="export-pdf-button"
            >
              <FileText size={18} className="mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Members table */}
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm overflow-hidden" data-testid="members-table">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Photo</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Member ID</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Email</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Last Payment</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.2em] text-[#A0A0AB]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[#A0A0AB] py-8">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id} className="border-white/5 hover:bg-white/5" data-testid="member-row">
                    <TableCell>
                      <div className="w-10 h-10 rounded-sm overflow-hidden border border-white/10 bg-[#1A1A20]">
                        {member.profile_image_url ? (
                          <img src={buildFileUrl(member.profile_image_url)} alt={member.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={20} className="text-[#A0A0AB]" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-white font-medium">{member.full_name}</TableCell>
                    <TableCell className="text-white font-mono text-sm">{member.membership_id}</TableCell>
                    <TableCell className="text-[#A0A0AB] text-sm">{member.email}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold uppercase px-3 py-1 rounded-sm ${member.payment_status === 'active' ? 'bg-[#4CAF50] text-white' : 'bg-[#F44336] text-white'}`}>
                        {member.payment_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#A0A0AB] text-sm">
                      {member.last_payment_date ? format(new Date(member.last_payment_date), 'MMM dd, yyyy') : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/admin/members/${member.user_id}/edit`)}
                          variant="outline"
                          size="sm"
                          className="border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722] hover:text-white rounded-sm"
                          data-testid={`edit-member-${member.user_id}-button`}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(member.user_id, member.full_name)}
                          disabled={loading}
                          variant="outline"
                          size="sm"
                          className="border-[#F44336] text-[#F44336] hover:bg-[#F44336] hover:text-white rounded-sm"
                          data-testid={`delete-member-${member.user_id}-button`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default AdminMembers;
