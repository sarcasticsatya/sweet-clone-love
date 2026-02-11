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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callerId = claimsData.claims.sub;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find orphaned students: in profiles + user_roles(student) but NOT in student_profiles
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name');

    const { data: studentProfiles } = await supabaseAdmin
      .from('student_profiles')
      .select('user_id');

    const { data: studentRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'student');

    if (!allProfiles || !studentProfiles || !studentRoles) {
      throw new Error('Failed to query tables');
    }

    const studentProfileUserIds = new Set(studentProfiles.map(sp => sp.user_id));
    const studentRoleUserIds = new Set(studentRoles.map(sr => sr.user_id));

    // Orphans: have student role, but no student_profiles entry, and not the caller
    const orphanIds = allProfiles
      .filter(p => studentRoleUserIds.has(p.id) && !studentProfileUserIds.has(p.id) && p.id !== callerId)
      .map(p => p.id);

    console.log(`Found ${orphanIds.length} orphaned student accounts to delete`);

    const tables = [
      { table: 'chat_messages', column: 'student_id' },
      { table: 'quiz_attempts', column: 'student_id' },
      { table: 'student_activity_logs', column: 'student_id' },
      { table: 'student_subject_access', column: 'student_id' },
      { table: 'student_purchases', column: 'student_id' },
      { table: 'user_roles', column: 'user_id' },
      { table: 'profiles', column: 'id' },
    ];

    let deletedCount = 0;
    const errors: string[] = [];

    for (const userId of orphanIds) {
      try {
        for (const { table, column } of tables) {
          await supabaseAdmin.from(table).delete().eq(column, userId);
        }

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          errors.push(`Auth delete failed for ${userId}: ${authError.message}`);
        } else {
          deletedCount++;
        }
      } catch (e) {
        errors.push(`Failed for ${userId}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    console.log(`Deleted ${deletedCount}/${orphanIds.length} orphaned accounts`);

    return new Response(
      JSON.stringify({ success: true, deletedCount, totalFound: orphanIds.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
