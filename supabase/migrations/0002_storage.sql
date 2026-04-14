-- ============================================================================
-- SiteLaunch — storage buckets + policies
-- Migration 0002
-- ============================================================================

-- Public bucket for partner logos (served directly, no signed URLs needed).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  5242880,  -- 5 MB
  array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']
)
on conflict (id) do nothing;

-- Private bucket for submission uploads (client files, contracts, etc.)
insert into storage.buckets (id, name, public, file_size_limit)
values ('submissions', 'submissions', false, 52428800)   -- 50 MB
on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- Storage policies: logos
-- -------------------------------------------------------------------------
drop policy if exists "logos public read"  on storage.objects;
drop policy if exists "logos auth insert"  on storage.objects;
drop policy if exists "logos auth update"  on storage.objects;
drop policy if exists "logos auth delete"  on storage.objects;

create policy "logos public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'logos');

create policy "logos auth insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

create policy "logos auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos');

create policy "logos auth delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

-- -------------------------------------------------------------------------
-- Storage policies: submissions (private, partner-scoped)
-- Path convention: {partner_id}/{submission_id}/{filename}
-- -------------------------------------------------------------------------
drop policy if exists "submissions partner read"   on storage.objects;
drop policy if exists "submissions partner write"  on storage.objects;
drop policy if exists "submissions partner update" on storage.objects;
drop policy if exists "submissions partner delete" on storage.objects;

create policy "submissions partner read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and (
      public.is_superadmin()
      or public.is_partner_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy "submissions partner write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'submissions'
    and (
      public.is_superadmin()
      or public.is_partner_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy "submissions partner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'submissions'
    and (
      public.is_superadmin()
      or public.is_partner_member((storage.foldername(name))[1]::uuid)
    )
  );

create policy "submissions partner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'submissions'
    and (
      public.is_superadmin()
      or public.is_partner_member((storage.foldername(name))[1]::uuid)
    )
  );
