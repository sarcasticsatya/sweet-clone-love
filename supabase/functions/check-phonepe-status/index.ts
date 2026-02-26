import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getPhonePeAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    console.error('Failed to get access token:', data);
    throw new Error(data.message || 'Failed to get PhonePe access token');
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { merchantTransactionId } = await req.json();
    if (!merchantTransactionId) {
      return new Response(
        JSON.stringify({ error: 'merchantTransactionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking status for:', merchantTransactionId, 'user:', user.id);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First check DB - if already completed/failed, return immediately
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('student_purchases')
      .select('*, course_bundles(name)')
      .eq('phonepe_merchant_transaction_id', merchantTransactionId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (purchaseError || !purchase) {
      console.error('Purchase not found:', purchaseError);
      return new Response(
        JSON.stringify({ status: 'failed', error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already resolved, return current status
    if (purchase.payment_status === 'completed' || purchase.payment_status === 'failed') {
      console.log('Already resolved:', purchase.payment_status);
      return new Response(
        JSON.stringify({ status: purchase.payment_status, purchase }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Still pending - check with PhonePe directly
    const clientId = Deno.env.get('PHONEPE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('PHONEPE_CLIENT_SECRET')!;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ status: 'pending', error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getPhonePeAccessToken(clientId, clientSecret);

    const statusUrl = `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantTransactionId}/status`;
    console.log('Calling PhonePe status API:', statusUrl);

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`,
      },
    });

    const statusData = await statusResponse.json();
    console.log('PhonePe status response:', JSON.stringify(statusData));

    const phonepeState = statusData.state;
    let newStatus = 'pending';

    if (phonepeState === 'COMPLETED') {
      newStatus = 'completed';
    } else if (phonepeState === 'FAILED') {
      newStatus = 'failed';
    }

    // Update DB if status changed
    if (newStatus !== 'pending') {
      console.log('Updating payment status to:', newStatus);
      const { error: updateError } = await supabaseAdmin
        .from('student_purchases')
        .update({
          payment_status: newStatus,
          phonepe_transaction_id: statusData.orderId || purchase.phonepe_transaction_id,
        })
        .eq('id', purchase.id);

      if (updateError) {
        console.error('Failed to update purchase:', updateError);
      }

      // Safety net: manually assign subjects if completed
      if (newStatus === 'completed') {
        console.log('Payment completed - running subject assignment safety net');
        try {
          const { data: bundleData } = await supabaseAdmin
            .from('course_bundles')
            .select('name')
            .eq('id', purchase.bundle_id)
            .single();

          if (bundleData) {
            let medium: string | null = null;
            if (bundleData.name.toLowerCase().includes('english')) medium = 'English';
            else if (bundleData.name.toLowerCase().includes('kannada')) medium = 'Kannada';

            if (medium) {
              const { data: subjects } = await supabaseAdmin
                .from('subjects')
                .select('id')
                .eq('medium', medium);

              if (subjects && subjects.length > 0) {
                for (const subject of subjects) {
                  await supabaseAdmin
                    .from('student_subject_access')
                    .upsert(
                      { student_id: purchase.student_id, subject_id: subject.id },
                      { onConflict: 'student_id,subject_id', ignoreDuplicates: true }
                    );
                }
                console.log(`Assigned ${subjects.length} subjects to student ${purchase.student_id}`);
              }
            }
          }
        } catch (assignError) {
          console.error('Subject assignment safety net error:', assignError);
        }
      }
    }

    // Refetch purchase for response
    const { data: updatedPurchase } = await supabaseAdmin
      .from('student_purchases')
      .select('*, course_bundles(name)')
      .eq('id', purchase.id)
      .single();

    return new Response(
      JSON.stringify({ status: newStatus, purchase: updatedPurchase }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ status: 'failed', error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
