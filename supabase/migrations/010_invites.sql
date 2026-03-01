-- ── 010: Invites Table ──
-- Token-based invite system for workspace and document sharing.
-- Supports email invites with expiration and role assignment.

create table public.invites (
  id uuid default gen_random_uuid() primary key,
  token text not null unique,
  email text not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  invited_by uuid not null references users(id),
  role text not null default 'editor',
  used_at timestamp with time zone,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Indexes for fast lookups
create index idx_invites_token on public.invites using btree(token);
create index idx_invites_email on public.invites using btree(email);
create index idx_invites_workspace on public.invites using btree(workspace_id);

-- Row Level Security
alter table invites enable row level security;

-- Anyone can view invites by token (needed for acceptance page)
create policy "Invites are viewable by token"
  on invites for select
  using (true);

-- Authenticated users who are workspace members can create invites
create policy "Invites are creatable by workspace members"
  on invites for insert
  to authenticated
  with check (
    exists (
      select 1 from users
      where users.auth_id = auth.uid()
      and exists (
        select 1 from workspace_members
        where workspace_members.user_id = users.id
        and workspace_members.workspace_id = invites.workspace_id
      )
    )
  );

-- Authenticated users can update invites (mark as used)
create policy "Invites are updatable by authenticated users"
  on invites for update
  to authenticated
  using (true)
  with check (true);
