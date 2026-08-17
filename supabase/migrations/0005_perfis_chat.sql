-- ============================================================
-- INTERNATIONAL FRESHMAN — perfis publicos e chat privado (migration 0005)
-- Bio no perfil, buckets de avatar e chat, conversas e mensagens
-- com RLS. Rode DEPOIS de 0001..0004.
-- ============================================================

-- ---------- PERFIL ----------
alter table public.profiles add column if not exists bio text;

-- buckets publicos para avatar e fotos de chat
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read" on storage.objects;
drop policy if exists "avatars_upload" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "chat_images_read" on storage.objects;
drop policy if exists "chat_images_upload" on storage.objects;
create policy "chat_images_read" on storage.objects
  for select using (bucket_id = 'chat-images');
create policy "chat_images_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat-images');

-- ---------- CONVERSAS ----------
create table if not exists public.conversations (
  id bigserial primary key,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  constraint conv_distintos check (user_a <> user_b),
  constraint conv_ordenada check (user_a < user_b)
);
create unique index if not exists idx_conv_par on public.conversations(user_a, user_b);
create index if not exists idx_conv_recent on public.conversations(last_message_at desc nulls last);

create table if not exists public.messages (
  id bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  images text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint msg_nao_vazia check (body <> '' or array_length(images, 1) > 0)
);
create index if not exists idx_msg_conv on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conv_select" on public.conversations;
drop policy if exists "conv_insert" on public.conversations;
create policy "conv_select" on public.conversations
  for select using (auth.uid() in (user_a, user_b));
create policy "conv_insert" on public.conversations
  for insert with check (auth.uid() in (user_a, user_b));

drop policy if exists "msg_select" on public.messages;
drop policy if exists "msg_insert" on public.messages;
create policy "msg_select" on public.messages
  for select using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
  ));
create policy "msg_insert" on public.messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)
    )
  );

-- ---------- Abrir (ou reaproveitar) conversa entre dois usuarios ----------
create or replace function public.get_or_create_conversation(p_other uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_a uuid; v_b uuid; v_id bigint;
begin
  if auth.uid() is null then raise exception 'nao autenticado'; end if;
  if p_other is null or p_other = auth.uid() then raise exception 'conversa invalida'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'usuario nao encontrado';
  end if;
  v_a := least(auth.uid(), p_other);
  v_b := greatest(auth.uid(), p_other);
  select id into v_id from public.conversations where user_a = v_a and user_b = v_b;
  if v_id is null then
    insert into public.conversations (user_a, user_b) values (v_a, v_b) returning id into v_id;
  end if;
  return v_id;
end; $$;

-- ---------- Marcar como lidas as mensagens recebidas ----------
create or replace function public.mark_conversation_read(p_conversation bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'nao autenticado'; end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation and auth.uid() in (c.user_a, c.user_b)
  ) then raise exception 'sem acesso'; end if;
  update public.messages set read_at = now()
    where conversation_id = p_conversation
      and sender_id <> auth.uid()
      and read_at is null;
end; $$;

-- ---------- Trigger: manter previa e hora da ultima mensagem ----------
create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set
    last_message_at = new.created_at,
    last_message_preview = case
      when new.body <> '' then left(new.body, 80)
      else '[foto]'
    end
  where id = new.conversation_id;
  return null;
end; $$;
drop trigger if exists trg_bump_conversation on public.messages;
create trigger trg_bump_conversation
  after insert on public.messages
  for each row execute procedure public.bump_conversation();
