// Chat messages between two users, backed by Supabase.
//
// Threads are addressed by the other person's username (that's what the chat
// route carries). Real users -> the `messages` table; mock seed users (from
// the inbox demo conversations) fall back to local seed data in the screen.

import { supabase } from './supabase';

export type ChatMessage = {
  id: string;
  from: 'me' | 'them';
  text: string;
  time: string;
};

// Resolve a username to a profile id, or null if it isn't a real user.
export async function getRecipientId(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

// All messages between the signed-in user and the recipient, oldest first.
export async function getThread(recipientId: string): Promise<ChatMessage[]> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${recipientId}),` +
      `and(sender_id.eq.${recipientId},recipient_id.eq.${me})`
    )
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map((m: any) => ({
    id: m.id,
    from: m.sender_id === me ? 'me' : 'them',
    text: m.body,
    time: '',
  }));
}

// Live-subscribe to new incoming messages from `recipientId` to the signed-in
// user. Returns a cleanup function. Requires Realtime enabled on the messages
// table (alter publication supabase_realtime add table public.messages).
export async function subscribeToThread(
  recipientId: string,
  onIncoming: (m: ChatMessage) => void
): Promise<() => void> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return () => {};
  const channel = supabase
    .channel(`thread-${me}-${recipientId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` },
      payload => {
        const m = payload.new as { id: string; sender_id: string; body: string };
        if (m.sender_id === recipientId) {
          onIncoming({ id: m.id, from: 'them', text: m.body, time: '' });
        }
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function sendMessage(recipientId: string, body: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) throw new Error('You must be signed in to send a message.');
  const { error } = await supabase
    .from('messages')
    .insert({ sender_id: me, recipient_id: recipientId, body });
  if (error) throw error;
}
