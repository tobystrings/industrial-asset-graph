-- Run after the migration inside BEGIN / ROLLBACK. No fixture is retained.
do $$
declare
 admin_id uuid:=gen_random_uuid(); author uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
 work_id uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid(); payload jsonb; response jsonb;
 receipt jsonb; proposal jsonb; destination text; target jsonb; before_revision bigint; rid uuid;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
 (admin_id,'slate-admin-'||admin_id||'@example.invalid',now(),'{"iag_role":"admin"}'),
 (author,'slate-author-'||author||'@example.invalid',now(),'{"iag_role":"technician"}'),
 (stranger,'slate-other-'||stranger||'@example.invalid',now(),'{"iag_role":"technician"}');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',author,'role','authenticated')::text,true);
 payload:=jsonb_build_object('id',work_id,'facilityId','facility-j-lieb','authorId',author,'authorName','Transactional test','assetId','','kind','note','createdAt',now(),'updatedAt',now(),'version',1,'sharedVersion',0,'state','open','transport','pending','note','Original observation','entries','[]'::jsonb,'files','[]'::jsonb,'summary','{"problem":"Observation","findings":"Measured","work":"Checked","outcome":"Recorded","remaining":"Unknown"}'::jsonb,'requestId',request_id);
 response:=public.iag_work_save(work_id,'facility-j-lieb',0,request_id,payload);
 if response->>'status'<>'saved' or response->>'version'<>'1' then raise exception 'Save failed';end if;
 response:=public.iag_work_save(work_id,'facility-j-lieb',0,request_id,payload);
 if response->>'status'<>'duplicate' then raise exception 'Duplicate save not recognized';end if;
 response:=public.iag_work_save(work_id,'facility-j-lieb',0,gen_random_uuid(),payload);
 if response->>'status'<>'conflict' then raise exception 'Stale save accepted';end if;
 begin
  perform public.iag_work_save(work_id,'facility-j-lieb',1,gen_random_uuid(),payload-'kind');
  raise exception 'TEST FAILURE: missing kind accepted';
 exception when others then if sqlerrm like 'TEST FAILURE:%' then raise;end if;end;
 begin
  perform public.iag_work_save(work_id,'facility-j-lieb',1,gen_random_uuid(),jsonb_set(payload,'{files}',jsonb_build_array(jsonb_build_object('path','facility-j-lieb/'||author||'/'||work_id||'/not-uploaded'))));
  raise exception 'TEST FAILURE: absent original accepted';
 exception when others then if sqlerrm like 'TEST FAILURE:%' then raise;end if;end;
 receipt:=public.iag_work_submit(work_id,1);rid:=(receipt->>'id')::uuid;
 if public.iag_work_submit(work_id,1)->>'id'<>receipt->>'id' then raise exception 'Duplicate submission';end if;
 if receipt->'original' is distinct from payload then raise exception 'Original changed';end if;
 begin
  perform public.iag_review_action(rid,1,'approve',null,'');
  raise exception 'TEST FAILURE: author approved';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',stranger,'role','authenticated')::text,true);
 begin
  perform public.iag_work_submit(work_id,1);
  raise exception 'TEST FAILURE: other author submitted';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','app_metadata',jsonb_build_object('iag_role','admin'))::text,true);
 receipt:=public.iag_review_action(rid,1,'clarify',null,'Which machine?');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',author,'role','authenticated')::text,true);
 receipt:=public.iag_review_action(rid,2,'reply',null,'The machine label is unreadable.');
 if receipt->'original' is distinct from payload then raise exception 'Clarification rewrote original';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','app_metadata',jsonb_build_object('iag_role','admin'))::text,true);
 receipt:=public.iag_review_action(rid,3,'propose','{"destination":"app-change","targetId":"","text":"Test draft only","base":null}', '');
 begin
  perform public.iag_review_action(rid,4,'apply',null,'');
  raise exception 'TEST FAILURE: unapproved apply';
 exception when others then if sqlerrm like 'TEST FAILURE:%' then raise;end if;end;
 receipt:=public.iag_review_action(rid,4,'approve',null,'');
 if exists(select 1 from public.iag_app_requests where id=rid) then raise exception 'Approval applied prematurely';end if;
 receipt:=public.iag_review_action(rid,5,'apply',null,'');
 if receipt->>'state'<>'applied' or not exists(select 1 from public.iag_app_requests where id=rid) then raise exception 'Approved draft absent';end if;
 if public.iag_review_action(rid,5,'apply',null,'') is distinct from receipt then raise exception 'Repeated apply changed receipt';end if;
 -- Exercise each canonical destination against the existing publication, entirely rolled back.
 for destination in select unnest(array['asset','repair','document','inventory']) loop
  select revision into before_revision from public.iag_publications where facility_id='facility-j-lieb';
  if before_revision is null then raise exception 'Shared publication required for destination checks';end if;
  if destination='inventory' then
   -- Isolated fixture destination; production data is restored by the enclosing rollback.
   update public.iag_publications p set payload=jsonb_set(p.payload,'{plant,facility,inventory}',coalesce(p.payload#>'{plant,facility,inventory}','{}')||jsonb_build_object('parts',jsonb_build_array(jsonb_build_object('id','slate-test-part','name','Transactional part','notes','Original')))) where facility_id='facility-j-lieb';
  end if;
  select case when destination in ('asset','repair') then p.payload#>'{plant,assets,0}' when destination='document' then p.payload#>'{plant,documents,0}' else p.payload#>'{plant,facility,inventory,parts,0}' end into target from public.iag_publications p where facility_id='facility-j-lieb';
  if target is null then raise exception 'Missing test destination %',destination;end if;
  insert into public.iag_reviews(work_id,work_version,facility_id,author_id,original) values(gen_random_uuid(),1,'facility-j-lieb',author,payload) returning id into rid;
  proposal:=jsonb_build_object('destination',destination,'targetId',target->>'id','text','Reviewed observation','base',target,'summary',payload->'summary');
  receipt:=public.iag_review_action(rid,1,'propose',proposal,'');
  receipt:=public.iag_review_action(rid,2,'approve',null,'');
  if (select revision from public.iag_publications where facility_id='facility-j-lieb')<>before_revision then raise exception 'Approval modified canonical record';end if;
  begin
   perform public.iag_review_action(rid,1,'apply',null,'');
   raise exception 'TEST FAILURE: stale review accepted';
  exception when others then if sqlerrm like 'TEST FAILURE:%' then raise;end if;end;
  -- A competing change to the target must abort the whole application.
  update public.iag_reviews r set proposal=jsonb_set(r.proposal,'{base}',target||'{"description":"stale base"}') where id=rid;
  begin
   perform public.iag_review_action(rid,3,'apply',null,'');
   raise exception 'TEST FAILURE: conflicting target accepted';
  exception when others then if sqlerrm like 'TEST FAILURE:%' then raise;end if;end;
  if (select state from public.iag_reviews where id=rid)<>'approved' or (select revision from public.iag_publications where facility_id='facility-j-lieb')<>before_revision then raise exception 'Conflict partially applied';end if;
  update public.iag_reviews r set proposal=jsonb_set(r.proposal,'{base}',target) where id=rid;
  receipt:=public.iag_review_action(rid,3,'apply',null,'');
  if receipt->>'state'<>'applied' or (receipt->>'application_revision')::bigint<>before_revision+1 then raise exception 'Canonical application failed: %',destination;end if;
  if public.iag_review_action(rid,3,'apply',null,'') is distinct from receipt then raise exception 'Canonical duplicate changed state';end if;
  if receipt->'original' is distinct from payload then raise exception 'Application rewrote original';end if;
 end loop;
end;$$;
select 'PASS: save, duplicate, conflict, originals, authorization, clarification, approval, all destinations, application retry' as result;
