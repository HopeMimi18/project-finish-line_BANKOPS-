-- System settings (break-glass etc.)
create table public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.system_settings enable row level security;

create policy "Anyone authenticated can read settings"
on public.system_settings for select to authenticated using (true);

create policy "Managers/admins can upsert settings"
on public.system_settings for insert to authenticated
with check (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create policy "Managers/admins can update settings"
on public.system_settings for update to authenticated
using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

insert into public.system_settings (key, value) values ('break_glass', '{"enabled": false}'::jsonb);

-- AI call logs (full prompt + response for forensic review)
create table public.ai_call_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  document_id uuid references public.documents(id) on delete set null,
  task text not null,
  model text,
  prompt_text text not null,
  response_text text,
  pii_findings jsonb default '[]'::jsonb,
  truncated boolean default false,
  status text not null default 'ok'
);

alter table public.ai_call_logs enable row level security;

create policy "Managers/admins can view ai logs"
on public.ai_call_logs for select to authenticated
using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create policy "Owner can view their own ai logs"
on public.ai_call_logs for select to authenticated
using (user_id = auth.uid());

create index ai_call_logs_user_idx on public.ai_call_logs(user_id, created_at desc);
create index ai_call_logs_doc_idx on public.ai_call_logs(document_id, created_at desc);