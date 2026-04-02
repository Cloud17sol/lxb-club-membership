// @ts-nocheck
// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    player_position: ''
  });
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signup(formData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        backgroundImage: 'url(https://images.pexels.com/photos/12700811/pexels-photo-12700811.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1080&w=1920)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-black/80" />
      
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8">
          <div className="flex items-center justify-center mb-8">
            <img src="/lxb-logo.jpg" alt="LXB Logo" className="w-20 h-20 object-contain" />
          </div>

          <h1 className="text-4xl font-black bebas uppercase tracking-tight text-white text-center mb-2">Join The League</h1>
          <p className="text-[#A0A0AB] text-center mb-8 text-sm">Create your membership account</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name" className="text-white text-sm font-medium">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  required
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  placeholder="John Doe"
                  data-testid="signup-fullname-input"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white text-sm font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  placeholder="your@email.com"
                  data-testid="signup-email-input"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-white text-sm font-medium">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  placeholder="••••••••"
                  data-testid="signup-password-input"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white text-sm font-medium">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  placeholder="+234 XXX XXX XXXX"
                  data-testid="signup-phone-input"
                />
              </div>

              <div>
                <Label htmlFor="date_of_birth" className="text-white text-sm font-medium">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  required
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  data-testid="signup-dob-input"
                />
              </div>

              <div>
                <Label htmlFor="gender" className="text-white text-sm font-medium">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)} required>
                  <SelectTrigger className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm" data-testid="signup-gender-select">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F0F12] border-white/10 text-white">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address" className="text-white text-sm font-medium">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  required
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  placeholder="Your address"
                  data-testid="signup-address-input"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="player_position" className="text-white text-sm font-medium">Player Position (Optional)</Label>
                <Input
                  id="player_position"
                  value={formData.player_position}
                  onChange={(e) => handleChange('player_position', e.target.value)}
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                  placeholder="e.g., Point Guard, Center"
                  data-testid="signup-position-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide transition-transform duration-200 active:scale-95"
              data-testid="signup-submit-button"
            >
              {loading ? 'Creating account...' : (
                <>
                  <UserPlus size={18} className="mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#A0A0AB] text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#FF5722] hover:text-[#E64A19] font-medium" data-testid="login-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
