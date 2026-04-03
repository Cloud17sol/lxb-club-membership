// @ts-nocheck
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut, User, CreditCard, History, Wallet, AlertCircle } from 'lucide-react';
import VirtualMembershipCard from '@/components/VirtualMembershipCard';
import { format } from 'date-fns';
import { API_URL } from '../apiConfig';

const MemberDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  
  // Separate loading states
  const [cardLoading, setCardLoading] = useState(true);
  const [duesLoading, setDuesLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  
  // Data states
  const [card, setCard] = useState<any>(null);
  const [dues, setDues] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Error states
  const [cardError, setCardError] = useState<string | null>(null);
  const [duesError, setDuesError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  
  // Payment flow states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [includePhysicalCard, setIncludePhysicalCard] = useState(false);
  const [gatewayConfigured, setGatewayConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetchCard();
    fetchDues();
    fetchPayments();
    fetchGatewayStatus();
  }, []);

  const fetchGatewayStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/payment-settings/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGatewayConfigured(data.is_configured);
      }
    } catch {
      // silently fail — gateway status is informational
    }
  };

  const fetchCard = async () => {
    setCardLoading(true);
    setCardError(null);
    try {
      console.log('[CARD] Fetching membership card...');
      const response = await fetch(`${API_URL}/membership-card`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[CARD] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CARD] Data received:', data);
        setCard(data);
      } else {
        const error = await response.text();
        console.error('[CARD] Error:', error);
        setCardError('Failed to load membership card');
      }
    } catch (error) {
      console.error('[CARD] Exception:', error);
      setCardError('Network error loading card');
    } finally {
      setCardLoading(false);
    }
  };

  const fetchDues = async () => {
    setDuesLoading(true);
    setDuesError(null);
    try {
      console.log('[DUES] Fetching dues settings...');
      const response = await fetch(`${API_URL}/dues`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[DUES] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DUES] Data received:', data);
        console.log('[DUES] Monthly amount:', data.monthly_amount);
        console.log('[DUES] Physical card amount:', data.physical_card_amount);
        setDues(data);
      } else {
        const error = await response.text();
        console.error('[DUES] Error:', error);
        setDuesError('Failed to load dues settings');
      }
    } catch (error) {
      console.error('[DUES] Exception:', error);
      setDuesError('Network error loading dues');
    } finally {
      setDuesLoading(false);
      console.log('[DUES] Loading complete');
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      console.log('[PAYMENTS] Fetching payment history...');
      const response = await fetch(`${API_URL}/payment/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[PAYMENTS] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[PAYMENTS] Data received:', data.length, 'payments');
        setPayments(data);
      } else {
        const error = await response.text();
        console.error('[PAYMENTS] Error:', error);
        setPaymentsError('Failed to load payments');
      }
    } catch (error) {
      console.error('[PAYMENTS] Exception:', error);
      setPaymentsError('Network error loading payments');
    } finally {
      setPaymentsLoading(false);
    }
  };

const handlePayDues = async () => {
  setPaymentLoading(true);
  try {
    const callbackUrl = `${window.location.origin}/payment/callback`;
    // axios avoids fetch interception (e.g. dev overlays) that postMessage Request objects and throw.
    const { data } = await axios.post(
      `${API_URL}/payment/initialize`,
      {
        callback_url: callbackUrl,
        include_physical_card: includePhysicalCard
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!data?.authorization_url) {
      throw new Error(data?.detail || data?.message || 'Payment initialization failed');
    }

    window.location.href = data.authorization_url;
  } catch (error: any) {
    let message = 'Failed to initialize payment';
    if (axios.isAxiosError(error)) {
      const d = error.response?.data?.detail ?? error.response?.data?.message;
      message = typeof d === 'string' ? d : !error.response ? 'Unable to connect. Please try again.' : message;
    } else if (error?.message) {
      message = error.message;
    }
    toast.error(message);
    setPaymentLoading(false);
  }
};

  const lastPayment = payments.find(p => p.status === 'success');
  const hasActiveMembership = card?.status === 'active';

  // Calculate total payment amount
  const totalAmount = dues 
    ? dues.monthly_amount + (includePhysicalCard ? (dues.physical_card_amount || 0) : 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="bg-[#050505] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/lxb-logo.jpg" alt="LXB Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-2xl font-black bebas tracking-tight text-white">League of Xtraordinary Ballers</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#A0A0AB] text-sm hidden md:block">{user?.full_name}</span>
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
              data-testid="profile-button"
            >
              <User size={18} />
            </Button>
            <Button
              onClick={logout}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 hover:text-white rounded-sm"
              data-testid="logout-button"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Membership Card */}
          <div data-testid="membership-card-section">
            <h2 className="text-2xl font-black bebas uppercase tracking-tight text-white mb-6">Your Membership Card</h2>
            {cardLoading ? (
              <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8 text-center">
                <p className="text-[#A0A0AB]">Loading card...</p>
              </div>
            ) : cardError ? (
              <div className="bg-[#0F0F12] border border-red-900/20 rounded-sm p-8 text-center">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <p className="text-red-400 mb-4">{cardError}</p>
                <Button onClick={fetchCard} className="bg-[#FF5722] hover:bg-[#E64A19]">
                  Retry
                </Button>
              </div>
            ) : card ? (
              <VirtualMembershipCard
                fullName={card.full_name}
                membershipId={card.membership_id}
                status={card.status}
                activeMonth={card.active_month}
                activeYear={card.active_year}
                profileImageUrl={card.profile_image_url}
              />
            ) : (
              <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-8 text-center">
                <p className="text-[#A0A0AB]">Card not found</p>
              </div>
            )}
          </div>

          {/* Right: Payment section */}
          <div className="space-y-6">
            {/* Dues amount - ALWAYS SHOW */}
            <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6" data-testid="dues-info-section">
              <div className="flex items-center gap-3 mb-4">
                <Wallet size={24} className="text-[#FF5722]" />
                <h3 className="text-xl font-black bebas uppercase tracking-tight text-white">Monthly Dues</h3>
              </div>
              
              {duesLoading ? (
                <div className="py-4">
                  <p className="text-[#A0A0AB]">Loading dues information...</p>
                </div>
              ) : duesError ? (
                <div className="py-4">
                  <AlertCircle size={32} className="text-red-500 mb-2" />
                  <p className="text-red-400 mb-4">{duesError}</p>
                  <Button onClick={fetchDues} size="sm" className="bg-[#FF5722] hover:bg-[#E64A19]">
                    Retry
                  </Button>
                </div>
              ) : dues ? (
                <>
                  <div className="text-4xl font-black bebas text-white mb-2">
                    ₦{dues.monthly_amount?.toLocaleString() || '0'}
                  </div>
                  <p className="text-[#A0A0AB] text-sm mb-4">Monthly membership dues</p>
                  
                  {/* Physical ID Card Option - Only show if not already paid */}
                  {!hasActiveMembership && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={includePhysicalCard}
                          onChange={(e) => setIncludePhysicalCard(e.target.checked)}
                          className="mt-1 w-4 h-4 text-[#FF5722] bg-[#0F0F12] border-white/20 rounded focus:ring-[#FF5722] focus:ring-2"
                          data-testid="physical-card-checkbox"
                        />
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium group-hover:text-[#FF5722] transition-colors">
                            Add Physical ID Card
                          </div>
                          <div className="text-[#A0A0AB] text-xs mt-1">
                            +₦{dues.physical_card_amount?.toLocaleString() || '0'} (one-time)
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                  
                  {/* Total Amount - Only show when checkbox is checked */}
                  {includePhysicalCard && !hasActiveMembership && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-[#A0A0AB] text-sm">Total Amount:</span>
                        <span className="text-2xl font-black bebas text-[#FF5722]">
                          ₦{totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[#A0A0AB]">No dues information available</p>
              )}
            </div>

            {/* Pay button */}
            {gatewayConfigured === false && (
              <div className="flex items-center gap-3 p-4 bg-[#FF5722]/5 border border-[#FF5722]/20 rounded-sm">
                <AlertCircle size={18} className="text-[#FF5722] shrink-0" />
                <p className="text-[#A0A0AB] text-sm">Payment gateway is running in demo mode. Contact an admin to configure Paystack keys.</p>
              </div>
            )}
            <Button
              onClick={handlePayDues}
              disabled={paymentLoading || !dues || hasActiveMembership}
              className="w-full bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide py-6 text-lg transition-transform duration-200 active:scale-95"
              data-testid="pay-dues-button"
            >
              {paymentLoading ? 'Processing...' : hasActiveMembership ? (
                <>
                  <CreditCard size={20} className="mr-2" />
                  Already Paid This Month
                </>
              ) : (
                <>
                  <CreditCard size={20} className="mr-2" />
                  Pay Now
                </>
              )}
            </Button>

            {/* Last payment info */}
            {lastPayment && (
              <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6" data-testid="last-payment-section">
                <div className="flex items-center gap-3 mb-4">
                  <History size={20} className="text-[#4CAF50]" />
                  <h3 className="text-lg font-black bebas uppercase tracking-tight text-white">Last Payment</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#A0A0AB] text-sm">Amount:</span>
                    <span className="text-white font-bold">₦{lastPayment.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0AB] text-sm">Date:</span>
                    <span className="text-white font-bold">
                      {lastPayment.paid_at ? format(new Date(lastPayment.paid_at), 'MMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A0A0AB] text-sm">Status:</span>
                    <span className="text-[#4CAF50] font-bold uppercase text-xs">Paid</span>
                  </div>
                  {lastPayment.include_physical_card && (
                    <div className="flex justify-between pt-2 border-t border-white/10">
                      <span className="text-[#A0A0AB] text-sm">Physical ID Card:</span>
                      <span className="text-[#FF5722] font-bold uppercase text-xs">Included</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment history */}
            {payments.length > 0 && (
              <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6" data-testid="payment-history-section">
                <h3 className="text-lg font-black bebas uppercase tracking-tight text-white mb-4">Payment History</h3>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-white text-sm font-medium">
                          {format(new Date(`${payment.year}-${payment.month}-01`), 'MMMM yyyy')}
                        </div>
                        <div className="text-[#A0A0AB] text-xs">₦{payment.amount.toLocaleString()}</div>
                      </div>
                      <div className={`text-xs font-bold uppercase ${payment.status === 'success' ? 'text-[#4CAF50]' : payment.status === 'pending' ? 'text-[#FFC107]' : 'text-[#F44336]'}`}>
                        {payment.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-6" data-testid="club-updates-section">
              <h3 className="text-lg font-black bebas uppercase tracking-tight text-white mb-4">
                Club Updates
              </h3>

              <div className="mb-6">
                <p className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-3">
                  Announcements
                </p>

                <div className="space-y-3">
                  <div className="border-b border-white/5 pb-3 last:border-0">
                    <div className="text-white text-sm font-medium">
                      Training this Saturday
                    </div>
                    <div className="text-[#A0A0AB] text-xs mt-1">
                      8:00 AM • National Stadium
                    </div>
                    <div className="text-[#A0A0AB] text-xs mt-2">
                      All members should come with jerseys and water bottles.
                    </div>
                  </div>

                  <div className="border-b border-white/5 pb-3 last:border-0">
                    <div className="text-white text-sm font-medium">
                      Membership Renewal Reminder
                    </div>
                    <div className="text-[#A0A0AB] text-xs mt-1">
                      Deadline • Apr 30, 2026
                    </div>
                    <div className="text-[#A0A0AB] text-xs mt-2">
                      Please complete your monthly dues before the end of the month.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[#A0A0AB] text-xs uppercase tracking-[0.2em] mb-3">
                  Upcoming Events
                </p>

                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b border-white/5 pb-3 last:border-0">
                    <div>
                      <div className="text-white text-sm font-medium">
                        Friendly Match
                      </div>
                      <div className="text-[#A0A0AB] text-xs mt-1">
                        Apr 12, 2026 • 4:00 PM
                      </div>
                      <div className="text-[#FF5722] text-xs mt-2">
                        Teslim Balogun Stadium
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between border-b border-white/5 pb-3 last:border-0">
                    <div>
                      <div className="text-white text-sm font-medium">
                        Team Practice
                      </div>
                      <div className="text-[#A0A0AB] text-xs mt-1">
                        Apr 14, 2026 • 7:00 AM
                      </div>
                      <div className="text-[#FF5722] text-xs mt-2">
                        Indoor Sports Hall
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemberDashboard;
