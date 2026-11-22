// Isolated PostgreSQL engine; never inserts fixtures into the live project.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;
 create table konsoliss_containers(id uuid primary key,capacity_cbm numeric not null default 68,updated_at timestamptz not null default now());
 create table konsoliss_container_assignments(id uuid primary key,container_id uuid references konsoliss_containers,user_id uuid not null,is_current boolean not null default true,loaded_cbm numeric,allocated_cbm numeric);
 create table konsoliss_customer_load_progress(user_id uuid primary key,reserved_cbm numeric not null,sent_cbm numeric not null,loaded_cbm numeric not null,inbound_to_container_cbm numeric not null);
 alter table konsoliss_container_assignments enable row level security;
 grant select on konsoliss_container_assignments to authenticated;
 create policy own on konsoliss_container_assignments to authenticated using(user_id=current_setting('request.jwt.claim.sub',true)::uuid);`);
 await db.exec(fs.readFileSync(require('node:path').resolve(__dirname,'../../supabase/migrations/20261122205352_konsoliss_verified_volume_constraints.sql'),'utf8'));
 await db.exec(fs.readFileSync(require('node:path').resolve(__dirname,'../../supabase/migrations/20261122210202_konsoliss_occupancy_realtime_invalidation.sql'),'utf8'));
 const container='00000000-0000-0000-0000-000000000001',a='00000000-0000-0000-0000-000000000002',b='00000000-0000-0000-0000-000000000003';
 await db.query("insert into konsoliss_containers(id,updated_at) values($1,'2000-01-01')",[container]);
 for(const invalid of [-1,'NaN','Infinity','-Infinity']){
  await assert.rejects(db.query('insert into konsoliss_customer_load_progress values($1,0,0,0,$2)',[a,invalid]));
 }
 console.log('PASS: negative and nonfinite inbound rejected');
 await db.query('insert into konsoliss_customer_load_progress values($1,0.02,0.02,0,0.02)',[a]);
 await db.query('insert into konsoliss_container_assignments values($1,$2,$3,true,0.02,0.02)',[a,container,a]);
 await db.query('insert into konsoliss_container_assignments values($1,$2,$3,true,67.98,67.98)',[b,container,b]);
 await assert.rejects(db.query('update konsoliss_container_assignments set allocated_cbm=68 where id=$1',[b]),/capacity/);
 await assert.rejects(db.query('update konsoliss_container_assignments set loaded_cbm=68 where id=$1',[b]),/capacity/);
 assert.ok((await db.query("select updated_at>'2000-01-01'::timestamptz as touched from konsoliss_containers")).rows[0].touched);
 console.log('PASS: assignment changes invalidate parent container occupancy');
 console.log('PASS: exact 68 CBM accepted, aggregate loaded/allocation overflow rejected');
 await assert.rejects(db.query('update konsoliss_container_assignments set user_id=$1 where id=$2',[b,a]),/immutable/);
 console.log('PASS: cargo ownership reassignment rejected');
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
 assert.equal((await db.query('select * from konsoliss_container_assignments')).rows.length,1);
 await assert.rejects(db.query('update konsoliss_container_assignments set loaded_cbm=0'),/permission denied/);
 await db.exec(`reset role;set role anon;`);
 await assert.rejects(db.query('select * from konsoliss_container_assignments'),/permission denied/);
 console.log('PASS: isolated RLS fixture hides other customer and denies customer writes/anonymous reads');
 await db.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
