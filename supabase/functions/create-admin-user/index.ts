import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const adminEmail = 'admin@nythicai.com';
    const adminPassword = 'AdminNythicAI';

    // Check if admin user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

    if (existingAdmin) {
      // Update password if user exists
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAdmin.id,
        { password: adminPassword, email_confirm: true }
      );

      if (updateError) {
        throw updateError;
      }

      // Ensure admin role exists
      await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: existingAdmin.id, role: 'admin' }, { onConflict: 'user_id,role' });

      return new Response(
        JSON.stringify({ success: true, message: 'Admin user updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (createError) {
      throw createError;
    }

    // Assign admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'admin' });

    if (roleError) {
      throw roleError;
    }

    // Remove student role if it was auto-assigned by trigger
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', newUser.user.id)
      .eq('role', 'student');

    return new Response(
      JSON.stringify({ success: true, message: 'Admin user created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
