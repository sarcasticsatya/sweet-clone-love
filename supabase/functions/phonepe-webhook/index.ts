import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Verify SHA256 Authorization (PhonePe sends SHA256 hash of username:password)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedUsername = Deno.env.get('PHONEPE_WEBHOOK_USERNAME');
    const expectedPassword = Deno.env.get('PHONEPE_WEBHOOK_PASSWORD');

    if (!expectedUsername || !expectedPassword) {
      console.error('Webhook credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate expected SHA256 hash of username:password
    const expectedHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${expectedUsername}:${expectedPassword}`)
    );
    const expectedHashHex = Array.from(new Uint8Array(expectedHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Expected hash:', expectedHashHex);
    console.log('Received auth header:', authHeader);

    if (authHeader !== expectedHashHex) {
      console.error('Authorization hash mismatch');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SHA256 Authorization verified');

    // Parse webhook payload
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    // Extract transaction details from PhonePe webhook
    const { event, payload: eventPayload } = payload;
    
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

    console.log('Event:', event);
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

    // Safety net: explicitly assign subjects if payment completed
    if (paymentStatus === 'completed') {
      console.log('Payment completed! Running explicit subject assignment as safety net...');
      
      try {
        // Get bundle medium from bundle name
        const { data: bundleData } = await supabase
          .from('course_bundles')
          .select('name')
          .eq('id', purchase.bundle_id)
          .single();

        if (bundleData) {
          let medium: string | null = null;
          if (bundleData.name.toLowerCase().includes('english')) medium = 'English';
          else if (bundleData.name.toLowerCase().includes('kannada')) medium = 'Kannada';

          if (medium) {
            // Get all subjects of that medium
            const { data: subjects } = await supabase
              .from('subjects')
              .select('id')
              .eq('medium', medium);

            if (subjects && subjects.length > 0) {
              // Insert access for each subject (ON CONFLICT DO NOTHING handled by unique constraint)
              for (const subject of subjects) {
                await supabase
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
        // Don't fail the webhook for this - trigger should also handle it
      }
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
