import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const { bundleId, couponCode } = await req.json();
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

    // Determine base price: use discount_price_inr if discount is active
    let basePrice = bundle.price_inr;
    if (bundle.discount_price_inr != null && bundle.discount_expires_at && new Date(bundle.discount_expires_at) > new Date()) {
      basePrice = bundle.discount_price_inr;
      console.log('Active discount applied, using discount price:', basePrice);
    }

    // Validate coupon if provided
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from('coupon_codes')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        return new Response(
          JSON.stringify({ error: 'Invalid coupon code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check expiry
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Coupon has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check usage limit
      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return new Response(
          JSON.stringify({ error: 'Coupon usage limit reached' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      discountAmount = Math.round(basePrice * coupon.discount_percent / 100);
      appliedCouponCode = coupon.code;

      // Increment used_count
      await supabaseAdmin
        .from('coupon_codes')
        .update({ used_count: coupon.used_count + 1 })
        .eq('id', coupon.id);

      console.log('Coupon applied:', coupon.code, 'Discount:', discountAmount);
    }

    const finalAmount = basePrice - discountAmount;

    // Generate unique merchant transaction ID
    const timestamp = Date.now();
    const merchantTransactionId = `NYTHIC_${timestamp}_${user.id.slice(0, 8)}`;

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + bundle.validity_days);

    // Check for existing pending or failed purchase for this user/bundle
    const { data: existingPurchase, error: fetchError } = await supabaseAdmin
      .from('student_purchases')
      .select('*')
      .eq('student_id', user.id)
      .eq('bundle_id', bundleId)
      .in('payment_status', ['pending', 'failed'])
      .order('purchased_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing purchase:', fetchError);
    }
    console.log('Existing purchase check result:', existingPurchase ? existingPurchase.id : 'none found');

    let purchase;

    if (existingPurchase) {
      // Reuse existing purchase - update with new transaction ID
      console.log('Found existing purchase to reuse:', existingPurchase.id);
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('student_purchases')
        .update({
          payment_status: 'pending',
          phonepe_merchant_transaction_id: merchantTransactionId,
          expires_at: expiresAt.toISOString(),
          amount_paid: finalAmount,
          coupon_code_applied: appliedCouponCode,
          discount_amount: discountAmount,
        })
        .eq('id', existingPurchase.id)
        .select()
        .single();

      if (updateError) {
        console.error('Purchase update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update purchase record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      purchase = updated;
      console.log('Reusing existing purchase:', purchase.id);
    } else {
      // Create new purchase record
      const { data: newPurchase, error: purchaseError } = await supabaseAdmin
        .from('student_purchases')
        .insert({
          student_id: user.id,
          bundle_id: bundleId,
          amount_paid: finalAmount,
          payment_status: 'pending',
          payment_method: 'phonepe',
          payment_gateway: 'phonepe',
          phonepe_merchant_transaction_id: merchantTransactionId,
          expires_at: expiresAt.toISOString(),
          coupon_code_applied: appliedCouponCode,
          discount_amount: discountAmount,
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
      purchase = newPurchase;
      console.log('New purchase created:', purchase.id);
    }

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
    const amountInPaise = Math.round(finalAmount * 100);

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

    // PhonePe v2 API returns state: "PENDING" with redirectUrl on success
    // Check for valid response: either state is PENDING/CREATED with redirectUrl, or there's an error
    const isValidResponse = phonepeResponse.ok && phonepeData.redirectUrl && 
      (phonepeData.state === 'PENDING' || phonepeData.state === 'CREATED');
    
    if (!isValidResponse) {
      console.error('PhonePe API error:', phonepeData);
      
      // Update purchase as failed
      await supabaseAdmin
        .from('student_purchases')
        .update({ payment_status: 'failed' })
        .eq('id', purchase.id);

      return new Response(
        JSON.stringify({ 
          error: 'Payment initiation failed', 
          details: phonepeData.message || phonepeData.code || 'Unknown error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Payment initiated successfully, state:', phonepeData.state);

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
