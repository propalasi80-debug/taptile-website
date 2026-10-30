/**
 * One nav array, not eleven sidebars.
 *
 * Everything that renders navigation — the desktop sidebar, the phone tab bar,
 * the More menu and the breadcrumb — reads this. Adding a page means adding a
 * line here and a route, and nothing else.
 */

import {
  Chat,
  Gear,
  Grid,
  Help,
  type Icon,
  Package,
  Play,
  Rocket,
  Users,
} from '../icons';

export interface NavItem {
  label: string;
  to: string;
  icon: Icon;
  /** Unread count rendered beside the label. */
  badge?: number;
  /** True when the route is real data rather than the sample set. */
  live?: boolean;
}

export const ROOT = '/admin';

export const NAV: { dashboards: NavItem[]; settings: NavItem[] } = {
  // Revenue, Orders, Production and Costs are left out until they have data:
  // a menu of empty pages is four dead ends. Their routes still exist.
  dashboards: [
    { label: 'Overview', to: ROOT, icon: Grid },
    { label: 'Inventory', to: `${ROOT}/inventory`, icon: Package, live: true },
    { label: 'Launch', to: `${ROOT}/launch`, icon: Rocket },
    { label: 'Customers', to: `${ROOT}/customers`, icon: Users, live: true },
    { label: 'Content', to: `${ROOT}/content`, icon: Play, live: true },
  ],
  settings: [
    { label: 'Messages', to: `${ROOT}/messages`, icon: Chat },
    { label: 'Settings', to: `${ROOT}/settings`, icon: Gear },
    { label: 'Help', to: `${ROOT}/help`, icon: Help },
  ],
};

export const ALL_NAV: NavItem[] = [...NAV.dashboards, ...NAV.settings];

/** The four that get a phone tab. Everything else lives behind More. */
export const PHONE_TABS = NAV.dashboards.slice(0, 4);

export const MORE_ROUTE = `${ROOT}/more`;

/** Pages reachable only through More on a phone. */
export const MORE_ITEMS: NavItem[] = [...NAV.dashboards.slice(4), ...NAV.settings];

export function titleFor(pathname: string): string {
  if (pathname === MORE_ROUTE) return 'More';
  const match = ALL_NAV.filter((item) => item.to === pathname).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  return match?.label ?? 'Overview';
}
