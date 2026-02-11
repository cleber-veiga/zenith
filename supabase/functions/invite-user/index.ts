import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const inviteRedirectUrl =
    Deno.env.get('INVITE_REDIRECT_URL') || Deno.env.get('SUPABASE_SITE_URL') || undefined;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env vars' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '').trim();

  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !authData?.user) {
    return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: superUser, error: superError } = await supabaseAdmin
    .from('super_users')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (superError) {
    return new Response(JSON.stringify({ error: superError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const isSuperUser = Boolean(superUser?.user_id);

  let payload: {
    email?: string;
    role?: 'manager' | 'executor' | 'viewer';
    workspaceIds?: string[];
    projectIds?: string[];
  };

  try {
    payload = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const email = payload.email?.trim();
  const role = payload.role ?? 'executor';
  const workspaceIds = Array.from(new Set(payload.workspaceIds ?? []));
  const projectIds = Array.from(new Set(payload.projectIds ?? []));

  if (!isSuperUser) {
    if (!workspaceIds.length && !projectIds.length) {
      return new Response(JSON.stringify({ error: 'Workspace or project is required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (workspaceIds.length) {
      // 1. Check ownership
      const { data: ownedWorkspaces, error: ownedError } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .in('id', workspaceIds)
        .eq('created_by', authData.user.id);

      if (ownedError) {
        return new Response(JSON.stringify({ error: ownedError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const ownedIds = new Set(ownedWorkspaces?.map((w) => w.id) || []);
      const remainingIds = workspaceIds.filter((id) => !ownedIds.has(id));

      // 2. Check manager role for remaining workspaces
      if (remainingIds.length) {
        const { data: managedWorkspaces, error: managedError } = await supabaseAdmin
          .from('workspace_members')
          .select('workspace_id')
          .in('workspace_id', remainingIds)
          .eq('user_id', authData.user.id)
          .eq('role', 'manager');

        if (managedError) {
          return new Response(JSON.stringify({ error: managedError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const managedIds = new Set(managedWorkspaces?.map((w) => w.workspace_id) || []);
        const forbiddenIds = remainingIds.filter((id) => !managedIds.has(id));

        if (forbiddenIds.length) {
          return new Response(
            JSON.stringify({
              error: 'Forbidden: You must be an owner or manager to invite users.'
            }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }

    if (projectIds.length) {
      // 1. Check ownership
      const { data: ownedProjects, error: ownedError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .in('id', projectIds)
        .eq('created_by', authData.user.id);

      if (ownedError) {
        return new Response(JSON.stringify({ error: ownedError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const ownedIds = new Set(ownedProjects?.map((p) => p.id) || []);
      const remainingIds = projectIds.filter((id) => !ownedIds.has(id));

      // 2. Check manager role for remaining projects
      if (remainingIds.length) {
        const { data: managedProjects, error: managedError } = await supabaseAdmin
          .from('project_members')
          .select('project_id')
          .in('project_id', remainingIds)
          .eq('user_id', authData.user.id)
          .eq('role', 'manager');

        if (managedError) {
          return new Response(JSON.stringify({ error: managedError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const managedIds = new Set(managedProjects?.map((p) => p.project_id) || []);
        const forbiddenIds = remainingIds.filter((id) => !managedIds.has(id));

        if (forbiddenIds.length) {
          return new Response(
            JSON.stringify({
              error: 'Forbidden: You must be an owner or manager to invite users.'
            }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }
  }

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!['manager', 'executor', 'viewer'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Invalid role' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteRedirectUrl
    });

  if (inviteError || !inviteData?.user) {
    return new Response(JSON.stringify({ error: inviteError?.message || 'Invite failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const invitedUserId = inviteData.user.id;

  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .upsert(
      {
        user_id: invitedUserId,
        role,
        password_set: false,
        email
      },
      { onConflict: 'user_id' }
    );

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (workspaceIds.length) {
    const { error: workspaceError } = await supabaseAdmin.from('workspace_members').upsert(
      workspaceIds.map((workspaceId) => ({
        workspace_id: workspaceId,
        user_id: invitedUserId,
        role
      })),
      { onConflict: 'workspace_id,user_id' }
    );

    if (workspaceError) {
      return new Response(JSON.stringify({ error: workspaceError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (projectIds.length) {
    const { error: projectError } = await supabaseAdmin.from('project_members').upsert(
      projectIds.map((projectId) => ({
        project_id: projectId,
        user_id: invitedUserId,
        role
      })),
      { onConflict: 'project_id,user_id' }
    );

    if (projectError) {
      return new Response(JSON.stringify({ error: projectError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      userId: invitedUserId
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
});
