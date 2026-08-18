#!/usr/bin/env node
// Regenerates supabase/schema.sql from the live database — tables, columns,
// constraints, indexes, RLS policies, and functions/RPCs. Not a byte-perfect
// pg_dump; a readable reference for reviewing what RLS actually enforces
// alongside the application code that relies on it.
//
// Usage:
//   npm install --no-save pg
//   DB_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
//     OUT_FILE=supabase/schema.sql node supabase/dump-schema.mjs
//
// DB_URL takes the DB password from Supabase Dashboard -> Project Settings ->
// Database (same value as DATABASE_URL in .env.local, if set there).

import pg from "pg";
import { writeFileSync } from "node:fs";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const q = (sql, params) => client.query(sql, params).then((r) => r.rows);

const tables = await q(`
  select table_name
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name
`);

let out = `-- Schema snapshot pulled from live Supabase project (public schema).\n-- Generated via information_schema / pg_catalog introspection — not a byte-perfect pg_dump,\n-- but captures tables, columns, constraints, indexes, and RLS policies for review.\n-- Regenerate with: DB_URL=... node supabase/dump-schema.mjs\n\n`;

for (const { table_name } of tables) {
  const cols = await q(
    `select column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
     from information_schema.columns
     where table_schema='public' and table_name=$1
     order by ordinal_position`,
    [table_name]
  );

  const pk = await q(
    `select kcu.column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     where tc.table_schema='public' and tc.table_name=$1 and tc.constraint_type='PRIMARY KEY'
     order by kcu.ordinal_position`,
    [table_name]
  );

  const fks = await q(
    `select
       kcu.column_name,
       ccu.table_name as foreign_table,
       ccu.column_name as foreign_column,
       rc.delete_rule
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     join information_schema.constraint_column_usage ccu
       on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
     join information_schema.referential_constraints rc
       on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.table_schema
     where tc.table_schema='public' and tc.table_name=$1 and tc.constraint_type='FOREIGN KEY'`,
    [table_name]
  );

  const checks = await q(
    `select cc.check_clause
     from information_schema.table_constraints tc
     join information_schema.check_constraints cc
       on tc.constraint_name = cc.constraint_name and tc.table_schema = cc.constraint_schema
     where tc.table_schema='public' and tc.table_name=$1 and tc.constraint_type='CHECK'`,
    [table_name]
  );

  const indexes = await q(
    `select indexname, indexdef from pg_indexes where schemaname='public' and tablename=$1 order by indexname`,
    [table_name]
  );

  const rls = await q(
    `select relrowsecurity, relforcerowsecurity from pg_class where relname=$1 and relnamespace = 'public'::regnamespace`,
    [table_name]
  );

  const policies = await q(
    `select policyname, cmd, permissive, roles, qual, with_check
     from pg_policies where schemaname='public' and tablename=$1 order by policyname`,
    [table_name]
  );

  out += `-- ============================================================\n-- Table: public.${table_name}\n-- ============================================================\n\n`;
  out += `create table public.${table_name} (\n`;
  out += cols
    .map((c) => {
      let type = c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type;
      if (c.character_maximum_length) type += `(${c.character_maximum_length})`;
      let line = `  ${c.column_name} ${type}`;
      if (c.is_nullable === "NO") line += " not null";
      if (c.column_default) line += ` default ${c.column_default}`;
      return line;
    })
    .join(",\n");
  if (pk.length) out += `,\n  primary key (${pk.map((p) => p.column_name).join(", ")})`;
  out += `\n);\n\n`;

  for (const fk of fks) {
    out += `alter table public.${table_name} add foreign key (${fk.column_name}) references ${fk.foreign_table}(${fk.foreign_column})${fk.delete_rule && fk.delete_rule !== "NO ACTION" ? ` on delete ${fk.delete_rule.toLowerCase()}` : ""};\n`;
  }
  for (const c of checks) {
    if (!c.check_clause.includes("IS NOT NULL")) out += `-- check: ${c.check_clause}\n`;
  }
  if (fks.length || checks.some((c) => !c.check_clause.includes("IS NOT NULL"))) out += `\n`;

  for (const idx of indexes) {
    if (!idx.indexname.endsWith("_pkey")) out += `${idx.indexdef};\n`;
  }
  if (indexes.some((i) => !i.indexname.endsWith("_pkey"))) out += `\n`;

  const rlsEnabled = rls[0]?.relrowsecurity;
  out += `-- RLS ${rlsEnabled ? "ENABLED" : "DISABLED"}${rls[0]?.relforcerowsecurity ? " (forced)" : ""}\n`;
  if (rlsEnabled) out += `alter table public.${table_name} enable row level security;\n`;
  if (policies.length === 0 && rlsEnabled) {
    out += `-- ⚠ RLS is enabled but NO POLICIES exist — table is fully inaccessible via the anon/authenticated roles.\n`;
  }
  for (const p of policies) {
    const roleList = Array.isArray(p.roles) ? p.roles.join(", ") : String(p.roles).replace(/^\{|\}$/g, "");
    out += `\ncreate policy "${p.policyname}" on public.${table_name}\n  as ${p.permissive === "PERMISSIVE" ? "permissive" : "restrictive"} for ${p.cmd.toLowerCase()}\n  to ${roleList}`;
    if (p.qual) out += `\n  using (${p.qual})`;
    if (p.with_check) out += `\n  with check (${p.with_check})`;
    out += `;\n`;
  }

  out += `\n`;
}

// Functions / RPCs
const funcs = await q(
  `select p.proname, pg_get_functiondef(p.oid) as def
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
   order by p.proname`
);
if (funcs.length) {
  out += `-- ============================================================\n-- Functions / RPCs\n-- ============================================================\n\n`;
  for (const f of funcs) out += `${f.def};\n\n`;
}

writeFileSync(process.env.OUT_FILE, out);
console.log(`wrote ${process.env.OUT_FILE} — ${tables.length} tables, ${funcs.length} functions`);
await client.end();
