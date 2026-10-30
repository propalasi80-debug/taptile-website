/**
 * Messages — real conversations between team members.
 *
 * Threads, messages and attachments all live in Supabase under row-level
 * security. New messages arrive over a realtime subscription, so the other
 * founder sees a reply without reloading.
 *
 * Nothing on this page is sample data. An empty account shows an empty state
 * and a way out of it, rather than invented threads.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageBody, PageHeader } from '../layout/AppShell';
import {
  Avatar,
  Button,
  Card,
  CardTitle,
  Chip,
  EmptyState,
  ErrorCard,
  Field,
  Pill,
  SearchField,
  Skeleton,
} from '../ui';
import { useAuth } from '../../lib/auth';
import { displayName, fetchProfiles, type Profile } from '../../lib/team';
import {
  createThread,
  fetchMessages,
  fetchThreads,
  markRead,
  type Message,
  MAX_FILE_BYTES,
  sendMessage,
  signedUrl,
  subscribeToMessages,
  type Thread,
  unsubscribe,
} from '../../lib/messages';
import { cn } from '../lib/cn';
import { Chat, Close, Download, Plus } from '../icons';

type Filter = 'all' | 'unread';

function time(iso: string): string {
  return new Intl.DateTimeFormat('en-NZ', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return 'Today';
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short' }).format(date);
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** An attachment chip. The bucket is private, so the URL is fetched on click. */
function AttachmentLink({ path, name, size }: { path: string; name: string; size: number }) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    const url = await signedUrl(path);
    setBusy(false);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={busy}
      className="mt-[6px] flex w-full items-center gap-[8px] rounded-tile border border-line-strong bg-tile-grad px-[9px] py-[7px] text-left transition hover:brightness-110"
    >
      <span className="text-ink-4">
        <Download size={13} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-semibold text-ink-1" title={name}>
          {name}
        </span>
        <span className="block text-[9.5px] text-ink-4">
          {busy ? 'Opening…' : fileSize(size)}
        </span>
      </span>
    </button>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const me = user?.id;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<string>();

  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [composer, setComposer] = useState('');
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState('');
  const [withIds, setWithIds] = useState<string[]>([]);

  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const nameOf = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return 'Unknown';
      const profile = profiles.find((item) => item.id === id);
      return profile ? displayName(profile) : 'Unknown';
    },
    [profiles],
  );

  /** A thread's title: its subject, else the other people in it. */
  const titleOf = useCallback(
    (thread: Thread): string => {
      if (thread.subject.trim()) return thread.subject;
      const others = thread.members.filter((id) => id !== me);
      if (others.length === 0) return 'Just you';
      return others.map(nameOf).join(', ');
    },
    [me, nameOf],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [profileResult, threadResult] = await Promise.all([fetchProfiles(), fetchThreads()]);
    setProfiles(profileResult.profiles);
    setThreads(threadResult.threads);
    setError(threadResult.error ?? profileResult.error);
    setLoading(false);
    setSelected((current) => current ?? threadResult.threads[0]?.id);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadThread = useCallback(async (threadId: string) => {
    setLoadingThread(true);
    const result = await fetchMessages(threadId);
    setMessages(result.messages);
    if (result.error) setError(result.error);
    setLoadingThread(false);
  }, []);

  useEffect(() => {
    if (!selected) return;
    void loadThread(selected);
    void markRead(selected);

    const channel = subscribeToMessages(selected, () => {
      void loadThread(selected);
      void markRead(selected);
    });
    return () => unsubscribe(channel);
  }, [selected, loadThread]);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const unreadCount = useCallback(
    (thread: Thread): number => {
      if (thread.id === selected) return 0;
      if (!thread.last_read_at) return thread.updated_at > thread.created_at ? 1 : 0;
      return new Date(thread.updated_at) > new Date(thread.last_read_at) ? 1 : 0;
    },
    [selected],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return threads.filter((thread) => {
      if (filter === 'unread' && unreadCount(thread) === 0) return false;
      if (!needle) return true;
      return titleOf(thread).toLowerCase().includes(needle);
    });
  }, [threads, filter, query, titleOf, unreadCount]);

  const current = threads.find((thread) => thread.id === selected);
  const others = profiles.filter((profile) => profile.id !== me);
  const totalUnread = threads.reduce((sum, thread) => sum + unreadCount(thread), 0);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const chosen = [...list];
    const tooBig = chosen.find((file) => file.size > MAX_FILE_BYTES);
    if (tooBig) {
      setNotice(`${tooBig.name} is over the 25MB limit.`);
      return;
    }
    setNotice(undefined);
    setPending((current) => [...current, ...chosen]);
  }

  async function send() {
    if (!selected) return;
    if (!composer.trim() && pending.length === 0) return;

    setSending(true);
    const result = await sendMessage(selected, composer, pending);
    setSending(false);

    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setNotice(result.error);
    setComposer('');
    setPending([]);
    if (fileInput.current) fileInput.current.value = '';
    await loadThread(selected);
    const refreshed = await fetchThreads();
    setThreads(refreshed.threads);
  }

  async function startThread() {
    const result = await createThread(subject, withIds);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    setComposing(false);
    setSubject('');
    setWithIds([]);
    const refreshed = await fetchThreads();
    setThreads(refreshed.threads);
    setSelected(result.id);
  }

  return (
    <>
      <PageHeader
        title="Messages"
        live
        description="Conversations between everyone with an account."
        actions={
          <>
            <Pill
              tone={totalUnread > 0 ? 'lime' : 'grey'}
              label={totalUnread > 0 ? `${totalUnread} unread` : 'All read'}
            />
            <Button icon={Plus} variant="primary" onClick={() => setComposing(true)}>
              New
            </Button>
          </>
        }
      />

      <PageBody
        rail={
          <>
            <Card pad={16}>
              <CardTitle>In this conversation</CardTitle>
              {current ? (
                <div className="flex flex-col">
                  {current.members.map((id) => {
                    const profile = profiles.find((item) => item.id === id);
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-[10px] border-t border-line-row py-[9px] first:border-t-0"
                      >
                        <Avatar name={nameOf(id)} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-bold text-ink-1">
                            {nameOf(id)}
                            {id === me && <span className="text-ink-4"> · you</span>}
                          </span>
                          <span className="block truncate text-[10.5px] text-ink-4">
                            {profile?.email ?? ''}
                          </span>
                        </span>
                        {profile && (
                          <Pill tone={profile.role === 'owner' ? 'lime' : 'grey'} label={profile.role} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11.5px] text-ink-4">No conversation selected.</p>
              )}
            </Card>

            <Card pad={16}>
              <CardTitle>Team</CardTitle>
              {profiles.length <= 1 ? (
                <p className="text-[11.5px] text-ink-4">
                  You are the only account. Add your co-founder from Settings → Team, then you can
                  message each other here.
                </p>
              ) : (
                <div className="flex flex-col">
                  {others.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-[10px] border-t border-line-row py-[9px] first:border-t-0"
                    >
                      <Avatar name={displayName(profile)} size={28} />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-1">
                        {displayName(profile)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setComposing(true);
                          setWithIds([profile.id]);
                        }}
                      >
                        Message
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        }
      >
        {error && <ErrorCard message={error} onRetry={() => void loadAll()} />}
        {notice && <ErrorCard message={notice} />}

        {composing && (
          <Card pad={18}>
            <CardTitle
              action={
                <Button size="sm" icon={Close} onClick={() => setComposing(false)}>
                  Cancel
                </Button>
              }
            >
              New conversation
            </CardTitle>
            <div className="flex flex-col gap-[14px]">
              <Field
                label="Subject"
                value={subject}
                onChange={setSubject}
                placeholder="Optional"
                hint="Leave it blank and the thread is named after the people in it."
              />
              <div>
                <p className="mb-[6px] text-[10.5px] font-semibold text-ink-3">With</p>
                {others.length === 0 ? (
                  <p className="text-[11.5px] text-ink-4">
                    Nobody else has an account yet. Add one in Settings → Team.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-[6px]">
                    {others.map((profile) => (
                      <Chip
                        key={profile.id}
                        label={displayName(profile)}
                        active={withIds.includes(profile.id)}
                        onClick={() =>
                          setWithIds((current) =>
                            current.includes(profile.id)
                              ? current.filter((id) => id !== profile.id)
                              : [...current, profile.id],
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Button
                  variant="primary"
                  disabled={withIds.length === 0}
                  onClick={() => void startThread()}
                >
                  Start conversation
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-[14px] lg:flex-row">
          <Card pad={14} className="w-full shrink-0 lg:w-[310px]">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Search conversations"
              placeholder="Search"
              height={32}
            />
            <div className="mt-[10px] flex flex-wrap gap-[6px]">
              {(['all', 'unread'] as Filter[]).map((key) => (
                <Chip
                  key={key}
                  label={key === 'all' ? 'All' : 'Unread'}
                  active={filter === key}
                  onClick={() => setFilter(filter === key ? 'all' : key)}
                />
              ))}
            </div>

            <div className="mt-[12px] flex flex-col">
              {loading ? (
                [0, 1, 2].map((index) => (
                  <div key={index} className="py-[6px]">
                    <Skeleton height={44} />
                  </div>
                ))
              ) : visible.length === 0 ? (
                <p className="py-6 text-center text-[11.5px] text-ink-4">
                  {threads.length === 0 ? 'No conversations yet.' : 'Nothing matches.'}
                </p>
              ) : (
                visible.map((thread) => {
                  const unread = unreadCount(thread);
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelected(thread.id)}
                      aria-current={thread.id === selected ? 'true' : undefined}
                      className={cn(
                        'flex items-start gap-[10px] rounded-tile p-[10px] text-left transition',
                        thread.id === selected ? 'bg-lime/[0.07]' : 'hover:bg-white/[0.025]',
                      )}
                    >
                      <Avatar name={titleOf(thread)} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-bold text-ink-1">
                            {titleOf(thread)}
                          </span>
                          <span className="shrink-0 text-[9.5px] text-ink-4">
                            {dayLabel(thread.updated_at)}
                          </span>
                        </span>
                        <span className="mt-[2px] flex items-center gap-[6px]">
                          <span className="min-w-0 flex-1 truncate text-[10.5px] text-ink-4">
                            {thread.members.length} in this thread
                          </span>
                          {unread > 0 && (
                            <span
                              aria-label={`${unread} unread messages`}
                              className="shrink-0 rounded-pill bg-lime/[0.16] px-[6px] py-[1px] text-[9.5px] font-bold text-lime"
                            >
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card pad={0} className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {!current ? (
              <EmptyState
                icon={Chat}
                title={threads.length === 0 ? 'No conversations yet' : 'Nothing selected'}
                body={
                  profiles.length <= 1
                    ? 'Add your co-founder in Settings → Team, then start a conversation here.'
                    : 'Start one with the New button, or pick a thread on the left.'
                }
                cta={
                  others.length > 0 ? (
                    <Button variant="primary" icon={Plus} onClick={() => setComposing(true)}>
                      New conversation
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="flex items-center gap-[10px] border-b border-line p-[14px]">
                  <Avatar name={titleOf(current)} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-ink-1">
                      {titleOf(current)}
                    </span>
                    <span className="block truncate text-[10.5px] text-ink-4">
                      {current.members.map(nameOf).join(', ')}
                    </span>
                  </span>
                </div>

                <div
                  ref={scroller}
                  className="flex min-h-[300px] max-h-[460px] flex-1 flex-col gap-[10px] overflow-y-auto p-[14px]"
                >
                  {loadingThread ? (
                    <Skeleton height={60} />
                  ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-[11.5px] text-ink-4">
                      No messages yet. Say something.
                    </p>
                  ) : (
                    messages.map((message, index) => {
                      const outgoing = message.sender_id === me;
                      const showDay =
                        index === 0 ||
                        dayLabel(messages[index - 1]!.created_at) !== dayLabel(message.created_at);
                      return (
                        <div key={message.id}>
                          {showDay && (
                            <p className="py-[6px] text-center text-[11px] text-ink-4">
                              {dayLabel(message.created_at)}
                            </p>
                          )}
                          <div className={cn('flex', outgoing ? 'justify-end' : 'justify-start')}>
                            <div className="max-w-[78%]">
                              {!outgoing && (
                                <p className="mb-[3px] text-[9.5px] font-semibold text-ink-4">
                                  {nameOf(message.sender_id)}
                                </p>
                              )}
                              <div
                                className={cn(
                                  'px-[12px] py-[9px] text-[12px]',
                                  outgoing
                                    ? 'rounded-[14px_14px_4px_14px] bg-lime-grad font-semibold text-lime-ink shadow-lime-sm'
                                    : 'rounded-[14px_14px_14px_4px] border border-line-strong bg-tile-grad text-ink-1',
                                )}
                              >
                                {message.body && (
                                  <span className="whitespace-pre-wrap break-words">
                                    {message.body}
                                  </span>
                                )}
                                {message.attachments.map((file) => (
                                  <AttachmentLink
                                    key={file.id}
                                    path={file.path}
                                    name={file.name}
                                    size={file.size}
                                  />
                                ))}
                                <span
                                  className={cn(
                                    'mt-[4px] block text-[9.5px]',
                                    outgoing ? 'text-lime-ink/60' : 'text-ink-4',
                                  )}
                                >
                                  {time(message.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {pending.length > 0 && (
                  <div className="flex flex-wrap gap-[6px] border-t border-line px-[14px] pt-[10px]">
                    {pending.map((file, index) => (
                      <span
                        key={`${file.name}-${index}`}
                        className="inline-flex items-center gap-[6px] rounded-chip border border-line-strong bg-tile-grad px-[9px] py-[5px] text-[10.5px] text-ink-2"
                      >
                        <span className="max-w-[160px] truncate">{file.name}</span>
                        <span className="text-ink-4">{fileSize(file.size)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            setPending((current) => current.filter((_, i) => i !== index))
                          }
                          className="text-ink-4 hover:text-alert-text"
                        >
                          <Close size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-[9px] border-t border-line p-[14px]">
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => pickFiles(event.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    aria-label="Attach a file"
                    className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-chip border border-line-strong bg-tile-grad text-ink-2 transition hover:text-ink-1"
                  >
                    <Plus size={15} />
                  </button>
                  <label htmlFor="composer" className="sr-only">
                    Write a message
                  </label>
                  <textarea
                    id="composer"
                    rows={1}
                    value={composer}
                    placeholder="Write a message"
                    onChange={(event) => setComposer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    className="max-h-[120px] min-h-[34px] flex-1 resize-none rounded-chip border border-line-strong bg-tile-grad px-3 py-[8px] text-[12px] text-ink-1 placeholder:text-ink-5 focus:border-lime focus:outline-none focus:ring-2 focus:ring-lime/20"
                  />
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={sending || (!composer.trim() && pending.length === 0)}
                    aria-label="Send message"
                    aria-busy={sending || undefined}
                    className="on-lime inline-flex h-[34px] shrink-0 items-center justify-center gap-[6px] rounded-chip bg-lime-grad px-[13px] text-[12px] font-bold text-lime-ink shadow-lime transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
