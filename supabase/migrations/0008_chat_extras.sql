-- ============================================================
-- INTERNATIONAL FRESHMAN — extras do chat (migration 0008)
-- 1) Apagar a propria mensagem em ate 24 horas (RLS)
-- 2) Prévia da conversa recalculada quando uma mensagem some
-- Rode DEPOIS de 0001..0007.
-- ============================================================

-- so o remetente apaga, e so dentro de 24 horas
drop policy if exists "msg_delete" on public.messages;
create policy "msg_delete" on public.messages
  for delete using (
    sender_id = auth.uid()
    and created_at > now() - interval '24 hours'
  );

-- ao apagar, a previa e a hora da conversa voltam para a ultima
-- mensagem restante (ou ficam vazias se nao sobrar nenhuma)
create or replace function public.refresh_conversation_preview()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations c set
    last_message_at = (
      select max(m.created_at) from public.messages m
      where m.conversation_id = old.conversation_id
    ),
    last_message_preview = (
      select case when m.body <> '' then left(m.body, 80) else '[foto]' end
      from public.messages m
      where m.conversation_id = old.conversation_id
      order by m.created_at desc limit 1
    )
  where c.id = old.conversation_id;
  return null;
end; $$;
drop trigger if exists trg_refresh_preview on public.messages;
create trigger trg_refresh_preview
  after delete on public.messages
  for each row execute procedure public.refresh_conversation_preview();
