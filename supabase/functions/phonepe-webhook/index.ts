import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Webhook received');
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Verify Basic Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode Basic Auth credentials
    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    const expectedUsername = Deno.env.get('PHONEPE_WEBHOOK_USERNAME');
    const expectedPassword = Deno.env.get('PHONEPE_WEBHOOK_PASSWORD');

    if (username !== expectedUsername || password !== expectedPassword) {
      console.error('Invalid credentials');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Basic Auth verified');

    // Parse webhook payload
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    // Extract transaction details from PhonePe webhook
    const { type, payload: eventPayload } = payload;
    
    if (!eventPayload) {
      console.error('Missing event payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const merchantOrderId = eventPayload.merchantOrderId;
    const state = eventPayload.state;
    const phonepeOrderId = eventPayload.orderId;

    console.log('Event type:', type);
    console.log('Merchant Order ID:', merchantOrderId);
    console.log('State:', state);
    console.log('PhonePe Order ID:', phonepeOrderId);

    if (!merchantOrderId) {
      console.error('Missing merchant order ID');
      return new Response(
        JSON.stringify({ error: 'Missing merchant order ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('student_purchases')
      .select('*')
      .eq('phonepe_merchant_transaction_id', merchantOrderId)
      .single();

    if (purchaseError || !purchase) {
      console.error('Purchase not found:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Purchase not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found purchase:', purchase.id);

    // Determine payment status based on PhonePe state
    let paymentStatus = 'pending';
    if (state === 'COMPLETED') {
      paymentStatus = 'completed';
    } else if (state === 'FAILED') {
      paymentStatus = 'failed';
    } else if (state === 'PENDING') {
      paymentStatus = 'pending';
    }

    console.log('Updating payment status to:', paymentStatus);

    // Update purchase record
    const { error: updateError } = await supabase
      .from('student_purchases')
      .update({
        payment_status: paymentStatus,
        phonepe_transaction_id: phonepeOrderId || purchase.phonepe_transaction_id,
      })
      .eq('id', purchase.id);

    if (updateError) {
      console.error('Failed to update purchase:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update purchase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Purchase updated successfully');

    // If payment completed, the auto_assign_subjects_on_purchase trigger will handle granting access
    // We just need to make sure the purchase is marked as completed

    if (paymentStatus === 'completed') {
      console.log('Payment completed! Subject access will be granted by database trigger.');
    }

    return new Response(
      JSON.stringify({ success: true, status: paymentStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
