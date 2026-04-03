// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, Camera, Lock } from 'lucide-react';
import { buildFileUrl } from '@/utils/fileHelpers';
import { API_URL } from '../apiConfig';

const ProfilePage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    player_position: ''
  });
  const [pwData, setPwData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    setImageFailed(false);
    fetchProfile();
  }, [token]);

  useEffect(() => {
    setImageFailed(false);
  }, [profile?.profile_image_url]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
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
      console.error('Error fetching profile:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error('Image size must be less than 1MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload/profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      toast.success('Profile image uploaded successfully..!');
      
      // Refresh profile to show new image
      setTimeout(() => {
        fetchProfile();
      }, 500);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast.success('Profile updated successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwData.new_password !== pwData.confirm_password) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (pwData.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setPwLoading(true);
    try {
      const response = await fetch(`${API_URL}/profile/change-password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: pwData.current_password,
          new_password: pwData.new_password,
          confirm_password: pwData.confirm_password
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const d = data.detail;
        const msg =
          typeof d === 'string'
            ? d
            : Array.isArray(d) && d[0]?.msg
              ? d[0].msg
              : 'Failed to update password';
        throw new Error(msg);
      }
      toast.success('Password updated successfully');
      setPwData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#050505] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
            data-testid="back-button"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-black bebas uppercase tracking-tight text-white">Edit Profile</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8">
          {/* Profile Image Upload */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-sm overflow-hidden border-2 border-white/10 bg-[#1A1A20]">
                {profile?.profile_image_url && !imageFailed ? (
                  <img
                    src={buildFileUrl(profile.profile_image_url)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera size={48} className="text-[#A0A0AB]" />
                  </div>
                )}
              </div>
              <label htmlFor="image-upload" className="absolute bottom-0 right-0 bg-[#FF5722] hover:bg-[#E64A19] text-white p-2 rounded-sm cursor-pointer transition-colors">
                <Upload size={16} />
                <input 
                  id="image-upload"
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <p className="text-[#A0A0AB] text-sm">Uploading...</p>}
            <p className="text-[#A0A0AB] text-xs text-center max-w-xs">Click the upload button to change your profile picture (max 1MB)</p>
          </div>

          {profile && (
            <div className="mb-6 pb-6 border-b border-white/10">
              <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-1">Membership ID</div>
              <div className="text-white text-xl font-black bebas">{profile.membership_id}</div>
            </div>
          )}

          {profile && (
            <form onSubmit={handlePasswordSubmit} className="mb-8 p-5 rounded-sm border border-[#FF5722]/30 bg-[#FF5722]/5 space-y-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Lock size={18} className="text-[#FF5722]" />
                Change password
              </h2>
              <p className="text-[#A0A0AB] text-sm">
                If an admin reset your password, sign in with the temporary password, then set a new one here. Minimum 8
                characters.
              </p>
              <div>
                <Label htmlFor="current_password" className="text-white text-sm font-medium">
                  Current password
                </Label>
                <Input
                  id="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={pwData.current_password}
                  onChange={(e) => setPwData((p) => ({ ...p, current_password: e.target.value }))}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="profile-current-password-input"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_password" className="text-white text-sm font-medium">
                    New password
                  </Label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={pwData.new_password}
                    onChange={(e) => setPwData((p) => ({ ...p, new_password: e.target.value }))}
                    className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                    data-testid="profile-new-password-input"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password" className="text-white text-sm font-medium">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    value={pwData.confirm_password}
                    onChange={(e) => setPwData((p) => ({ ...p, confirm_password: e.target.value }))}
                    className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                    data-testid="profile-confirm-password-input"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={pwLoading}
                className="w-full sm:w-auto bg-[#0F0F12] border border-[#FF5722]/50 text-white hover:bg-[#FF5722]/10 rounded-sm"
                data-testid="profile-update-password-button"
              >
                {pwLoading ? 'Updating…' : 'Update password'}
              </Button>
            </form>
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
                  data-testid="profile-fullname-input"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white text-sm font-medium">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="profile-phone-input"
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
                  data-testid="profile-dob-input"
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
                  data-testid="profile-position-input"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address" className="text-white text-sm font-medium">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="profile-address-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide transition-transform duration-200 active:scale-95"
              data-testid="save-profile-button"
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

export default ProfilePage;
