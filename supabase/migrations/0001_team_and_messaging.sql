-- NOT APPLIED to the live project as of 4 Nov 2026 (docs/LEGAL_REVIEW.md §8).
-- Hardened 4 Nov before anyone does: policies gate on is_admin(), not merely
-- "signed in", because public sign-up lets anyone become signed in. Before
-- applying, turn off Supabase Auth → "Allow new users to sign up"
-- (team-invite still creates accounts). See docs/SECURITY.md.
-- Team profiles, messaging and file attachments.
--
-- Everything here is gated by row-level security, not by the UI. The client
-- decides what to draw; Postgres decides what exists. A forged client sees
-- nothing it is not a member of.
--
-- Apply with:  supabase db push
-- or paste into the SQL editor for project jjndhbyawnbohobjwzue.

-- ---------------------------------------------------------------- profiles --

-- One row per person with an account. `auth.users` is not readable from the
-- client, so this is the table the UI joins against for names and roles.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text        not null,
  full_name   text        not null default '',
  role        text        not null default 'founder',
  created_at  timestamptz not null default now(),
  constraint profiles_role_allowed check (role in ('owner', 'founder'))
);

alter table public.profiles enable row level security;

-- Team members (admins) see the team; everyone else sees only themselves.
-- "authenticated" is not "team": public sign-up creates an auth user for
-- anyone, and handle_new_user() gives them a profile row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_admin() or id = auth.uid());

-- You may edit your own name. Nobody may change their own role or email
-- (a rewritten email would let one account pose as another in the UI).
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles p where p.id = auth.uid())
    and email = (select email from public.profiles p where p.id = auth.uid())
  );

-- Admins may add and remove profiles.
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Give every existing and future auth user a profile automatically, so a
-- teammate created through the dashboard is usable the moment they confirm.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this migration.
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------- threads --

create table if not exists public.threads (
  id         uuid primary key default gen_random_uuid(),
  subject    text        not null default '',
  created_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thread_members (
  thread_id    uuid not null references public.threads (id) on delete cascade,
  user_id      uuid not null references auth.users (id)     on delete cascade,
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid        not null references public.threads (id) on delete cascade,
  sender_id  uuid        references auth.users (id) on delete set null,
  body       text        not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid        not null references public.messages (id) on delete cascade,
  path       text        not null,
  name       text        not null,
  size       bigint      not null default 0,
  mime       text        not null default '',
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_created_idx
  on public.messages (thread_id, created_at);
create index if not exists thread_members_user_idx
  on public.thread_members (user_id);
create index if not exists attachments_message_idx
  on public.attachments (message_id);

-- Membership test, SECURITY DEFINER so the policies below do not recurse:
-- a policy on thread_members that queries thread_members deadlocks on itself.
create or replace function public.is_thread_member(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.thread_members m
    where m.thread_id = target and m.user_id = auth.uid()
  );
$$;

grant execute on function public.is_thread_member(uuid) to authenticated;

alter table public.threads        enable row level security;
alter table public.thread_members enable row level security;
alter table public.messages       enable row level security;
alter table public.attachments    enable row level security;

-- Threads: members and the creator read; only team members (admins) start
-- one. Both founders are admins already: /admin itself needs is_admin().
-- The creator clause also lets the insert().select() in messages.ts return
-- the new row before the membership rows exist.
drop policy if exists threads_select on public.threads;
create policy threads_select on public.threads
  for select to authenticated using (public.is_thread_member(id) or created_by = auth.uid());

drop policy if exists threads_insert on public.threads;
create policy threads_insert on public.threads
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

drop policy if exists threads_update on public.threads;
create policy threads_update on public.threads
  for update to authenticated
  using (public.is_thread_member(id))
  with check (public.is_thread_member(id));

-- Membership rows: you see the ones for threads you are in, and only the
-- creator adds participants. Nobody adds themselves: with a self-join clause,
-- anyone who learned a thread's UUID could read it and its attachments.
drop policy if exists thread_members_select on public.thread_members;
create policy thread_members_select on public.thread_members
  for select to authenticated using (public.is_thread_member(thread_id));

drop policy if exists thread_members_insert on public.thread_members;
create policy thread_members_insert on public.thread_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.threads t
      where t.id = thread_id and t.created_by = auth.uid()
    )
  );

-- Your own read cursor is yours to move.
drop policy if exists thread_members_update_self on public.thread_members;
create policy thread_members_update_self on public.thread_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Messages: members read, members post as themselves, authors edit and delete
-- their own. Nobody edits someone else's words.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (public.is_thread_member(thread_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_thread_member(thread_id));

drop policy if exists messages_delete_own on public.messages;
create policy messages_delete_own on public.messages
  for delete to authenticated using (sender_id = auth.uid());

-- Attachments follow their message.
drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
  for select to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_thread_member(m.thread_id)
    )
  );

drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments
  for insert to authenticated with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id and m.sender_id = auth.uid()
    )
  );

-- Keep threads ordered by real activity rather than by creation.
create or replace function public.touch_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists on_message_touch_thread on public.messages;
create trigger on_message_touch_thread
  after insert on public.messages
  for each row execute function public.touch_thread();

-- --------------------------------------------------------------- realtime --

-- Live delivery. Without this the other founder only sees a message on reload.
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------- storage --

-- Private bucket. Attachments are reachable only through a signed URL issued
-- to someone who is already in the thread.
insert into storage.buckets (id, name, public, file_size_limit)
values ('message-files', 'message-files', false, 26214400)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- Objects are stored under <thread_id>/<uuid>-<filename>, so membership is
-- decided by the first path segment.
drop policy if exists message_files_read on storage.objects;
create policy message_files_read on storage.objects
  for select to authenticated using (
    bucket_id = 'message-files'
    and public.is_thread_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists message_files_write on storage.objects;
create policy message_files_write on storage.objects
  for insert to authenticated with check (
    bucket_id = 'message-files'
    and public.is_thread_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists message_files_delete on storage.objects;
create policy message_files_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'message-files'
    and owner = auth.uid()
  );
