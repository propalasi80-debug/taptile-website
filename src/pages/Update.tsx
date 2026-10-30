import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { fetchUpdateBySlug, formatUpdateDate, type Update as UpdatePost } from '../lib/updates';
import Seo from '../components/Seo';
import { WaitlistForm } from '../site/Waitlist';

const markdownComponents: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  a: ({ href, children }) => (
    <a
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => <img src={src} alt={alt ?? ''} loading="lazy" />,
};

export default function Update() {
  const { slug } = useParams<{ slug: string }>();
  const [update, setUpdate] = useState<UpdatePost>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchUpdateBySlug(slug).then((result) => {
      if (cancelled) return;
      setUpdate(result.update);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <section className="page">
        <div className="shell">
          <p className="empty" role="status">
            Loading…
          </p>
        </div>
      </section>
    );
  }

  if (!update && error) {
    return (
      <section className="page">
        <Seo title="Updates" description="Development updates from Taptile." />
        <div className="shell">
          <h1>
            Couldn&apos;t <span className="it">load that.</span>
          </h1>
          <p className="lede" style={{ marginTop: 22 }}>
            {error} Check your connection and try again.
          </p>
          <button type="button" className="btn btn-white" style={{ marginTop: 30 }} onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!update) {
    return (
      <section className="page">
        <Seo title="Update not found" description="That development update does not exist." />
        <div className="shell">
          <span className="eyebrow">404</span>
          <h1>
            Not <span className="it">found.</span>
          </h1>
          <p className="lede" style={{ marginTop: 22 }}>
            That update does not exist, or it has not been published yet.
          </p>
          <Link to="/updates" className="btn btn-white" style={{ marginTop: 30 }}>
            Back to updates
          </Link>
        </div>
      </section>
    );
  }

  return (
    <article className="page" style={{ background: 'var(--haze)' }}>
      <Seo
        title={update.title}
        description={update.excerpt}
        path={`/updates/${update.slug}`}
        image={update.cover}
      />
      <div className="shell article">
        <Link to="/updates" className="back">
          ← All updates
        </Link>
        <div className="post-meta" style={{ marginTop: 34 }}>
          {update.published_at && (
            <>
              <time dateTime={update.published_at}>{formatUpdateDate(update.published_at)}</time>
              {' · '}
            </>
          )}
          {update.author}
        </div>
        <h1>{update.title}</h1>

        {/* Only an admin can ever see this — RLS refuses unpublished rows to
            everyone else — so it doubles as a "you are previewing" marker. */}
        {!update.published && <span className="draft">Draft — not visible to visitors</span>}

        {update.cover && <img className="article-cover" src={update.cover} alt={`Cover image for "${update.title}"`} />}

        <div className="prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {update.body}
          </ReactMarkdown>
        </div>

        <div className="article-foot">
          <Link to="/updates" className="btn btn-ghost">
            Back to updates
          </Link>
        </div>
        <div className="glass" style={{ marginTop: 40, padding: 'clamp(22px, 4vw, 36px)', borderRadius: 24 }}>
          <h2 style={{ fontSize: 28 }}>
            Want one <span className="it">first?</span>
          </h2>
          <div style={{ marginTop: 20 }}>
            <WaitlistForm place="update" />
          </div>
        </div>
      </div>
    </article>
  );
}
