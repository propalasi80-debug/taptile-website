import { useEffect, useRef, useState, type ReactNode } from 'react';
import './dialect-hero.css';

/**
 * WhooshHero — the front-page hero, laid out 1:1 on Apple's iPad Air page,
 * with the Dialect film in the product slot. It plays the moment the page
 * opens (no scroll needed), once:
 *
 *   0–3 s   the film's own small "Taptile dialect" title sits in the middle;
 *           the pad rises up and covers it
 *   4–6 s   the pad splits in two: keys-up in front, underglow side behind;
 *           the giant "Dial in." resolves BEHIND them
 *   7–8 s   the lockup (logo + "Taptile dialect") settles in above, like
 *           Apple's "iPad air"
 *
 * Playback:
 *  - Chrome, Edge, Firefox, Android: one transparent VP9 WebM — 1600 px at
 *    60 fps on desktop, 900 px at 30 fps on phones. The word sits behind it in normal stacking order.
 *  - Safari / iOS (WebKit ignores WebM alpha): 240 transparent WebP frames,
 *    packed four to a 2 x 2 sheet (60 files), drawn to a <canvas>, all
 *    preloaded before the clock starts.
 *  - Reduced motion, or autoplay blocked (Low Power Mode): the last frame,
 *    everything shown.
 * The word and lockup are keyed to the frame on screen, so they can't drift.
 */

const N = 240;
const FPS = 30;
const BASE = '/media/dialect-hero';
const pad = (i: number) => String(i).padStart(4, '0');
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** easeOutBack: overshoots ~6% then settles, like a lightly under-damped spring */
const back = (x: number) => {
  const t = clamp01(x);
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

function isWebKitOnly() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox|Android/.test(ua);
  return iOS || safari;
}

export default function WhooshHero({ below }: { below?: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [reduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [mode, setMode] = useState<'video' | 'canvas'>(() => (isWebKitOnly() ? 'canvas' : 'video'));
  const [px] = useState(() => (typeof window === 'undefined' ? 1600 : window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)));
  // film size by the pixels it will actually fill: 2560 on large/retina desktops, 1600, or 900 on phones
  const big = px >= 1200;
  const film = px >= 2000 ? 'film-2560' : big ? 'film-1600' : 'film-900';
  const [done, setDone] = useState(reduce);
  const lastW = useRef('');

  // keyed to the film frame (30 fps clock): the word pops in 118→150 as the pads split,
  // the lockup pops in 192→218 as they settle. Pop = quick fade + a spring-like scale with
  // a small overshoot (easeOutBack), so both land with weight instead of drifting in.
  const lastB = useRef('');
  const sync = (f: number) => {
    const el = root.current;
    if (!el) return;
    // the pad covers the film's own small title, splits (≈150), then "Dial in." pops in behind
    const wt = clamp01((f - 150) / 30);
    const bt = clamp01((f - 196) / 34);
    const w = `${smooth(Math.min(1, wt * 1.7)).toFixed(3)}|${back(wt).toFixed(3)}`;
    const b = smooth(bt).toFixed(3);
    if (w !== lastW.current) {
      const [o, sc] = w.split('|');
      el.style.setProperty('--word-o', o as string);
      el.style.setProperty('--word-s', sc as string);
      lastW.current = w;
    }
    if (b !== lastB.current) {
      el.style.setProperty('--below-o', b);
      lastB.current = b;
    }
  };

  /* --------------------------------------------- depth: pointer tilt + scroll parallax
     Two critically damped springs (response ≈ .55 s) follow the pointer, so the pads lean
     toward it and "Dial in." drifts the other way; scrolling lifts the pads faster than the
     word and fades the word out. Fine pointers only; nothing at all with reduced motion. */
  useEffect(() => {
    if (reduce) return undefined;
    const el = root.current;
    if (!el) return undefined;
    const fine = window.matchMedia('(pointer: fine)').matches;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, raf = 0, last = 0;
    const k = Math.pow((2 * Math.PI) / 0.55, 2), c = (4 * Math.PI) / 0.55;
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      vx += (-k * (x - tx) - c * vx) * dt; x += vx * dt;
      vy += (-k * (y - ty) - c * vy) * dt; y += vy * dt;
      el.style.setProperty('--px', x.toFixed(4));
      el.style.setProperty('--py', y.toFixed(4));
      raf = Math.abs(x - tx) + Math.abs(y - ty) + Math.abs(vx) + Math.abs(vy) > 0.0005 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };
    let sraf = 0;
    const onScroll = () => {
      if (sraf) return;
      sraf = requestAnimationFrame(() => {
        sraf = 0;
        const h = el.offsetHeight || 1;
        el.style.setProperty('--sy', clamp01(window.scrollY / h).toFixed(4));
      });
    };
    if (fine) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(sraf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, [reduce]);

  /* ------------------------------------------------------- video path */
  useEffect(() => {
    if (mode !== 'video' || reduce) return undefined;
    const v = video.current;
    if (!v) return undefined;
    let raf = 0;
    const loop = () => {
      sync(v.currentTime * FPS);
      if (!v.ended) raf = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    };
    const onEnd = () => {
      sync(N);
      setDone(true);
    };
    v.addEventListener('playing', onPlay);
    v.addEventListener('ended', onEnd);
    v.play().catch(() => {
      // autoplay refused (an iframe, Low Power Mode): play the same film from frames instead,
      // so the opening always runs rather than jumping straight to the end pose
      setMode('canvas');
    });
    const safety = window.setTimeout(onEnd, 15000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      v.removeEventListener('playing', onPlay);
      v.removeEventListener('ended', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, reduce]);

  /* ------------------------------------------------------ canvas path */
  useEffect(() => {
    if (mode !== 'canvas' && !reduce) return undefined;
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return undefined;
    const set = big ? 'd' : 'm';
    const order = reduce ? [N - 1] : [...Array(N).keys()];
    const frames: (HTMLImageElement | null)[] = new Array(N).fill(null);
    let alive = true;
    let raf = 0;
    let last = -1;

    const fit = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      last = -1;
    };
    const draw = (i: number) => {
      const im = frames[i];
      if (!im || i === last) return;
      // four frames per 2 x 2 sheet
      const q = i % 4;
      const w = im.naturalWidth / 2;
      const h = im.naturalHeight / 2;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(im, (q % 2) * w, Math.floor(q / 2) * h, w, h, 0, 0, cv.width, cv.height);
      last = i;
    };
    const start = () => {
      if (!alive) return;
      if (reduce) {
        draw(N - 1);
        sync(N);
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const f = Math.min(N - 1, ((now - t0) / 1000) * FPS);
        draw(Math.floor(f));
        sync(f);
        if (f < N - 1) raf = requestAnimationFrame(tick);
        else setDone(true);
      };
      raf = requestAnimationFrame(tick);
    };

    // load every frame (8 at a time) and decode it before the clock starts,
    // so playback never waits on the network or the decoder
    const sheets = [...new Set(order.map((i) => Math.floor(i / 4)))];
    let next = 0;
    let finished = 0;
    const pump = () => {
      while (next < sheets.length && next - finished < 4) {
        const k = sheets[next++] as number;
        const im = new Image();
        im.src = `${BASE}/${set}s/${pad(k + 1)}.webp`;
        im.decode()
          .catch(() => undefined)
          .then(() => {
            for (let q = 0; q < 4 && k * 4 + q < N; q++) frames[k * 4 + q] = im;
            finished += 1;
            if (k === 0) draw(0);
            if (finished === sheets.length) start();
            else pump();
          });
      }
    };
    fit();
    pump();
    const ro = new ResizeObserver(() => {
      const keep = last;
      fit();
      draw(keep < 0 ? 0 : keep);
    });
    ro.observe(cv);
    const safety = window.setTimeout(() => {
      if (alive && finished < sheets.length) {
        sync(N);
        setDone(true);
      }
    }, 20000);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, reduce, big]);

  const label =
    'A white Taptile Dialect macro pad rises and splits into two: the white one shows its nine keys and two silver dials, the black one behind it shows its underside and underglow LEDs.';

  return (
    <section ref={root} className={`wh ${done ? 'is-done' : ''} ${reduce ? 'is-static' : ''}`} aria-label="Taptile Dialect">
      <div className="wh-stage">
        <h1 className="sr-only">Taptile Dialect</h1>
        <p className="wh-word" aria-hidden="true">
          Dial in.
        </p>
        {/* pencil marks around the word, never over the pads */}
        <div className="wh-box">
        <i className="wh-shadow" aria-hidden="true" />
        {mode === 'video' && !reduce ? (
          <video
            ref={video}
            className="wh-film"
            muted
            playsInline
            autoPlay
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            aria-label={label}
          >
            <source src={`${BASE}/${film}.webm`} type='video/webm; codecs="vp09.00.10.08"' />
          </video>
        ) : (
          <canvas ref={canvas} className="wh-film" role="img" aria-label={label} />
        )}
        </div>
      </div>
      {below && <div className="wh-below">{below}</div>}
    </section>
  );
}
