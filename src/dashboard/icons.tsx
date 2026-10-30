/**
 * Dashboard icon set.
 *
 * These are traced from the artboards rather than pulled from an icon package.
 * The handoff names lucide, but the drawn set is bespoke — the Launch rocket
 * and the Production chip in particular have no lucide equivalent — and
 * matching the artboards matters more than matching a library. It also keeps a
 * 30-icon dependency out of a bundle that is already over the warning line.
 *
 * Every icon is a 24×24 viewBox on `currentColor` with round caps and joins.
 * Stroke weight varies by context (1.7–1.8 nav, 2 controls, 2.2–2.4 emphasis),
 * so it is a prop with the artboard value as the default.
 */

import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  weight?: number;
}

export type Icon = (props: IconProps) => JSX.Element;

function make(body: ReactNode, defaultWeight = 1.8): Icon {
  return function IconComponent({ size = 16, weight, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={weight ?? defaultWeight}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {body}
      </svg>
    );
  };
}

// ------------------------------------------------------------------- nav ---

export const Grid = make(
  <>
    <rect x="3" y="3" width="7" height="8" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="11" width="7" height="10" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </>,
  2,
);

export const Coin = make(
  <>
    <line x1="12" y1="4" x2="12" y2="20" />
    <path d="M16 7.5A3.5 3.5 0 0 0 12.5 5h-1a3 3 0 0 0 0 6h1a3 3 0 0 1 0 6h-1A3.5 3.5 0 0 1 8 16.5" />
  </>,
  1.7,
);

export const Box = make(
  <>
    <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7z" />
    <path d="M3.5 7 12 11.3 20.5 7" />
    <line x1="12" y1="11.3" x2="12" y2="21.2" />
  </>,
  1.7,
);

export const Chip = make(
  <>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <line x1="12" y1="2.5" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="21.5" />
    <line x1="2.5" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="21.5" y2="12" />
    <line x1="7.5" y1="3.5" x2="7.5" y2="7" />
    <line x1="16.5" y1="3.5" x2="16.5" y2="7" />
  </>,
  1.7,
);

export const Wallet = make(
  <>
    <rect x="2.5" y="5.5" width="19" height="13" rx="3" />
    <path d="M16 12h5.5" />
    <circle cx="16.8" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </>,
  1.7,
);

export const Rocket = make(
  <>
    <path d="M12 2.5c3.4 2.4 5 5.9 5 9.5l-2.6 3.2H9.6L7 12c0-3.6 1.6-7.1 5-9.5z" />
    <circle cx="12" cy="10" r="1.9" />
    <path d="M9.6 15.2 7.4 19l3-1 1.6 3 1.6-3 3 1-2.2-3.8" />
  </>,
  1.7,
);

export const Users = make(
  <>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6" />
    <path d="M18 14.6A6.5 6.5 0 0 1 21.5 20" />
  </>,
  1.7,
);

export const Play = make(
  <>
    <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
    <polygon points="10.5 9 15.5 12 10.5 15" />
  </>,
  1.7,
);

export const Chat = make(
  <path d="M20 4H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />,
  1.7,
);

export const Gear = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0V21a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15H2.7a2 2 0 1 1 0-4H3a1.6 1.6 0 0 0 1.1-2.8L4 8.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.6 4.3V4a2 2 0 1 1 4 0v.3a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.6 1z" />
  </>,
  1.7,
);

export const Help = make(
  <>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.3 9.3a2.8 2.8 0 1 1 3.7 2.6c-.6.2-1 .8-1 1.5v.4" />
    <line x1="12" y1="17.2" x2="12" y2="17.3" />
  </>,
  1.7,
);

// -------------------------------------------------------------- controls ---

export const Search = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.7" y2="16.7" />
  </>,
  2,
);

export const ChevronDown = make(<polyline points="6 9 12 15 18 9" />, 2);

export const ArrowRight = make(
  <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </>,
  2,
);

export const Download = make(
  <>
    <line x1="12" y1="3.5" x2="12" y2="15" />
    <polyline points="7.5 11 12 15.5 16.5 11" />
    <path d="M4 18.5h16" />
  </>,
  2,
);

export const Refresh = make(
  <>
    <polyline points="20 5 20 10 15 10" />
    <path d="M20 10a8 8 0 1 0-1.6 6" />
  </>,
  2,
);

export const Bell = make(
  <>
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
  </>,
  2,
);

export const Dots = make(
  <>
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </>,
  2,
);

export const Plus = make(
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>,
  2,
);

export const Minus = make(<line x1="5" y1="12" x2="19" y2="12" />, 2);

export const Close = make(
  <>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </>,
  2,
);

export const Check = make(<polyline points="4 12.5 9.5 18 20 6.5" />, 2.4);

export const Warning = make(
  <>
    <path d="M12 3.5 21.5 20H2.5z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <line x1="12" y1="17" x2="12" y2="17.1" />
  </>,
  2,
);

export const Calendar = make(
  <>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="2.5" x2="8" y2="6" />
    <line x1="16" y1="2.5" x2="16" y2="6" />
  </>,
  2,
);

export const Clock = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6.8 12 12 15.6 14" />
  </>,
  2,
);

export const MapPin = make(
  <>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </>,
  2,
);

export const Globe = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="4" ry="9" />
    <line x1="3.2" y1="9" x2="20.8" y2="9" />
    <line x1="3.2" y1="15" x2="20.8" y2="15" />
  </>,
  2,
);

export const Mail = make(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <polyline points="3.5 7 12 13 20.5 7" />
  </>,
  2,
);

export const Tag = make(
  <path d="M15.5 3.5a5.5 5.5 0 0 0-5 7.7L3.5 18.2l2.3 2.3 7-7a5.5 5.5 0 1 0 2.7-10z" />,
  2,
);

export const Flask = make(
  <>
    <line x1="12" y1="2.5" x2="12" y2="8" />
    <path d="M6.5 8h11v4a5.5 5.5 0 0 1-11 0z" />
    <line x1="12" y1="17.5" x2="12" y2="21.5" />
  </>,
  2,
);

export const Shield = make(
  <path d="M12 3 4.5 6v6c0 4.6 3.1 7.9 7.5 9 4.4-1.1 7.5-4.4 7.5-9V6z" />,
  2,
);

export const Truck = make(
  <>
    <rect x="1.5" y="6.5" width="12" height="9" rx="1.5" />
    <path d="M13.5 9.5H18l3.5 3.5v2.5h-8z" />
    <circle cx="6" cy="17.5" r="2" />
    <circle cx="17" cy="17.5" r="2" />
  </>,
  2,
);

export const Printer = make(
  <>
    <rect x="6" y="3" width="12" height="5" rx="1" />
    <path d="M6 17H4.5A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9h15A1.5 1.5 0 0 1 21 10.5v5a1.5 1.5 0 0 1-1.5 1.5H18" />
    <rect x="6" y="14" width="12" height="7" rx="1" />
  </>,
  2,
);

export const TrendUp = make(
  <>
    <polyline points="4 15 9.5 9.5 13.5 13.5 20 6" />
    <polyline points="15 6 20 6 20 11" />
  </>,
  2,
);

export const Flag = make(
  <>
    <line x1="5" y1="3" x2="5" y2="21" />
    <path d="M5 4.5h11l-2 3.5 2 3.5H5z" />
  </>,
  2,
);

export const Spark = make(
  <>
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
    <circle cx="12" cy="12" r="3.2" />
  </>,
  2,
);

export const Frame = make(
  <>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" />
  </>,
  2,
);

export const Package = make(
  <>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="M3 7.5 12 12l9-4.5" />
    <line x1="12" y1="12" x2="12" y2="21" />
  </>,
  2,
);
