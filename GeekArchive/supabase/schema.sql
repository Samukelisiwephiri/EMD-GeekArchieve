-- Geek Archive Supabase schema. Run in the Supabase SQL editor before deploying.
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('youth', 'organization', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.prototypes (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  aliases text[] not null default '{}',
  summary text not null default '',
  description text not null default '',
  repo_url text,
  tech_stack text[] not null default '{}',
  completion_pct integer,
  missing_modules text[] not null default '{}',
  domain text,
  suggested_price numeric(10, 2),
  price_currency text not null default 'ZAR',
  is_illustrative boolean not null default false,
  included_tailoring text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

alter table public.prototypes add column if not exists slug text;
alter table public.prototypes add column if not exists aliases text[] not null default '{}';
alter table public.prototypes add column if not exists summary text not null default '';
alter table public.prototypes add column if not exists description text not null default '';
alter table public.prototypes add column if not exists suggested_price numeric(10, 2);
alter table public.prototypes add column if not exists price_currency text not null default 'ZAR';
alter table public.prototypes add column if not exists is_illustrative boolean not null default false;
alter table public.prototypes add column if not exists included_tailoring text[] not null default '{}';
alter table public.prototypes add column if not exists active boolean not null default true;
alter table public.prototypes add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.prototypes alter column completion_pct drop default;
create unique index if not exists prototypes_slug_key on public.prototypes(slug);
create index if not exists prototypes_active_idx on public.prototypes(active);

create table if not exists public.problem_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.profiles(id) on delete cascade,
  org_type text not null,
  raw_brief text not null,
  translated_spec text,
  embedding vector(768),
  created_at timestamptz not null default now()
);

alter table public.problem_briefs
  add column if not exists organization_id uuid references public.profiles(id) on delete cascade;

create table if not exists public.youth_pods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.profiles(id) on delete cascade,
  prototype_id uuid references public.prototypes(id) on delete set null,
  brief_id uuid references public.problem_briefs(id) on delete set null,
  stage text not null default 'Pod matching in progress',
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  stakeholder_signed_off boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.youth_pods
  add column if not exists organization_id uuid references public.profiles(id) on delete cascade;
create index if not exists youth_pods_organization_idx on public.youth_pods(organization_id);

create table if not exists public.talent_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('Developer', 'UI/UX Designer', 'Business Student')),
  skills text[] not null default '{}',
  portfolio_url text not null,
  availability text not null,
  preferred_focus text,
  strength_area text,
  experience_level text not null default 'Student / Junior',
  location text,
  available_for_match boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.youth_pod_members (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.youth_pods(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Developer', 'UI/UX Designer', 'Business Student')),
  task text not null,
  created_at timestamptz not null default now(),
  unique (pod_id, role),
  unique (pod_id, user_id)
);

create index if not exists youth_pod_members_user_idx on public.youth_pod_members(user_id);

insert into public.prototypes
  (slug, title, aliases, summary, description, tech_stack, domain, is_illustrative,
   completion_pct, suggested_price, included_tailoring)
values
  (
    'imbewu-learn',
    'Imbewu Learn',
    '{}',
    'AI-powered learning that preserves Indigenous knowledge across generations.',
    'Imbewu Learn is an AI-powered educational platform designed to preserve indigenous and generational knowledge and make it accessible to younger generations. The platform enables knowledge holders to digitally contribute cultural knowledge, while Imbewu Ask allows users to ask questions about traditions, languages, cultural practices and everyday indigenous knowledge. The platform aims to provide culturally relevant responses based on the user''s cultural background and context. By combining AI with community-driven knowledge preservation, Imbewu Learn creates an interactive bridge between generations and helps ensure valuable African knowledge is not lost. Its vision is to grow from South Africa to a broader African platform for preserving, discovering and learning from indigenous knowledge.',
    array['AI'],
    'Education & Indigenous Knowledge',
    false,
    null,
    null,
    '{}'
  ),
  (
    'reka-loka',
    'RekaLoka',
    array['Reka Local'],
    'An inclusive local marketplace that helps vendors grow and sell independently.',
    'RekaLoka is an inclusive, vendor-first digital marketplace that connects local vendors, informal traders, home growers and customers through one platform for buying and selling products and services. Its main purpose is to empower entrepreneurs with disabilities, particularly visually impaired business owners, by giving them accessible tools to manage and grow their businesses independently.',
    '{}',
    'Inclusive Local Commerce',
    false,
    null,
    null,
    '{}'
  ),
  (
    'hlokomela-ai',
    'Hlokomela AI',
    '{}',
    'Civic infrastructure monitoring that connects community reports, AI, and IoT sensors.',
    'Hlokomela AI is an AI-powered civic infrastructure platform that connects communities, municipalities and IoT devices in one system. Community members can report infrastructure problems through a digital platform, while AI assists with analysing and categorising reports, including images, to help identify potential issues and prioritise them. Its IoT component uses physical sensors connected to an ESP32 to monitor infrastructure conditions and send real-time readings to a dashboard. Municipalities can view community reports and sensor data through a dedicated dashboard, allowing them to identify issues, monitor infrastructure and respond more efficiently. The platform creates a continuous feedback loop: communities report problems, AI helps interpret the information, IoT devices provide real-time data, and municipalities use the combined information to make informed decisions and take action. It can expand to additional municipalities and infrastructure use cases as the business grows.',
    array['AI', 'IoT', 'ESP32'],
    'Civic Infrastructure & IoT',
    false,
    null,
    null,
    '{}'
  ),
  (
    'inkanini-rs485',
    'Inkanini RS485',
    '{}',
    'An industrial OT intrusion-detection firewall with live RS485 bus monitoring.',
    'Inkanini RS485 is an industrial operational technology (OT) intrusion detection firewall and RS485 bus telemetry monitoring system built by Team Embedded Intelligence for HackSecure 2026. It protects industrial RS485 serial communication lines and perimeter/sensor nodes from unauthorized write attacks and physical line faults, pairing hardware-level isolation with a live web monitoring dashboard.',
    array['RS485', 'OT security', 'Web dashboard'],
    'Industrial OT Security & Telemetry',
    false,
    null,
    null,
    '{}'
  ),
  (
    'example-kasi-ledger',
    'KasiLedger',
    '{}',
    'An illustrative mobile stock and customer-credit tracker for neighborhood shops.',
    'Illustrative example concept: a mobile-friendly tool for a neighborhood shop to record stock, sales, and customer credit in one place. This sample package shows how an existing project could be tailored for a local business.',
    '{}',
    'SMME Commerce & Local Retail',
    true,
    70,
    14500,
    array['Low-data stock and credit flows', 'Custom product and category list', 'Shop handover and usage guide']
  ),
  (
    'example-ubuntu-aid',
    'UbuntuAid',
    '{}',
    'An illustrative grant and voucher hub for community organizations.',
    'Illustrative example concept: a community platform for collecting grant applications, tracking voucher status, and preparing a simple impact summary for an NGO or community organization.',
    '{}',
    'NGO & Social Impact',
    true,
    62,
    18500,
    array['Organization-specific application fields', 'Grant and voucher status dashboard', 'Simple impact export']
  ),
  (
    'example-mzansi-fleet',
    'MzansiFleet',
    '{}',
    'An illustrative trip and route log for a local taxi or delivery operator.',
    'Illustrative example concept: a simple operations tool for logging routes and trips, tracking fuel costs, and helping a small taxi or delivery team review its daily activity.',
    '{}',
    'Logistics & Mobility',
    true,
    55,
    21000,
    array['Driver-friendly route and trip log', 'Fuel and trip-cost summary', 'Team handover checklist']
  )
on conflict (slug) do update set
  title = excluded.title,
  aliases = excluded.aliases,
  summary = excluded.summary,
  description = excluded.description,
  tech_stack = excluded.tech_stack,
  domain = excluded.domain,
  is_illustrative = excluded.is_illustrative,
  completion_pct = excluded.completion_pct,
  suggested_price = excluded.suggested_price,
  included_tailoring = excluded.included_tailoring,
  active = true;

create or replace function public.get_current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_pod_member(p_pod_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.youth_pod_members
    where pod_id = p_pod_id and user_id = p_user_id
  );
$$;

create or replace function public.has_assigned_prototype(p_prototype_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.youth_pod_members m
    join public.youth_pods p on p.id = m.pod_id
    where p.prototype_id = p_prototype_id and m.user_id = p_user_id
  );
$$;

create or replace function public.is_matched_talent(p_user_id uuid, p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.youth_pod_members m
    join public.youth_pods p on p.id = m.pod_id
    where m.user_id = p_user_id and p.organization_id = p_organization_id
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Member'), '@', 1)),
    case when requested_role = 'organization' then 'organization' else 'youth' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.prototypes enable row level security;
alter table public.problem_briefs enable row level security;
alter table public.youth_pods enable row level security;
alter table public.talent_profiles enable row level security;
alter table public.youth_pod_members enable row level security;

drop policy if exists profiles_read_self_or_matched on public.profiles;
create policy profiles_read_self_or_matched on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      public.get_current_profile_role() in ('organization', 'admin')
      and public.is_matched_talent(profiles.id, auth.uid())
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists prototypes_read_role_scoped on public.prototypes;
create policy prototypes_read_role_scoped on public.prototypes
  for select to authenticated
  using (
    active
    and (
      public.get_current_profile_role() in ('organization', 'admin')
      or public.has_assigned_prototype(prototypes.id, auth.uid())
    )
  );

drop policy if exists prototypes_insert_organization on public.prototypes;
create policy prototypes_insert_organization on public.prototypes
  for insert to authenticated
  with check (
    public.get_current_profile_role() in ('organization', 'admin')
    and created_by = auth.uid()
  );

drop policy if exists prototypes_update_owner on public.prototypes;
create policy prototypes_update_owner on public.prototypes
  for update to authenticated
  using (
    public.get_current_profile_role() = 'admin'
    or (public.get_current_profile_role() = 'organization' and created_by = auth.uid())
  )
  with check (
    public.get_current_profile_role() = 'admin'
    or (public.get_current_profile_role() = 'organization' and created_by = auth.uid())
  );

drop policy if exists prototypes_delete_owner on public.prototypes;
create policy prototypes_delete_owner on public.prototypes
  for delete to authenticated
  using (
    public.get_current_profile_role() = 'admin'
    or (public.get_current_profile_role() = 'organization' and created_by = auth.uid())
  );

drop policy if exists problem_briefs_read_owner on public.problem_briefs;
create policy problem_briefs_read_owner on public.problem_briefs
  for select to authenticated
  using (
    public.get_current_profile_role() in ('organization', 'admin')
    and organization_id = auth.uid()
  );

drop policy if exists problem_briefs_insert_owner on public.problem_briefs;
create policy problem_briefs_insert_owner on public.problem_briefs
  for insert to authenticated
  with check (
    public.get_current_profile_role() = 'organization'
    and organization_id = auth.uid()
  );

drop policy if exists youth_pods_read_participant on public.youth_pods;
create policy youth_pods_read_participant on public.youth_pods
  for select to authenticated
  using (
    organization_id = auth.uid()
    or public.is_pod_member(youth_pods.id, auth.uid())
  );

drop policy if exists youth_pods_update_organization on public.youth_pods;
create policy youth_pods_update_organization on public.youth_pods
  for update to authenticated
  using (
    organization_id = auth.uid()
    and public.get_current_profile_role() = 'organization'
  )
  with check (
    organization_id = auth.uid()
    and public.get_current_profile_role() = 'organization'
  );

drop policy if exists talent_profiles_read_owner_or_matched on public.talent_profiles;
create policy talent_profiles_read_owner_or_matched on public.talent_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      public.get_current_profile_role() in ('organization', 'admin')
      and public.is_matched_talent(talent_profiles.user_id, auth.uid())
    )
  );

drop policy if exists talent_profiles_insert_self on public.talent_profiles;
create policy talent_profiles_insert_self on public.talent_profiles
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.get_current_profile_role() = 'youth'
  );

drop policy if exists talent_profiles_update_self on public.talent_profiles;
create policy talent_profiles_update_self on public.talent_profiles
  for update to authenticated
  using (
    user_id = auth.uid()
    and public.get_current_profile_role() = 'youth'
  )
  with check (
    user_id = auth.uid()
    and public.get_current_profile_role() = 'youth'
  );

drop policy if exists pod_members_read_participant on public.youth_pod_members;
create policy pod_members_read_participant on public.youth_pod_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.youth_pods p
      where p.id = youth_pod_members.pod_id
        and p.organization_id = auth.uid()
    )
  );

create or replace function public.request_youth_pod(
  p_org_type text,
  p_raw_brief text,
  p_prototype_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  organization_uuid uuid := auth.uid();
  brief_uuid uuid;
  pod_uuid uuid;
  candidate_uuid uuid;
  role_task record;
  members_json jsonb;
begin
  if organization_uuid is null
    or public.get_current_profile_role() <> 'organization' then
    raise exception 'Only an SMME/NGO account can request a pod';
  end if;

  if length(trim(coalesce(p_raw_brief, ''))) < 10 then
    raise exception 'Please provide at least 10 characters describing the need';
  end if;

  if not exists (
    select 1 from public.prototypes
    where id = p_prototype_id and active
  ) then
    raise exception 'The selected project is not available';
  end if;

  insert into public.problem_briefs (organization_id, org_type, raw_brief, translated_spec)
  values (organization_uuid, p_org_type, trim(p_raw_brief), trim(p_raw_brief))
  returning id into brief_uuid;

  insert into public.youth_pods (organization_id, prototype_id, brief_id, stage)
  values (
    organization_uuid,
    p_prototype_id,
    brief_uuid,
    'Pod matching in progress'
  )
  returning id into pod_uuid;

  for role_task in
    select * from (values
      ('Developer', 'Complete core development work and validate the build'),
      ('UI/UX Designer', 'Shape and test accessible user workflows'),
      ('Business Student', 'Prepare a practical rollout and handover plan')
    ) as roles(role, task)
  loop
    select tp.user_id
    into candidate_uuid
    from public.talent_profiles tp
    where tp.role = role_task.role
      and tp.available_for_match
    order by
      ts_rank(
        to_tsvector(
          'simple',
          array_to_string(tp.skills, ' ') || ' ' ||
          coalesce(tp.preferred_focus, '') || ' ' ||
          coalesce(tp.strength_area, '')
        ),
        plainto_tsquery('simple', p_raw_brief)
      ) desc,
      tp.updated_at desc
    limit 1;

    if candidate_uuid is not null then
      insert into public.youth_pod_members (pod_id, user_id, role, task)
      values (pod_uuid, candidate_uuid, role_task.role, role_task.task)
      on conflict (pod_id, role) do nothing;
    end if;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'role', roles.role,
        'task', roles.task,
        'assignee',
          case
            when m.user_id is null then 'No candidate yet'
            else pr.display_name || ' · ' || tp.availability
          end,
        'profile',
          case
            when tp.user_id is null then null
            else jsonb_build_object(
              'skills', tp.skills,
              'portfolio', tp.portfolio_url,
              'availability', tp.availability
            )
          end
      )
      order by roles.position
    ),
    '[]'::jsonb
  )
  into members_json
  from (values
    (1, 'Developer', 'Complete core development work and validate the build'),
    (2, 'UI/UX Designer', 'Shape and test accessible user workflows'),
    (3, 'Business Student', 'Prepare a practical rollout and handover plan')
  ) as roles(position, role, task)
  left join public.youth_pod_members m
    on m.pod_id = pod_uuid and m.role = roles.role
  left join public.profiles pr on pr.id = m.user_id
  left join public.talent_profiles tp on tp.user_id = m.user_id;

  return jsonb_build_object('pod_id', pod_uuid, 'members', members_json);
end;
$$;

create or replace function public.sign_off_youth_pod(p_pod_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null or public.get_current_profile_role() <> 'organization' then
    raise exception 'Only an SMME/NGO account can sign off a pod';
  end if;

  update public.youth_pods
  set stakeholder_signed_off = true,
      progress_pct = 100,
      stage = 'Verified Shipped & Credential Issued'
  where id = p_pod_id and organization_id = auth.uid();

  if not found then
    raise exception 'Pod not found for this organization';
  end if;
end;
$$;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.prototypes to authenticated;
grant select, insert on public.problem_briefs to authenticated;
grant select, update on public.youth_pods to authenticated;
grant select on public.youth_pod_members to authenticated;
grant select, insert, update on public.talent_profiles to authenticated;
grant execute on function public.get_current_profile_role() to authenticated;
grant execute on function public.is_pod_member(uuid, uuid) to authenticated;
grant execute on function public.has_assigned_prototype(uuid, uuid) to authenticated;
grant execute on function public.is_matched_talent(uuid, uuid) to authenticated;
grant execute on function public.request_youth_pod(text, text, uuid) to authenticated;
grant execute on function public.sign_off_youth_pod(uuid) to authenticated;
