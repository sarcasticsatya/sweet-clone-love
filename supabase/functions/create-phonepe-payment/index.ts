import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get PhonePe OAuth access token
async function getPhonePeAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';
  
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');

  console.log('Requesting PhonePe access token...');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();
  console.log('Token response status:', response.status);

  if (!response.ok || !data.access_token) {
    console.error('Failed to get access token:', data);
    throw new Error(data.message || 'Failed to get PhonePe access token');
  }

  console.log('Access token obtained successfully, expires_at:', data.expires_at);
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse request body
    const { bundleId } = await req.json();
    if (!bundleId) {
      return new Response(
        JSON.stringify({ error: 'Bundle ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get bundle details
    const { data: bundle, error: bundleError } = await supabaseAdmin
      .from('course_bundles')
      .select('*')
      .eq('id', bundleId)
      .eq('is_active', true)
      .single();

    if (bundleError || !bundle) {
      console.error('Bundle error:', bundleError);
      return new Response(
        JSON.stringify({ error: 'Invalid bundle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Bundle found:', bundle.name, 'Price:', bundle.price_inr);

    // Generate unique merchant transaction ID
    const timestamp = Date.now();
    const merchantTransactionId = `NYTHIC_${timestamp}_${user.id.slice(0, 8)}`;

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + bundle.validity_days);

    // Create pending purchase record
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('student_purchases')
      .insert({
        student_id: user.id,
        bundle_id: bundleId,
        amount_paid: bundle.price_inr,
        payment_status: 'pending',
        payment_method: 'phonepe',
        payment_gateway: 'phonepe',
        phonepe_merchant_transaction_id: merchantTransactionId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Purchase creation error:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Failed to create purchase record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pending purchase created:', purchase.id);

    // PhonePe API credentials
    const clientId = Deno.env.get('PHONEPE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('PHONEPE_CLIENT_SECRET')!;

    if (!clientId || !clientSecret) {
      console.error('Missing PhonePe credentials');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth access token first
    let accessToken: string;
    try {
      accessToken = await getPhonePeAccessToken(clientId, clientSecret);
    } catch (tokenError) {
      console.error('Token error:', tokenError);
      
      // Update purchase as failed
      await supabaseAdmin
        .from('student_purchases')
        .update({ payment_status: 'failed' })
        .eq('id', purchase.id);

      return new Response(
        JSON.stringify({ 
          error: 'Payment initiation failed', 
          details: tokenError instanceof Error ? tokenError.message : 'Failed to authenticate with payment gateway'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Amount in paise (INR * 100)
    const amountInPaise = Math.round(bundle.price_inr * 100);

    // PhonePe Payment Request payload
    const paymentPayload = {
      merchantOrderId: merchantTransactionId,
      amount: amountInPaise,
      expireAfter: 1200, // 20 minutes
      metaInfo: {
        udf1: user.id,
        udf2: bundleId,
        udf3: bundle.name,
      },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Payment for ${bundle.name}`,
        merchantUrls: {
          redirectUrl: `https://nythicai.com/payment-status?merchantTransactionId=${merchantTransactionId}`,
        },
      },
    };

    console.log('PhonePe payload:', JSON.stringify(paymentPayload));

    // Call PhonePe API with OAuth token
    const phonepeUrl = 'https://api.phonepe.com/apis/pg/checkout/v2/pay';
    
    const phonepeResponse = await fetch(phonepeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const phonepeData = await phonepeResponse.json();
    console.log('PhonePe response status:', phonepeResponse.status);
    console.log('PhonePe response:', JSON.stringify(phonepeData));

    if (!phonepeResponse.ok || phonepeData.code !== 'SUCCESS') {
      console.error('PhonePe API error:', phonepeData);
      
      // Update purchase as failed
      await supabaseAdmin
        .from('student_purchases')
        .update({ payment_status: 'failed' })
        .eq('id', purchase.id);

      return new Response(
        JSON.stringify({ 
          error: 'Payment initiation failed', 
          details: phonepeData.message || 'Unknown error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update purchase with PhonePe transaction ID if provided
    if (phonepeData.orderId) {
      await supabaseAdmin
        .from('student_purchases')
        .update({ phonepe_transaction_id: phonepeData.orderId })
        .eq('id', purchase.id);
    }

    // Return redirect URL
    const redirectUrl = phonepeData.redirectUrl;
    console.log('Redirect URL:', redirectUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        redirectUrl,
        merchantTransactionId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
