/**
 * One nav array, not eleven sidebars.
 *
 * Everything that renders navigation — the desktop sidebar, the phone tab bar,
 * the More menu and the breadcrumb — reads this. Adding a page means adding a
 * line here and a route, and nothing else.
 */

import {
  Box,
  Chat,
  Chip,
  Coin,
  Gear,
  Package,
  Grid,
  Help,
  type Icon,
  Play,
  Rocket,
  Users,
  Wallet,
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
  dashboards: [
    { label: 'Overview', to: ROOT, icon: Grid },
    { label: 'Revenue', to: `${ROOT}/revenue`, icon: Coin },
    { label: 'Orders', to: `${ROOT}/orders`, icon: Box },
    { label: 'Production', to: `${ROOT}/production`, icon: Chip },
    { label: 'Inventory', to: `${ROOT}/inventory`, icon: Package, live: true },
    { label: 'Costs', to: `${ROOT}/costs`, icon: Wallet },
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

/** The five that get a phone tab. Everything else lives behind More. */
export const PHONE_TABS = [
  NAV.dashboards[0]!,
  NAV.dashboards[1]!,
  NAV.dashboards[2]!,
  NAV.dashboards[6]!,
];

export const MORE_ROUTE = `${ROOT}/more`;

/** Pages reachable only through More on a phone. */
export const MORE_ITEMS: NavItem[] = [
  NAV.dashboards[3]!,
  NAV.dashboards[4]!,
  NAV.dashboards[5]!,
  NAV.dashboards[7]!,
  NAV.dashboards[8]!,
  ...NAV.settings,
];

export function titleFor(pathname: string): string {
  if (pathname === MORE_ROUTE) return 'More';
  const match = ALL_NAV.filter((item) => item.to === pathname).sort(
    (a, b) => b.to.length - a.to.length,
  )[0];
  return match?.label ?? 'Overview';
}
