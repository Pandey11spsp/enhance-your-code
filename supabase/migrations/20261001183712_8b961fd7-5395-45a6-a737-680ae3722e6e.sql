create type public.app_role as enum ('super_admin','recruiter','candidate');
create type public.approval_status as enum ('pending','approved','rejected');
create type public.job_status as enum ('draft','published','closed','archived');
create type public.app_stage as enum ('applied','screening','shortlisted','interview_scheduled','interviewing','offer','hired','rejected','withdrawn');

create table public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  company text,
  approval approval_status not null default 'approved',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create or replace function public.is_approved_recruiter(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,'recruiter') and exists(select 1 from public.profiles where id=_user_id and approval='approved')
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'super_admin') or public.has_role(auth.uid(),'recruiter'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and approval = (select p.approval from public.profiles p where p.id = auth.uid()));
create policy "admin profile update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'super_admin'));
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null,
  title text not null,
  description text not null default '',
  department text,
  location text,
  workplace_type text not null default 'onsite',
  employment_type text not null default 'full_time',
  salary_min integer,
  salary_max integer,
  vacancies integer not null default 1,
  status job_status not null default 'published',
  closing_date date,
  created_at timestamptz not null default now()
);
grant select on public.jobs to anon;
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create policy "public published jobs" on public.jobs for select to anon, authenticated using (status = 'published');
create policy "recruiter own jobs read" on public.jobs for select to authenticated using (recruiter_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "recruiter insert jobs" on public.jobs for insert to authenticated with check (recruiter_id = auth.uid() and public.is_approved_recruiter(auth.uid()));
create policy "recruiter update jobs" on public.jobs for update to authenticated using (recruiter_id = auth.uid());
create policy "recruiter delete jobs" on public.jobs for delete to authenticated using (recruiter_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null,
  stage app_stage not null default 'applied',
  cover_letter text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, candidate_id)
);
grant select, insert, update on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "candidate own apps" on public.applications for select to authenticated using (
  candidate_id = auth.uid() or public.has_role(auth.uid(),'super_admin')
  or exists(select 1 from public.jobs j where j.id = job_id and j.recruiter_id = auth.uid()));
create policy "candidate apply" on public.applications for insert to authenticated with check (candidate_id = auth.uid() and public.has_role(auth.uid(),'candidate') and stage = 'applied');
create policy "recruiter move stage" on public.applications for update to authenticated using (
  exists(select 1 from public.jobs j where j.id = job_id and j.recruiter_id = auth.uid()));
create policy "candidate withdraw" on public.applications for update to authenticated using (candidate_id = auth.uid()) with check (candidate_id = auth.uid() and stage = 'withdrawn');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r app_role;
begin
  r := case when new.raw_user_meta_data->>'role' = 'recruiter' then 'recruiter'::app_role else 'candidate'::app_role end;
  insert into public.profiles(id,email,full_name,company,approval)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'company',
          case when r='recruiter' then 'pending'::approval_status else 'approved'::approval_status end);
  insert into public.user_roles(user_id, role) values (new.id, r);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();