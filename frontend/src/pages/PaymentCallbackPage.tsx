// @ts-nocheck
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_URL } from '../apiConfig';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';

  useEffect(() => {
    if (authLoading) return;

    if (!reference) {
      setStatus('failed');
      setMessage('Invalid payment reference');
      return;
    }

    if (!token) {
      setStatus('failed');
      setMessage('Your session expired. Please sign in again, then open this page from your browser history or payment link if needed.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/payment/verify/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000
          }
        );
        if (cancelled) return;
        if (data.status === 'success') {
          setStatus('success');
          setMessage('Payment verified successfully!');
        } else {
          setStatus('failed');
          setMessage(data.message || 'Payment verification failed');
        }
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error)) {
          const st = error.response?.status;
          const detail = error.response?.data?.detail;
          const detailStr = typeof detail === 'string' ? detail : '';
          if (st === 403) {
            setMessage('You can only verify payments made from your own account.');
          } else if (st === 401) {
            setMessage('Session expired. Please sign in again.');
          } else if (detailStr) {
            setMessage(detailStr);
          } else {
            setMessage('Could not verify payment. Please try again or contact support.');
          }
        } else {
          setMessage('An error occurred during verification');
        }
        setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, token, reference]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="bg-[#0F0F12] border border-white/10 rounded-sm p-12 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <Loader2 size={64} className="text-[#FF5722] mx-auto mb-6 animate-spin" />
            <h1 className="text-3xl font-black bebas uppercase tracking-tight text-white mb-4">{message}</h1>
            <p className="text-[#A0A0AB]">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} className="text-[#4CAF50] mx-auto mb-6" data-testid="payment-success-icon" />
            <h1 className="text-3xl font-black bebas uppercase tracking-tight text-white mb-4">{message}</h1>
            <p className="text-[#A0A0AB] mb-8">Your membership is now active!</p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide transition-transform duration-200 active:scale-95"
              data-testid="go-to-dashboard-button"
            >
              Go to Dashboard
            </Button>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle size={64} className="text-[#F44336] mx-auto mb-6" data-testid="payment-failed-icon" />
            <h1 className="text-3xl font-black bebas uppercase tracking-tight text-white mb-4">Payment Failed</h1>
            <p className="text-[#A0A0AB] mb-8">{message}</p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-sm font-bold uppercase tracking-wide transition-transform duration-200 active:scale-95"
              data-testid="return-to-dashboard-button"
            >
              Return to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;
