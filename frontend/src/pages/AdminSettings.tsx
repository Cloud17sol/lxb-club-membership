// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Shield, Eye, EyeOff, AlertTriangle, CheckCircle2, CreditCard, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { API_URL, BACKEND_ORIGIN } from '../apiConfig';

const AdminSettings = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Dues state
  const [dues, setDues] = useState<any>(null);
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [physicalCardAmount, setPhysicalCardAmount] = useState('');
  const [duesLoading, setDuesLoading] = useState(false);

  // Payment settings state
  const [paySettings, setPaySettings] = useState<any>(null);
  const [payMode, setPayMode] = useState('test');
  const [testPublicKey, setTestPublicKey] = useState('');
  const [testSecretKey, setTestSecretKey] = useState('');
  const [livePublicKey, setLivePublicKey] = useState('');
  const [liveSecretKey, setLiveSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    fetchDues();
    fetchPaymentSettings();
  }, []);

  const fetchDues = async () => {
    try {
      const response = await fetch(`${API_URL}/dues`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDues(data);
        setMonthlyAmount(data.monthly_amount.toString());
        setPhysicalCardAmount((data.physical_card_amount || 0).toString());
      }
    } catch (error) {
      console.error('Error fetching dues:', error);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/payment-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPaySettings(data);
        setPayMode(data.paystack_mode || 'test');
        setTestPublicKey(data.paystack_test_public_key || '');
        setLivePublicKey(data.paystack_live_public_key || '');
        setWebhookSecret(data.webhook_secret || '');
        // Secret keys come masked — don't pre-fill inputs
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const handleDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuesLoading(true);
    try {
      const response = await fetch(`${API_URL}/dues`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monthly_amount: parseFloat(monthlyAmount),
          physical_card_amount: parseFloat(physicalCardAmount)
        })
      });
      if (!response.ok) throw new Error('Failed to update dues');
      toast.success('Dues updated successfully!');
      fetchDues();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update dues');
    } finally {
      setDuesLoading(false);
    }
  };

  const handlePaySettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);
    try {
      const body: any = { paystack_mode: payMode };

      // Only send keys if user actually typed new values
      if (testPublicKey) body.paystack_test_public_key = testPublicKey;
      if (testSecretKey) body.paystack_test_secret_key = testSecretKey;
      if (livePublicKey) body.paystack_live_public_key = livePublicKey;
      if (liveSecretKey) body.paystack_live_secret_key = liveSecretKey;
      if (webhookSecret) body.webhook_secret = webhookSecret;

      const response = await fetch(`${API_URL}/admin/payment-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to update payment settings');
      }

      toast.success('Payment gateway settings updated!');
      // Clear secret inputs after save
      setTestSecretKey('');
      setLiveSecretKey('');
      fetchPaymentSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setPwLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to change password');
      }

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="bg-[#050505] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
            data-testid="back-to-admin-button"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-black bebas uppercase tracking-tight text-white">Settings</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="dues" className="w-full">
          <TabsList
            className="grid w-full grid-cols-3 gap-1 h-auto p-1 rounded-sm bg-[#1A1A20] border border-white/10"
            data-testid="settings-tabs"
          >
            <TabsTrigger
              value="dues"
              className="rounded-sm py-3 px-2 text-xs sm:text-sm font-black bebas uppercase tracking-tight text-[#A0A0AB] data-[state=active]:bg-[#FF5722] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Dues Settings
            </TabsTrigger>
            <TabsTrigger
              value="gateway"
              className="rounded-sm py-3 px-2 text-xs sm:text-sm font-black bebas uppercase tracking-tight text-[#A0A0AB] data-[state=active]:bg-[#FF5722] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Payment Gateway
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="rounded-sm py-3 px-2 text-xs sm:text-sm font-black bebas uppercase tracking-tight text-[#A0A0AB] data-[state=active]:bg-[#FF5722] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Change Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dues" className="mt-6 outline-none">
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard size={22} className="text-[#FF5722]" />
            <h2 className="text-2xl font-black bebas uppercase tracking-tight text-white">Dues Settings</h2>
          </div>

          {dues && (
            <div className="mb-6 pb-6 border-b border-white/10 space-y-4">
              <div>
                <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-2">Current Monthly Dues</div>
                <div className="text-4xl font-black bebas text-white">
                  {'\u20A6'}{dues.monthly_amount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-2">Physical ID Card Amount</div>
                <div className="text-3xl font-black bebas text-[#FF5722]">
                  {'\u20A6'}{(dues.physical_card_amount || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-[#A0A0AB] text-sm mt-2">
                Last updated: {new Date(dues.updated_at).toLocaleDateString()}
              </div>
            </div>
          )}

          <form onSubmit={handleDuesSubmit} className="space-y-6" data-testid="dues-settings-form">
            <div>
              <Label htmlFor="monthly_amount" className="text-white text-sm font-medium">Monthly Dues Amount (NGN)</Label>
              <Input
                id="monthly_amount"
                type="number"
                step="0.01"
                min="0"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                required
                className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm text-2xl font-bold"
                placeholder="5000"
                data-testid="dues-amount-input"
              />
              <p className="text-[#A0A0AB] text-xs mt-2">Recurring monthly membership fee</p>
            </div>

            <div>
              <Label htmlFor="physical_card_amount" className="text-white text-sm font-medium">Physical ID Card Amount (NGN)</Label>
              <Input
                id="physical_card_amount"
                type="number"
                step="0.01"
                min="0"
                value={physicalCardAmount}
                onChange={(e) => setPhysicalCardAmount(e.target.value)}
                required
                className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm text-2xl font-bold"
                placeholder="2000"
                data-testid="physical-card-amount-input"
              />
              <p className="text-[#A0A0AB] text-xs mt-2">One-time fee for physical ID card (optional add-on)</p>
            </div>

            <Button
              type="submit"
              disabled={duesLoading}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide py-6 text-lg transition-transform duration-200 active:scale-95"
              data-testid="save-dues-button"
            >
              {duesLoading ? 'Saving...' : (
                <>
                  <Save size={20} className="mr-2" />
                  Update Dues
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 p-4 bg-[#1A1A20] border border-white/5 rounded-sm">
          <p className="text-[#A0A0AB] text-sm">
            <strong className="text-white">Note:</strong> Monthly dues are recurring payments. Physical ID card is an optional one-time add-on. Members who have already paid for the current month will not be affected by dues changes.
          </p>
        </div>
          </TabsContent>

          <TabsContent value="gateway" className="mt-6 outline-none">
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={22} className="text-[#FF5722]" />
            <h2 className="text-2xl font-black bebas uppercase tracking-tight text-white">Payment Gateway</h2>
          </div>
          <p className="text-[#A0A0AB] text-sm mb-6">Configure your Paystack API keys. Secret keys are never displayed after saving.</p>

          {/* Status indicators */}
          {paySettings && (
            <div className="flex flex-wrap gap-4 mb-6">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide ${paySettings.has_test_keys ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20' : 'bg-[#F44336]/10 text-[#F44336] border border-[#F44336]/20'}`}>
                {paySettings.has_test_keys ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                Test Keys {paySettings.has_test_keys ? 'Configured' : 'Not Set'}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide ${paySettings.has_live_keys ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20' : 'bg-white/5 text-[#A0A0AB] border border-white/10'}`}>
                {paySettings.has_live_keys ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                Live Keys {paySettings.has_live_keys ? 'Configured' : 'Not Set'}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide ${payMode === 'live' ? 'bg-[#FF5722]/10 text-[#FF5722] border border-[#FF5722]/20' : 'bg-white/5 text-[#A0A0AB] border border-white/10'}`}>
                Mode: {payMode.toUpperCase()}
              </div>
            </div>
          )}

          <form onSubmit={handlePaySettingsSubmit} className="space-y-6" data-testid="payment-settings-form">
            {/* Mode Toggle */}
            <div>
              <Label className="text-white text-sm font-medium mb-3 block">Active Mode</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPayMode('test')}
                  className={`flex-1 py-3 rounded-sm font-bold uppercase tracking-wide text-sm border transition-colors duration-200 ${payMode === 'test' ? 'bg-[#FF5722] text-white border-[#FF5722]' : 'bg-transparent text-[#A0A0AB] border-white/10 hover:border-white/30'}`}
                  data-testid="mode-test-button"
                >
                  Test Mode
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('live')}
                  className={`flex-1 py-3 rounded-sm font-bold uppercase tracking-wide text-sm border transition-colors duration-200 ${payMode === 'live' ? 'bg-[#FF5722] text-white border-[#FF5722]' : 'bg-transparent text-[#A0A0AB] border-white/10 hover:border-white/30'}`}
                  data-testid="mode-live-button"
                >
                  Live Mode
                </button>
              </div>
            </div>

            {/* Test Keys */}
            <div className="p-5 bg-[#1A1A20] border border-white/5 rounded-sm space-y-4">
              <h3 className="text-white text-sm font-bold uppercase tracking-wide">Test Keys</h3>
              <div>
                <Label htmlFor="test_public_key" className="text-[#A0A0AB] text-xs">Test Public Key</Label>
                <Input
                  id="test_public_key"
                  value={testPublicKey}
                  onChange={(e) => setTestPublicKey(e.target.value)}
                  placeholder="pk_test_..."
                  className="mt-1 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm font-mono text-sm"
                  data-testid="test-public-key-input"
                />
              </div>
              <div>
                <Label htmlFor="test_secret_key" className="text-[#A0A0AB] text-xs">Test Secret Key</Label>
                <div className="relative">
                  <Input
                    id="test_secret_key"
                    type={showTestSecret ? 'text' : 'password'}
                    value={testSecretKey}
                    onChange={(e) => setTestSecretKey(e.target.value)}
                    placeholder={paySettings?.paystack_test_secret_key_masked || 'sk_test_...'}
                    className="mt-1 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm font-mono text-sm pr-10"
                    data-testid="test-secret-key-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTestSecret(!showTestSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0AB] hover:text-white transition-colors"
                  >
                    {showTestSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[#A0A0AB] text-xs mt-1">Leave blank to keep existing key</p>
              </div>
            </div>

            {/* Live Keys */}
            <div className="p-5 bg-[#1A1A20] border border-white/5 rounded-sm space-y-4">
              <h3 className="text-white text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                Live Keys
                <span className="text-[#F44336] text-[10px] font-normal uppercase tracking-widest">Production</span>
              </h3>
              <div>
                <Label htmlFor="live_public_key" className="text-[#A0A0AB] text-xs">Live Public Key</Label>
                <Input
                  id="live_public_key"
                  value={livePublicKey}
                  onChange={(e) => setLivePublicKey(e.target.value)}
                  placeholder="pk_live_..."
                  className="mt-1 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm font-mono text-sm"
                  data-testid="live-public-key-input"
                />
              </div>
              <div>
                <Label htmlFor="live_secret_key" className="text-[#A0A0AB] text-xs">Live Secret Key</Label>
                <div className="relative">
                  <Input
                    id="live_secret_key"
                    type={showLiveSecret ? 'text' : 'password'}
                    value={liveSecretKey}
                    onChange={(e) => setLiveSecretKey(e.target.value)}
                    placeholder={paySettings?.paystack_live_secret_key_masked || 'sk_live_...'}
                    className="mt-1 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm font-mono text-sm pr-10"
                    data-testid="live-secret-key-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLiveSecret(!showLiveSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0AB] hover:text-white transition-colors"
                  >
                    {showLiveSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[#A0A0AB] text-xs mt-1">Leave blank to keep existing key</p>
              </div>
            </div>

            {/* Webhook Secret */}
            <div>
              <Label htmlFor="webhook_secret" className="text-white text-sm font-medium">Webhook Secret (optional)</Label>
              <Input
                id="webhook_secret"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Paystack webhook secret (if different from secret key)"
                className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm font-mono text-sm"
                data-testid="webhook-secret-input"
              />
              <p className="text-[#A0A0AB] text-xs mt-2">Used for webhook signature verification. Defaults to the active secret key if not set.</p>
            </div>

            {/* Warning for Live Mode */}
            {payMode === 'live' && (
              <div className="flex items-start gap-3 p-4 bg-[#F44336]/5 border border-[#F44336]/20 rounded-sm">
                <AlertTriangle size={20} className="text-[#F44336] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[#F44336] text-sm font-bold">Live Mode Active</p>
                  <p className="text-[#A0A0AB] text-xs mt-1">Real money transactions will be processed. Ensure your live keys are correct before saving.</p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={payLoading}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide py-6 text-lg transition-transform duration-200 active:scale-95"
              data-testid="save-payment-settings-button"
            >
              {payLoading ? 'Saving...' : (
                <>
                  <Shield size={20} className="mr-2" />
                  Save Gateway Settings
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-[#1A1A20] border border-white/5 rounded-sm space-y-2">
            <p className="text-[#A0A0AB] text-sm">
              <strong className="text-white">Webhook URL:</strong>{' '}
              <code className="text-[#FF5722] bg-white/5 px-2 py-0.5 rounded text-xs">
                {BACKEND_ORIGIN}/api/payment/webhook
              </code>
            </p>
            <p className="text-[#A0A0AB] text-xs">
              Add this URL in your Paystack Dashboard under Settings &rarr; API Keys &amp; Webhooks &rarr; Webhook URL.
            </p>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="password" className="mt-6 outline-none">
        <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8">
          <div className="flex items-center gap-3 mb-2">
            <Lock size={22} className="text-[#FF5722]" />
            <h2 className="text-2xl font-black bebas uppercase tracking-tight text-white">Change Password</h2>
          </div>
          <p className="text-[#A0A0AB] text-sm mb-6">Update your admin account password. Minimum 8 characters required.</p>

          <form onSubmit={handlePasswordChange} className="space-y-5" data-testid="change-password-form">
            <div>
              <Label htmlFor="current_password" className="text-white text-sm font-medium">Current Password</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm pr-10"
                  data-testid="current-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0AB] hover:text-white transition-colors"
                >
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="new_password" className="text-white text-sm font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm pr-10"
                  data-testid="new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0AB] hover:text-white transition-colors"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm_password" className="text-white text-sm font-medium">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Re-enter new password"
                className="mt-2 bg-[#0F0F12] border-white/10 text-white focus:border-[#FF5722] focus:ring-1 focus:ring-[#FF5722] rounded-sm"
                data-testid="confirm-password-input"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[#F44336] text-xs mt-2">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide py-6 text-lg transition-transform duration-200 active:scale-95 disabled:opacity-50"
              data-testid="change-password-button"
            >
              {pwLoading ? 'Updating...' : (
                <>
                  <Lock size={20} className="mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminSettings;
