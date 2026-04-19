
-- 1. Clients table
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "Authenticated can view clients"
  on public.clients for select to authenticated using (true);

create policy "Managers/admins can insert clients"
  on public.clients for insert to authenticated
  with check (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create policy "Managers/admins can update clients"
  on public.clients for update to authenticated
  using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create policy "Managers/admins can delete clients"
  on public.clients for delete to authenticated
  using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create trigger update_clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at_column();

-- 2. Client assignments
create table public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

alter table public.client_assignments enable row level security;

create policy "Users can view their own assignments"
  on public.client_assignments for select to authenticated
  using (user_id = auth.uid());

create policy "Managers/admins can view all assignments"
  on public.client_assignments for select to authenticated
  using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create policy "Managers/admins can insert assignments"
  on public.client_assignments for insert to authenticated
  with check (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

create policy "Managers/admins can delete assignments"
  on public.client_assignments for delete to authenticated
  using (public.has_role(auth.uid(), 'manager') or public.has_role(auth.uid(), 'admin'));

-- 3. client_id on documents
alter table public.documents
  add column client_id uuid references public.clients(id) on delete set null;

create index idx_documents_client_id on public.documents(client_id);

-- 4. New helper: is the user assigned to this client?
create or replace function public.user_assigned_to_client(_user_id uuid, _client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.client_assignments
    where user_id = _user_id and client_id = _client_id
  );
$$;

-- 5. Updated visibility helper — must satisfy classification AND (no client OR assigned-or-privileged)
create or replace function public.user_can_view_doc_v2(
  _user_id uuid,
  _classification classification_tag,
  _client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Classification gate
    (
      public.has_role(_user_id, 'manager') or
      public.has_role(_user_id, 'admin') or
      case _classification
        when 'support' then public.has_role(_user_id, 'support')
        when 'ops' then public.has_role(_user_id, 'ops')
        when 'compliance' then public.has_role(_user_id, 'compliance')
      end
    )
    and
    -- Client gate (only enforced if client_id is set)
    (
      _client_id is null
      or public.has_role(_user_id, 'manager')
      or public.has_role(_user_id, 'admin')
      or public.user_assigned_to_client(_user_id, _client_id)
    );
$$;

-- 6. Replace documents SELECT policy
drop policy if exists "Users can view docs they own or match classification" on public.documents;

create policy "Users can view docs they own or have access"
  on public.documents for select to authenticated
  using (
    owner_id = auth.uid()
    or public.user_can_view_doc_v2(auth.uid(), classification, client_id)
  );

-- 7. Helpful index for anomaly queries on audit_events
create index if not exists idx_audit_events_user_created
  on public.audit_events(user_id, created_at desc);
create index if not exists idx_audit_events_action_created
  on public.audit_events(action, created_at desc);
