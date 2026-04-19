-- =====================================================
-- Classification tag (mirrors Streamlit roles for docs)
-- =====================================================
create type public.classification_tag as enum ('support', 'ops', 'compliance');

-- =====================================================
-- DOCUMENTS
-- =====================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  cid text not null unique,
  filename text not null,
  content_type text not null default 'text/plain',
  size_bytes bigint not null default 0,
  classification public.classification_tag not null,
  storage_path text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create index idx_documents_owner on public.documents(owner_id);
create index idx_documents_classification on public.documents(classification);

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.update_updated_at_column();

-- Helper: does user have access to the doc by classification matching their role?
create or replace function public.user_can_view_doc(_user_id uuid, _classification public.classification_tag)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role(_user_id, 'manager') or
    public.has_role(_user_id, 'admin') or
    case _classification
      when 'support' then public.has_role(_user_id, 'support')
      when 'ops' then public.has_role(_user_id, 'ops')
      when 'compliance' then public.has_role(_user_id, 'compliance')
    end
$$;

-- Documents RLS
create policy "Users can view docs they own or match classification"
on public.documents for select
to authenticated
using (
  owner_id = auth.uid()
  or public.user_can_view_doc(auth.uid(), classification)
);

create policy "Users can insert their own documents"
on public.documents for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owner or manager/admin can update documents"
on public.documents for update
to authenticated
using (
  owner_id = auth.uid()
  or public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'admin')
);

create policy "Owner or manager/admin can delete documents"
on public.documents for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'admin')
);

-- =====================================================
-- TOKENS (ephemeral access)
-- =====================================================
create table public.tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  scope_cid text not null,
  document_id uuid references public.documents(id) on delete cascade,
  permissions text[] not null default '{}',
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.tokens enable row level security;

create index idx_tokens_created_by on public.tokens(created_by);
create index idx_tokens_doc on public.tokens(document_id);
create index idx_tokens_token on public.tokens(token);

create policy "Users can view their own tokens"
on public.tokens for select
to authenticated
using (created_by = auth.uid());

create policy "Managers and admins can view all tokens"
on public.tokens for select
to authenticated
using (
  public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'admin')
);

create policy "Users can create tokens for docs they can view"
on public.tokens for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.documents d
    where d.id = document_id
      and (d.owner_id = auth.uid() or public.user_can_view_doc(auth.uid(), d.classification))
  )
);

create policy "Owner or manager/admin can revoke (update) tokens"
on public.tokens for update
to authenticated
using (
  created_by = auth.uid()
  or public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'admin')
);

-- =====================================================
-- AUDIT EVENTS (append-only, metadata-only)
-- =====================================================
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_cid text,
  document_id uuid references public.documents(id) on delete set null,
  result text not null default 'ok',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;

create index idx_audit_user on public.audit_events(user_id);
create index idx_audit_created on public.audit_events(created_at desc);

create policy "Users can insert audit events for themselves"
on public.audit_events for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can view their own audit events"
on public.audit_events for select
to authenticated
using (user_id = auth.uid());

create policy "Managers and admins can view all audit events"
on public.audit_events for select
to authenticated
using (
  public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'admin')
);

-- =====================================================
-- STORAGE BUCKET: documents (private)
-- =====================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage policies — path layout: <owner_user_id>/<filename>
create policy "Users can upload to their own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Owner or manager/admin can read documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(), 'manager')
    or public.has_role(auth.uid(), 'admin')
  )
);

create policy "Owner or manager/admin can delete documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role(auth.uid(), 'manager')
    or public.has_role(auth.uid(), 'admin')
  )
);