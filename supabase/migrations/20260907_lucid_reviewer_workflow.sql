create or replace function public.review_lucid_submission(submission_id uuid, decision text, reason text default '') returns void language plpgsql security definer set search_path=public,auth as $$
declare
    reviewer uuid := auth.uid();
    role_name text := lower(coalesce(auth.jwt()->'app_metadata'->>'role',''));
    submission public.lucid_app_submissions%rowtype;
    resolved_app_id text;
begin
    if reviewer is null or role_name not in ('admin','reviewer') then raise exception 'Reviewer access is required.' using errcode='42501'; end if;
    if decision not in ('approved','rejected') then raise exception 'Invalid review decision.' using errcode='22023'; end if;
    select * into submission from public.lucid_app_submissions where id=submission_id for update;
    if not found then raise exception 'Submission not found.' using errcode='P0002'; end if;
    if submission.status <> 'pending' then raise exception 'Submission has already been reviewed.' using errcode='55000'; end if;
    update public.lucid_app_submissions set status=decision,rejection_reason=case when decision='rejected' then nullif(reason,'') else null end,reviewer_id=reviewer,reviewed_at=now() where id=submission_id;
    if decision='approved' then
        resolved_app_id := lower(regexp_replace(coalesce(nullif(submission.app_id,''),submission.name),'[^a-zA-Z0-9]+','-','g'));
        resolved_app_id := trim(both '-' from left(resolved_app_id,80));
        if resolved_app_id='' then resolved_app_id := 'lucid-app-'||replace(submission.id::text,'-',''); end if;
        insert into public.lucid_apps(id,name,description,category,version,app_type,status,developer_id,package_key,source_key,package_size,published_at) values(resolved_app_id,submission.name,submission.description,submission.category,submission.version,'community','approved',submission.developer_id,submission.package_key,submission.source_key,submission.package_size,now()) on conflict(id) do update set name=excluded.name,description=excluded.description,category=excluded.category,version=excluded.version,status='approved',developer_id=excluded.developer_id,package_key=excluded.package_key,source_key=excluded.source_key,package_size=excluded.package_size,published_at=now(),updated_at=now();
        insert into public.lucid_app_versions(app_id,version,package_key,source_key,status,package_size) values(resolved_app_id,submission.version,submission.package_key,submission.source_key,'approved',submission.package_size);
    end if;
end;
$$;
revoke all on function public.review_lucid_submission(uuid,text,text) from public;
grant execute on function public.review_lucid_submission(uuid,text,text) to authenticated;
create policy "Reviewers can view submission queue" on public.lucid_app_submissions for select to authenticated using (lower(coalesce((select auth.jwt()->'app_metadata'->>'role'),'')) in ('admin','reviewer'));
create policy "Reviewers can update submissions" on public.lucid_app_submissions for update to authenticated using (lower(coalesce((select auth.jwt()->'app_metadata'->>'role'),'')) in ('admin','reviewer')) with check (lower(coalesce((select auth.jwt()->'app_metadata'->>'role'),'')) in ('admin','reviewer'));
