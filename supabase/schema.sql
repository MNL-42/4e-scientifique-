-- SCIENCE 4 : schéma initial Supabase
-- Exécuter dans SQL Editor après avoir choisi le projet cible.
create extension if not exists pgcrypto;

create table if not exists public.class_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 90),
 requested_teacher boolean not null default false,
 role text not null default 'student' check (role in ('student','teacher','admin')),
 teacher_status text not null default 'none' check (teacher_status in ('none','pending','approved','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.class_messages (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.class_profiles(id) on delete cascade,
 display_name text not null, channel text not null default 'Général' check (channel in ('Général','Mathématiques','Physique','Chimie','Biologie','Informatique','EXETAT')),
 body text not null check (char_length(body) between 1 and 1000), created_at timestamptz not null default now()
);
create table if not exists public.sos_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.class_profiles(id) on delete cascade,
 display_name text not null, subject text not null, topic text not null check (char_length(topic) between 2 and 160),
 body text not null check (char_length(body) between 2 and 2000),
 status text not null default 'open' check (status in ('open','answered','closed')), created_at timestamptz not null default now()
);
create table if not exists public.class_assignments (
 id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.class_profiles(id),
 subject text not null, title text not null check (char_length(title) between 2 and 160),
 description text not null check (char_length(description) between 2 and 5000), due_at date, created_at timestamptz not null default now()
);
create table if not exists public.class_resources (
 id uuid primary key default gen_random_uuid(), title text not null, subject text not null, chapter text not null default '',
 file_path text not null, uploaded_by uuid not null references public.class_profiles(id),
 published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.exam_practice_questions (
 id uuid primary key default gen_random_uuid(), subject text not null, topic text not null, prompt text not null,
 choices jsonb not null default '[]'::jsonb, answer_key text not null, explanation text not null,
 source_note text not null default 'Exercice original de préparation — non extrait d’un sujet officiel.',
 published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.class_announcements (
 id uuid primary key default gen_random_uuid(), title text not null, body text not null, source_url text,
 published_at timestamptz not null default now(), created_by uuid references public.class_profiles(id)
);


-- Le nom affiché est toujours relu depuis le profil lié au compte.
create or replace function public.science4_set_message_identity()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.user_id := (select auth.uid());
  new.display_name := (select display_name from public.class_profiles where id=(select auth.uid()));
  return new;
end;
$$;
drop trigger if exists science4_message_identity on public.class_messages;
create trigger science4_message_identity before insert on public.class_messages
for each row execute function public.science4_set_message_identity();
drop trigger if exists science4_sos_identity on public.sos_requests;
create trigger science4_sos_identity before insert on public.sos_requests
for each row execute function public.science4_set_message_identity();

alter table public.class_profiles enable row level security;
alter table public.class_messages enable row level security;
alter table public.sos_requests enable row level security;
alter table public.class_assignments enable row level security;
alter table public.class_resources enable row level security;
alter table public.exam_practice_questions enable row level security;
alter table public.class_announcements enable row level security;

drop policy if exists "profiles readable by class" on public.class_profiles;
create policy "profiles readable by class" on public.class_profiles for select to authenticated using (true);
drop policy if exists "members create own profile" on public.class_profiles;
create policy "members create own profile" on public.class_profiles for insert to authenticated with check (id=(select auth.uid()) and role='student' and teacher_status='none');
drop policy if exists "members update own profile" on public.class_profiles;
create policy "members update own profile" on public.class_profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
grant select on public.class_profiles to authenticated;
grant insert (id,display_name,requested_teacher) on public.class_profiles to authenticated;
grant update (display_name,requested_teacher,updated_at) on public.class_profiles to authenticated;

drop policy if exists "class members read messages" on public.class_messages;
create policy "class members read messages" on public.class_messages for select to authenticated using (true);
drop policy if exists "members send own messages" on public.class_messages;
create policy "members send own messages" on public.class_messages for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.class_profiles p where p.id=(select auth.uid())));
drop policy if exists "class members read sos" on public.sos_requests;
create policy "class members read sos" on public.sos_requests for select to authenticated using (true);
drop policy if exists "members create own sos" on public.sos_requests;
create policy "members create own sos" on public.sos_requests for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.class_profiles p where p.id=(select auth.uid())));
drop policy if exists "owner close own sos" on public.sos_requests;
create policy "owner close own sos" on public.sos_requests for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists "class members read assignments" on public.class_assignments;
create policy "class members read assignments" on public.class_assignments for select to authenticated using (true);
drop policy if exists "approved teachers publish assignments" on public.class_assignments;
create policy "approved teachers publish assignments" on public.class_assignments for insert to authenticated with check (teacher_id=(select auth.uid()) and exists(select 1 from public.class_profiles p where p.id=(select auth.uid()) and p.role in ('teacher','admin') and (p.role='admin' or p.teacher_status='approved')));

drop policy if exists "class members read published resources" on public.class_resources;
create policy "class members read published resources" on public.class_resources for select to authenticated using (published=true or uploaded_by=(select auth.uid()));
drop policy if exists "approved teachers add resources" on public.class_resources;
create policy "approved teachers add resources" on public.class_resources for insert to authenticated with check (uploaded_by=(select auth.uid()) and exists(select 1 from public.class_profiles p where p.id=(select auth.uid()) and p.role in ('teacher','admin') and (p.role='admin' or p.teacher_status='approved')));

drop policy if exists "members read published practice" on public.exam_practice_questions;
create policy "members read published practice" on public.exam_practice_questions for select to authenticated using (published=true);
drop policy if exists "teachers manage practice" on public.exam_practice_questions;
create policy "teachers manage practice" on public.exam_practice_questions for insert to authenticated with check (exists(select 1 from public.class_profiles p where p.id=(select auth.uid()) and p.role in ('teacher','admin') and (p.role='admin' or p.teacher_status='approved')));

drop policy if exists "members read announcements" on public.class_announcements;
create policy "members read announcements" on public.class_announcements for select to authenticated using (true);
drop policy if exists "teachers publish announcements" on public.class_announcements;
create policy "teachers publish announcements" on public.class_announcements for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.class_profiles p where p.id=(select auth.uid()) and p.role in ('teacher','admin') and (p.role='admin' or p.teacher_status='approved')));

grant select,insert on public.class_messages to authenticated;
grant select,insert,update on public.sos_requests to authenticated;
grant select,insert on public.class_assignments to authenticated;
grant select,insert on public.class_resources to authenticated;
grant select,insert on public.exam_practice_questions to authenticated;
grant select,insert on public.class_announcements to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('science4-documents','science4-documents',false,52428800,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "class reads published files" on storage.objects;
create policy "class reads published files" on storage.objects for select to authenticated using (bucket_id='science4-documents');
drop policy if exists "approved teachers upload files" on storage.objects;
create policy "approved teachers upload files" on storage.objects for insert to authenticated with check (bucket_id='science4-documents' and exists(select 1 from public.class_profiles p where p.id=(select auth.uid()) and p.role in ('teacher','admin') and (p.role='admin' or p.teacher_status='approved')));

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='class_messages') then alter publication supabase_realtime add table public.class_messages; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sos_requests') then alter publication supabase_realtime add table public.sos_requests; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='class_assignments') then alter publication supabase_realtime add table public.class_assignments; end if;
end $$;

-- Extension SCIENCE 4 : réponses au SOS et photos jointes
alter table public.sos_requests add column if not exists image_path text;

create table if not exists public.sos_replies (
 id uuid primary key default gen_random_uuid(),
 sos_id uuid not null references public.sos_requests(id) on delete cascade,
 user_id uuid not null references public.class_profiles(id) on delete cascade,
 display_name text not null,
 body text not null check (char_length(body) between 1 and 1200),
 created_at timestamptz not null default now()
);
alter table public.sos_replies enable row level security;
drop policy if exists "class reads sos replies" on public.sos_replies;
create policy "class reads sos replies" on public.sos_replies for select to authenticated using (true);
drop policy if exists "members reply to sos" on public.sos_replies;
create policy "members reply to sos" on public.sos_replies for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.class_profiles p where p.id=(select auth.uid())));
grant select,insert on public.sos_replies to authenticated;

drop trigger if exists science4_sos_reply_identity on public.sos_replies;
create trigger science4_sos_reply_identity before insert on public.sos_replies
for each row execute function public.science4_set_message_identity();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('science4-sos-images','science4-sos-images',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "members upload own sos images" on storage.objects;
create policy "members upload own sos images" on storage.objects for insert to authenticated
with check (bucket_id='science4-sos-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "class reads sos images" on storage.objects;
create policy "class reads sos images" on storage.objects for select to authenticated
using (bucket_id='science4-sos-images');

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sos_replies') then
   alter publication supabase_realtime add table public.sos_replies;
 end if;
end $$;
