import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Footer } from "@/components/Footer";

const PaymentStatus = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);
  const [checkCount, setCheckCount] = useState(0);

  const merchantTransactionId = searchParams.get('merchantTransactionId');
  const statusParam = searchParams.get('status');

  const checkPaymentStatus = useCallback(async () => {
    if (!merchantTransactionId) {
      // If no transaction ID, check status param from redirect
      if (statusParam === 'success') {
        setStatus('success');
      } else if (statusParam === 'failed') {
        setStatus('failed');
      } else {
        setStatus('failed');
      }
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check purchase status in database
      const { data: purchase, error } = await supabase
        .from('student_purchases')
        .select('*, course_bundles(name)')
        .eq('phonepe_merchant_transaction_id', merchantTransactionId)
        .eq('student_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching purchase:', error);
        setStatus('failed');
        return;
      }

      if (!purchase) {
        console.log('Purchase not found');
        setStatus('failed');
        return;
      }

      setPurchaseDetails(purchase);

      if (purchase.payment_status === 'completed') {
        setStatus('success');
      } else if (purchase.payment_status === 'failed') {
        setStatus('failed');
      } else {
        setStatus('pending');
        // Keep checking if still pending (webhook might be delayed)
        if (checkCount < 10) {
          setTimeout(() => {
            setCheckCount(prev => prev + 1);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('failed');
    }
  }, [merchantTransactionId, statusParam, navigate, checkCount]);

  useEffect(() => {
    checkPaymentStatus();
  }, [checkPaymentStatus]);

  const handleGoToDashboard = () => {
    navigate('/student');
  };

  const handleRetry = () => {
    navigate('/select-course');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            {status === 'loading' && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                </div>
                <CardTitle className="text-2xl">Verifying Payment</CardTitle>
                <CardDescription>
                  Please wait while we confirm your payment...
                </CardDescription>
              </>
            )}

            {status === 'pending' && (
              <>
                <div className="mx-auto mb-4">
                  <RefreshCw className="w-16 h-16 text-muted-foreground animate-spin" />
                </div>
                <CardTitle className="text-2xl">Payment Processing</CardTitle>
                <CardDescription>
                  Your payment is being processed. This may take a moment...
                </CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto mb-4">
                  <CheckCircle className="w-16 h-16 text-primary" />
                </div>
                <CardTitle className="text-2xl text-primary">Payment Successful!</CardTitle>
                <CardDescription>
                  Welcome to NythicAI. Your course is now active.
                </CardDescription>
              </>
            )}

            {status === 'failed' && (
              <>
                <div className="mx-auto mb-4">
                  <XCircle className="w-16 h-16 text-destructive" />
                </div>
                <CardTitle className="text-2xl text-destructive">Payment Failed</CardTitle>
                <CardDescription>
                  Unfortunately, your payment could not be processed.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {purchaseDetails && status === 'success' && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{purchaseDetails.course_bundles?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">₹{purchaseDetails.amount_paid?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs">{merchantTransactionId?.slice(0, 20)}...</span>
                </div>
              </div>
            )}

            {status === 'success' && (
              <Button className="w-full" size="lg" onClick={handleGoToDashboard}>
                Go to Dashboard
              </Button>
            )}

            {status === 'failed' && (
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={handleRetry}>
                  Try Again
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                  Go to Home
                </Button>
              </div>
            )}

            {(status === 'loading' || status === 'pending') && (
              <p className="text-center text-sm text-muted-foreground">
                Do not close this page or refresh.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer minimal />
    </div>
  );
};

export default PaymentStatus;
