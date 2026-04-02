// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
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
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img src="/lxb-logo.jpg" alt="LXB Logo" className="w-20 h-20 object-contain" />
          </div>

          <h1 className="text-4xl font-black bebas uppercase tracking-tight text-white text-center mb-2">Welcome Back</h1>
          <p className="text-[#A0A0AB] text-center mb-8 text-sm">Sign in to access your membership</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-white text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                placeholder="your@email.com"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-white text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                placeholder="••••••••"
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide transition-transform duration-200 active:scale-95"
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn size={18} className="mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#A0A0AB] text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#FF5722] hover:text-[#E64A19] font-medium" data-testid="signup-link">
                Sign Up
              </Link>
            </p>
          </div>


        </div>
      </div>
    </div>
  );
};

export default LoginPage;
