/**
 * Settings — profile, team and alert preferences.
 *
 * The Billing and Integrations tabs from the handoff are gone. Both were
 * entirely invented — a card ending 4417, three zero invoices, Stripe and
 * Shopify shown as connected when nothing is wired to either. A settings
 * screen that lies about which services are live is worse than one that is
 * missing a tab.
 *
 * Team is real: an admin invites a co-founder here and the account is created
 * through the `team-invite` Edge Function, because minting a user needs the
 * service-role key and that must never reach a browser.
 */

import { useCallback, useEffect, useState } from 'react';
import { PageBody, PageHeader } from '../layout/AppShell';
import { Avatar, Button, Card, CardTitle, Field, Pill, Tab, Toggle } from '../ui';
import { ErrorCard, EmptyState, Skeleton } from '../ui';
import { useAuth } from '../../lib/auth';
import { checkIsAdmin } from '../../lib/admin';
import {
  displayName,
  fetchProfiles,
  inviteTeammate,
  type Profile,
  type TeamRole,
  updateOwnName,
} from '../../lib/team';
import { FIGURES, FILL_IN } from '../mock';
import { longDate } from '../lib/format';
import { Shield, Users } from '../icons';

type TabKey = 'profile' | 'team' | 'notifications';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'team', label: 'Team' },
  { key: 'notifications', label: 'Alerts' },
];

const NOTIFICATIONS = [
  { key: 'n1', title: 'New waitlist signup', description: 'Batched into one message a day.' },
  { key: 'n2', title: 'A launch gate changes', description: 'Cleared, blocked or back in progress.' },
  { key: 'n3', title: 'New message', description: 'When the other founder writes to you.' },
  { key: 'n4', title: 'Weekly summary', description: 'Monday morning, the week behind.' },
] as const;

const PREFS_KEY = 'taptile.admin.alerts';

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    /* a blocked or empty store is fine — fall through to the defaults */
  }
  return { n1: true, n2: true, n3: true, n4: true, d1: true, d2: false };
}

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('profile');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [isAdmin, setIsAdmin] = useState(false);

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('founder');
  const [inviting, setInviting] = useState(false);

  const [prefs, setPrefs] = useState<Record<string, boolean>>(loadPrefs);

  const email = user?.email ?? 'Not signed in';
  const mine = profiles.find((profile) => profile.id === user?.id);

  const load = useCallback(async () => {
    setLoading(true);
    const [result, admin] = await Promise.all([fetchProfiles(), checkIsAdmin()]);
    setProfiles(result.profiles);
    setError(result.error);
    setIsAdmin(admin);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (mine) setName(mine.full_name);
  }, [mine]);

  function setPref(key: string) {
    return (next: boolean) => {
      const updated = { ...prefs, [key]: next };
      setPrefs(updated);
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
      } catch {
        /* preferences are a convenience; a blocked store is not an error */
      }
    };
  }

  async function saveName() {
    setSavingName(true);
    const result = await updateOwnName(name);
    setSavingName(false);
    setNotice(result.ok ? 'Name saved.' : result.error);
    if (result.ok) await load();
  }

  async function invite() {
    setInviting(true);
    setNotice(undefined);
    const result = await inviteTeammate({
      email: inviteEmail,
      full_name: inviteName,
      role: inviteRole,
    });
    setInviting(false);

    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setNotice(`Invite sent to ${inviteEmail}. They set their own password from the email.`);
    setInviteEmail('');
    setInviteName('');
    await load();
  }

  return (
    <>
      <PageHeader title="Settings" live description="Your profile, the team, and what gets sent to you." />

      <PageBody>
        <div className="flex flex-wrap gap-[7px]">
          {TABS.map((item) => (
            <Tab
              key={item.key}
              label={item.label}
              active={tab === item.key}
              onClick={() => setTab(item.key)}
            />
          ))}
        </div>

        {error && <ErrorCard message={error} onRetry={() => void load()} />}
        {notice && <ErrorCard message={notice} />}

        {tab === 'profile' && (
          <>
            <Card pad={18}>
              <CardTitle>Profile</CardTitle>
              <div className="flex flex-wrap items-center gap-[14px]">
                <Avatar name={mine ? displayName(mine) : email} size={56} />
                <p className="text-[11.5px] text-ink-4">
                  The avatar is generated from your name, so it follows you across every page.
                </p>
              </div>
              <div className="mt-[18px] grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                <Field
                  label="Full name"
                  value={name}
                  onChange={setName}
                  placeholder="Your name"
                  hint="Shown on messages and in the team list."
                />
                <Field label="Email" value={email} readOnly hint="From the signed-in account." />
              </div>
              <div className="mt-[14px]">
                <Button
                  variant="primary"
                  loading={savingName}
                  disabled={!mine || name === mine.full_name}
                  onClick={() => void saveName()}
                >
                  Save
                </Button>
              </div>
            </Card>

            <Card pad={18}>
              <CardTitle>Security</CardTitle>
              <div className="flex items-center justify-between gap-3 rounded-tile border border-line-strong bg-tile-grad p-[12px]">
                <span className="flex items-center gap-[10px]">
                  <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-tile bg-lime/[0.16] text-lime">
                    <Shield size={15} />
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold text-ink-1">Password</span>
                    <span className="block text-[10.5px] text-ink-4">
                      Changed through the reset flow on the public site.
                    </span>
                  </span>
                </span>
                <a href="/forgot-password" className="shrink-0 text-[11px] font-semibold text-lime">
                  Reset
                </a>
              </div>
            </Card>

            <Card pad={18}>
              <CardTitle>Workspace</CardTitle>
              <dl className="flex flex-col">
                {[
                  ['Product', 'Taptile Dialect'],
                  ['Batch 1', `${FIGURES.runSize} built · ${FIGURES.forSale} for sale`],
                  ['Unit price', FILL_IN],
                  ['Accounts', loading ? '—' : String(profiles.length)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 border-t border-line-row py-[9px] first:border-t-0"
                  >
                    <dt className="dash-eyebrow">{label}</dt>
                    <dd
                      className={`text-[12px] font-semibold ${
                        value === FILL_IN ? 'text-lime' : 'text-ink-1'
                      }`}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </>
        )}

        {tab === 'team' && (
          <>
            <Card pad={18}>
              <CardTitle
                action={
                  <span className="text-[10.5px] font-semibold text-ink-4">
                    {loading ? '—' : `${profiles.length} account${profiles.length === 1 ? '' : 's'}`}
                  </span>
                }
              >
                Team
              </CardTitle>

              {loading ? (
                <div className="flex flex-col gap-[10px]">
                  <Skeleton height={44} />
                  <Skeleton height={44} />
                </div>
              ) : profiles.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No profiles yet"
                  body="Run the migration in supabase/migrations, then reload. Existing accounts are backfilled automatically."
                />
              ) : (
                <div className="flex flex-col">
                  {profiles.map((profile, index) => (
                    <div
                      key={profile.id}
                      className={`flex items-center gap-[10px] py-[13px] ${
                        index === 0 ? '' : 'border-t border-line-row'
                      }`}
                    >
                      <Avatar name={displayName(profile)} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-ink-1">
                          {displayName(profile)}
                          {profile.id === user?.id && (
                            <span className="font-medium text-ink-4"> · you</span>
                          )}
                        </span>
                        <span className="block truncate text-[10.5px] text-ink-4">
                          {profile.email} · joined {longDate(profile.created_at)}
                        </span>
                      </span>
                      <Pill tone={profile.role === 'owner' ? 'lime' : 'grey'} label={profile.role} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card pad={18}>
              <CardTitle>Add someone</CardTitle>
              {!isAdmin ? (
                <p className="text-[11.5px] text-ink-4">
                  Only an admin can create accounts.
                </p>
              ) : (
                <>
                  <p className="mb-[14px] text-[11.5px] text-ink-4">
                    They get an email with a link to set their own password. No password is ever
                    chosen for them or sent over the wire.
                  </p>
                  <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                    <Field
                      label="Full name"
                      value={inviteName}
                      onChange={setInviteName}
                      placeholder="Co-founder name"
                    />
                    <Field
                      label="Email"
                      type="email"
                      value={inviteEmail}
                      onChange={setInviteEmail}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="mt-[14px] flex flex-wrap items-center gap-[7px]">
                    {(['founder', 'owner'] as TeamRole[]).map((role) => (
                      <Tab
                        key={role}
                        label={role}
                        active={inviteRole === role}
                        onClick={() => setInviteRole(role)}
                      />
                    ))}
                  </div>
                  <div className="mt-[14px]">
                    <Button
                      variant="primary"
                      loading={inviting}
                      disabled={!inviteEmail.includes('@')}
                      onClick={() => void invite()}
                    >
                      Send invite
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        {tab === 'notifications' && (
          <>
            <Card pad={18}>
              <CardTitle>What to send</CardTitle>
              {NOTIFICATIONS.map((item, index) => (
                <div key={item.key} className={index === 0 ? '' : 'border-t border-line-row'}>
                  <Toggle
                    checked={prefs[item.key] ?? true}
                    onChange={setPref(item.key)}
                    title={item.title}
                    description={item.description}
                  />
                </div>
              ))}
            </Card>

            <Card pad={18}>
              <CardTitle>Where to send it</CardTitle>
              <Toggle
                checked={prefs.d1 ?? true}
                onChange={setPref('d1')}
                title="Email"
                description={email}
              />
              <div className="border-t border-line-row" />
              <Toggle
                checked={prefs.d2 ?? false}
                onChange={setPref('d2')}
                title="Push"
                description="Browser notifications on this device."
              />
            </Card>

            <p className="text-[11.5px] text-ink-4">
              These preferences are stored in this browser. Nothing sends them yet — the delivery
              job is not built, so treat them as a record of what you want rather than a switch
              that does something today.
            </p>
          </>
        )}
      </PageBody>
    </>
  );
}
