import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const extractOutputText = (payload: any): string | null => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) return null;

  const chunks: string[] = [];
  for (const item of payload.output) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        chunks.push(content.text.trim());
      }
    }
  }
  return chunks.length ? chunks.join('\n').trim() : null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  const openAiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const mailFrom = Deno.env.get('MAIL_FROM') || 'Zenith <onboarding@resend.dev>';

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase env vars' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '').trim();
  if (!jwt) return jsonResponse({ error: 'Missing authorization token' }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !authData?.user) return jsonResponse({ error: 'Invalid auth token' }, 401);

  let payload: {
    generateOnly?: boolean;
    workspaceId?: string;
    projectId?: string | null;
    workspaceName?: string;
    recipientEmail?: string;
    dayStart?: string;
    dayEnd?: string;
    debug?: boolean;
    dashboardPdfBase64?: string;
    dashboardPdfFileName?: string;
  };

  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const workspaceId = payload.workspaceId?.trim();
  const projectId = payload.projectId?.trim() || null;
  const generateOnly = Boolean(payload.generateOnly);
  const workspaceName = payload.workspaceName?.trim() || 'Workspace';
  const recipientEmail = payload.recipientEmail?.trim();
  const dayStart = payload.dayStart?.trim();
  const dayEnd = payload.dayEnd?.trim();
  const debug = Boolean(payload.debug);
  const dashboardPdfBase64 = payload.dashboardPdfBase64?.trim();
  const dashboardPdfFileName = payload.dashboardPdfFileName?.trim() || 'dashboard.pdf';

  if (!workspaceId) return jsonResponse({ error: 'workspaceId is required' }, 400);
  if (!dayStart || !dayEnd) return jsonResponse({ error: 'dayStart/dayEnd are required' }, 400);
  if (!generateOnly && !recipientEmail) return jsonResponse({ error: 'recipientEmail is required' }, 400);
  if (!generateOnly && !dashboardPdfBase64) {
    return jsonResponse({ error: 'dashboardPdfBase64 is required' }, 400);
  }

  const [{ data: superUser }, { data: workspace, error: workspaceError }] =
    await Promise.all([
      supabaseAdmin.from('super_users').select('user_id').eq('user_id', authData.user.id).maybeSingle(),
      supabaseAdmin.from('workspaces').select('id, created_by').eq('id', workspaceId).maybeSingle()
    ]);

  if (workspaceError || !workspace) return jsonResponse({ error: 'Workspace not found' }, 404);
  const isSuperUser = Boolean(superUser?.user_id);

  const { data: workspaceMembership } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authData.user.id)
    .maybeSingle();

  const isWorkspaceOwner = workspace.created_by === authData.user.id;
  const hasWorkspaceAccess = Boolean(workspaceMembership);
  if (!isSuperUser && !isWorkspaceOwner && !hasWorkspaceAccess) {
    return jsonResponse({ error: 'Not authorized for this workspace' }, 403);
  }

  let projectIds: string[] = [];
  if (projectId) {
    const { data: selectedProject, error: selectedProjectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (selectedProjectError || !selectedProject) {
      return jsonResponse({ error: 'Project not found in workspace' }, 400);
    }
    projectIds = [selectedProject.id];
  } else {
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId);
    if (projectsError) return jsonResponse({ error: projectsError.message }, 500);
    projectIds = (projects ?? []).map((project) => project.id);
  }

  if (!projectIds.length) {
    return jsonResponse({ error: 'No projects found for selected scope' }, 400);
  }

  interface Task {
    id: string;
    name: string | null;
    description: string | null;
    status: string | null;
    priority: string | null;
    project_id: string;
  }

  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('project_tasks')
    .select('id, name, description, status, priority, project_id')
    .in('project_id', projectIds);

  if (tasksError) return jsonResponse({ error: tasksError.message }, 500);
  const taskList = (tasks ?? []) as unknown as Task[];
  const taskById = new Map<string, Task>(taskList.map((task) => [task.id, task]));
  const taskIds = taskList.map((task) => task.id);

  const [timeResult, dueResult, auditResult] = await Promise.all([
    taskIds.length
      ? supabaseAdmin
          .from('project_task_time_entries')
          .select(
            'id, task_id, created_by, created_at, started_at, ended_at, duration_minutes, note, source'
          )
          .in('task_id', taskIds)
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? supabaseAdmin
          .from('project_task_due_date_changes')
          .select('id, task_id, changed_by, created_at, previous_date, new_date, reason')
          .in('task_id', taskIds)
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    taskIds.length
      ? supabaseAdmin
          .from('project_task_audit_logs')
          .select('id, task_id, changed_by, created_at, field, old_value, new_value')
          .in('task_id', taskIds)
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (timeResult.error || dueResult.error || auditResult.error) {
    return jsonResponse(
      { error: timeResult.error?.message || dueResult.error?.message || auditResult.error?.message },
      500
    );
  }

  const timeEntries = timeResult.data ?? [];
  const dueChanges = dueResult.data ?? [];
  const auditLogs = auditResult.data ?? [];

  const actorIds = Array.from(
    new Set([
      ...timeEntries.map((item) => item.created_by),
      ...dueChanges.map((item) => item.changed_by),
      ...auditLogs.map((item) => item.changed_by)
    ].filter(Boolean))
  );

  let actorMap = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await supabaseAdmin.rpc('get_profiles_with_email', {
      user_ids: actorIds
    });
    actorMap = new Map(
      (profiles ?? []).map((item: { user_id: string; full_name?: string | null; email?: string | null }) => [
        item.user_id,
        item.full_name || item.email || item.user_id
      ])
    );
  }

  const statusCounts = new Map<string, number>();
  taskList.forEach((task) => {
    const key = task.status || 'Sem status';
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
  });

  const allChanges = [
    ...auditLogs.map((item) => ({
      createdAt: item.created_at,
      line: `[${item.created_at}] AUDITORIA | ${actorMap.get(item.changed_by) ?? item.changed_by ?? '-'} | ${
        taskById.get(item.task_id)?.name || taskById.get(item.task_id)?.description || item.task_id
      } | ${item.field}: ${item.old_value ?? '-'} -> ${item.new_value ?? '-'}`
    })),
    ...dueChanges.map((item) => ({
      createdAt: item.created_at,
      line: `[${item.created_at}] PRAZO | ${actorMap.get(item.changed_by) ?? item.changed_by ?? '-'} | ${
        taskById.get(item.task_id)?.name || taskById.get(item.task_id)?.description || item.task_id
      } | ${item.previous_date ?? '-'} -> ${item.new_date ?? '-'} | motivo: ${item.reason ?? '-'}`
    })),
    ...timeEntries.map((item) => ({
      createdAt: item.created_at,
      line: `[${item.created_at}] TEMPO | ${actorMap.get(item.created_by) ?? item.created_by ?? '-'} | ${
        taskById.get(item.task_id)?.name || taskById.get(item.task_id)?.description || item.task_id
      } | ${item.duration_minutes ?? 0} min (${item.source}) | ${item.note ?? '-'}`
    }))
  ]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((item) => item.line);

  const statusSummary = Array.from(statusCounts.entries())
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ');

  let aiAttempted = false;
  let aiSucceeded = false;
  let aiStatus: number | null = null;
  let aiError: string | null = null;

  if (!openAiApiKey) {
    console.error('❌ Missing OPENAI_API_KEY environment variable');
    return jsonResponse({ error: 'Missing OPENAI_API_KEY' }, 500);
  } else {
    console.log(`🔑 OPENAI_API_KEY present (starts with: ${openAiApiKey.substring(0, 7)}...)`);
  }

  let summaryText = '';
  
  const mentionedTaskIds = new Set([
    ...timeEntries.map(t => t.task_id),
    ...dueChanges.map(d => d.task_id),
    ...auditLogs.map(a => a.task_id)
  ]);

  const stalledTasks = taskList
    .filter(t => !mentionedTaskIds.has(t.id) && t.status !== 'Concluído' && t.status !== 'Cancelado' && t.status !== 'Backlog')
    .map(t => `- [${t.status}] ${t.name} (${t.priority})`)
    .slice(0, 15); // Limit to 15 to save tokens

  const prompt = [
    `Atue como um assistente de Gerenciamento de Projetos. Analise os dados do workspace "${workspaceName}" entre ${dayStart} e ${dayEnd}.`,
    '',
    `DADOS GERAIS:`,
    `- Total de tarefas no escopo: ${taskList.length}`,
    `- Snapshot de Status: ${statusSummary || 'Sem dados'}`,
    `- Volume de interações: ${allChanges.length}`,
    '',
    `INSTRUÇÕES (PT-BR):`,
    `Gere um resumo direto e objetivo em Markdown, sem formalidades excessivas ou opiniões.`,
    `IMPORTANTE: A resposta deve ser estritamente formatada em Markdown (use negrito, listas, etc).`,
    `O resumo deve conter:`,
    `1. Como foi o dia (visão geral).`,
    `2. Quais tarefas foram concluídas (se houver).`,
    `3. Quantas tarefas ainda estão em aberto e um breve panorama do status delas.`,
    '',
    `LOGS DE ATIVIDADE (Contexto):`,
    allChanges.slice(-200).join('\n')
  ].join('\n');

  console.log('🤖 Preparing to send request to OpenAI...');
  console.log(`Model: ${openAiModel}`);
  console.log(`Prompt length: ${prompt.length} characters`);

  try {
    aiAttempted = true;
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: openAiModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um(a) assistente de Gerente de Projetos muito prestativo(a).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.5
      })
    });

    aiStatus = aiResponse.status;
    console.log(`📡 OpenAI Response Status: ${aiResponse.status} ${aiResponse.statusText}`);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      aiError = `OpenAI API Error: ${errorText}`;
      console.error(`❌ OpenAI Error Body: ${errorText}`);
      return jsonResponse({ error: `OpenAI API Error: ${errorText}` }, 500);
    }

    const aiPayload = await aiResponse.json();
    const aiText = aiPayload.choices?.[0]?.message?.content?.trim();
    
    if (!aiText) {
      aiError = 'OpenAI returned empty response';
      console.error('❌ OpenAI returned empty content');
      return jsonResponse({ error: 'OpenAI returned empty response' }, 500);
    }
    
    console.log('✅ OpenAI summary generated successfully');
    summaryText = aiText;
    aiSucceeded = true;
  } catch (error) {
    aiError = 'AI generation failed';
    console.error('❌ AI generation exception:', error);
    return jsonResponse({ error: `AI generation failed: ${error}` }, 500);
  }

  if (generateOnly) {
    return jsonResponse({
      ok: true,
      summaryText,
      totalChanges: allChanges.length,
      generatedWithAI: Boolean(openAiApiKey),
      ...(debug
        ? {
            debug: {
              openAiKeyPresent: Boolean(openAiApiKey),
              openAiModel,
              promptLength: prompt.length,
              aiAttempted,
              aiSucceeded,
              aiStatus,
              aiError,
              taskCount: taskList.length,
              timeEntries: timeEntries.length,
              dueChanges: dueChanges.length,
              auditLogs: auditLogs.length
            }
          }
        : {})
    });
  }

  if (!resendApiKey) return jsonResponse({ error: 'Missing RESEND_API_KEY' }, 500);

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 10px;">Resumo diário de tarefas</h2>
      <p style="margin: 0 0 16px;"><strong>Workspace:</strong> ${escapeHtml(workspaceName)}</p>
      <pre style="white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">${escapeHtml(summaryText)}</pre>
      <p style="margin-top: 16px; font-size: 12px; color: #475569;">
        Mudanças consideradas no período: ${escapeHtml(dayStart)} até ${escapeHtml(dayEnd)}.
      </p>
    </div>
  `;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [recipientEmail],
      subject: `Resumo diário - ${workspaceName} - ${new Date(dayStart).toLocaleDateString('pt-BR')}`,
      html,
      attachments: [
        {
          filename: dashboardPdfFileName,
          content: dashboardPdfBase64,
          type: 'application/pdf'
        }
      ]
    })
  });

  if (!resendResponse.ok) {
    const errorPayload = await resendResponse.text();
    return jsonResponse({ error: `Failed to send email: ${errorPayload}` }, 500);
  }

  return jsonResponse({
    ok: true,
    recipientEmail,
    totalChanges: allChanges.length
  });
});
