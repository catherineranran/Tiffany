create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

alter table public.messages enable row level security;

drop policy if exists "Anyone can read celebration messages" on public.messages;
create policy "Anyone can read celebration messages"
on public.messages
for select
using (true);

drop policy if exists "Anyone can add celebration messages" on public.messages;
create policy "Anyone can add celebration messages"
on public.messages
for insert
with check (
  length(trim(name)) between 1 and 80
  and length(trim(message)) <= 1200
  and (
    length(trim(message)) > 0
    or coalesce(array_length(photo_urls, 1), 0) > 0
  )
  and coalesce(array_length(photo_urls, 1), 0) <= 6
);

insert into storage.buckets (id, name, public)
values ('celebration-photos', 'celebration-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can read celebration photos" on storage.objects;
create policy "Anyone can read celebration photos"
on storage.objects
for select
using (bucket_id = 'celebration-photos');

drop policy if exists "Anyone can upload celebration photos" on storage.objects;
create policy "Anyone can upload celebration photos"
on storage.objects
for insert
with check (
  bucket_id = 'celebration-photos'
  and owner is null
  and lower((storage.extension(name))) in ('jpg', 'jpeg', 'png', 'gif', 'webp')
);
