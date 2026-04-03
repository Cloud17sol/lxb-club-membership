// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, User as UserIcon, KeyRound } from 'lucide-react';
import { buildFileUrl } from '@/utils/fileHelpers';
import { API_URL } from '../apiConfig';

const AdminMemberEdit = () => {
  const { userId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    player_position: ''
  });

  useEffect(() => {
    fetchMemberDetails();
  }, [userId]);

  const fetchMemberDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/members/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          address: data.address || '',
          player_position: data.player_position || ''
        });
      }
    } catch (error) {
      console.error('Error fetching member details:', error);
      toast.error('Failed to load member details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update member details');
      }

      toast.success('Member details updated successfully!');
      navigate('/admin/members');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update member details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResetPassword = async () => {
    if (
      !window.confirm(
        "Reset this member's password to the club default? They must use the new temporary password to sign in."
      )
    ) {
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/members/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const d = data.detail;
        const msg =
          typeof d === 'string'
            ? d
            : Array.isArray(d) && d[0]?.msg
              ? d[0].msg
              : 'Failed to reset password';
        throw new Error(msg);
      }
      toast.success('Password reset', {
        description: `Temporary password: ${data.temporary_password}`,
        duration: 60000
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#050505] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/admin/members')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
            data-testid="back-button"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-black bebas uppercase tracking-tight text-white">Edit Member</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8">
          {/* Profile Image */}
          <div className="mb-8 flex flex-col items-center">
            <div className="w-32 h-32 rounded-sm overflow-hidden border-2 border-white/10 bg-[#1A1A20] mb-4">
              {profile?.profile_image_url ? (
                <img 
                  src={buildFileUrl(profile.profile_image_url)}
                  alt={profile.full_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon size={48} className="text-[#A0A0AB]" />
                </div>
              )}
            </div>
          </div>

          {profile && (
            <div className="mb-6 pb-6 border-b border-white/10 space-y-3">
              <div>
                <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-1">Membership ID</div>
                <div className="text-white text-xl font-black bebas">{profile.membership_id}</div>
              </div>
              <div>
                <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-1">Email</div>
                <div className="text-white text-base">{profile.email}</div>
              </div>
            </div>
          )}

          {profile && profile.role !== 'admin' && (
            <div className="mb-8 p-5 rounded-sm border border-[#FF5722]/30 bg-[#FF5722]/5 space-y-3">
              <h2 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <KeyRound size={18} className="text-[#FF5722]" />
                Account security
              </h2>
              <p className="text-[#A0A0AB] text-sm leading-relaxed">
                If this member forgot their password, reset it to the club default. Share the temporary password securely
                (in person or phone). The server default can be overridden with{' '}
                <code className="text-white/90 bg-black/30 px-1.5 py-0.5 rounded text-xs">DEFAULT_MEMBER_PASSWORD</code>.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={resetLoading}
                onClick={handleResetPassword}
                className="w-full sm:w-auto border-[#FF5722]/50 text-white hover:bg-[#FF5722]/10 hover:text-white rounded-sm"
                data-testid="reset-member-password-button"
              >
                {resetLoading ? (
                  'Resetting…'
                ) : (
                  <>
                    <KeyRound size={18} className="mr-2" />
                    Reset password to default
                  </>
                )}
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name" className="text-white text-sm font-medium">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="member-fullname-input"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="member-phone-input"
                />
              </div>

              <div>
                <Label htmlFor="date_of_birth" className="text-white text-sm font-medium">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="member-dob-input"
                />
              </div>

              <div>
                <Label htmlFor="player_position" className="text-white text-sm font-medium">Player Position</Label>
                <Input
                  id="player_position"
                  value={formData.player_position}
                  onChange={(e) => handleChange('player_position', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  placeholder="e.g., Point Guard"
                  data-testid="member-position-input"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address" className="text-white text-sm font-medium">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="member-address-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide transition-transform duration-200 active:scale-95"
              data-testid="save-member-button"
            >
              {loading ? 'Saving...' : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminMemberEdit;
