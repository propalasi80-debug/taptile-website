/**
 * Legal document text (privacy, terms, shipping, returns).
 *
 * Static markdown in git, not the Supabase-backed devlog table — these need
 * PR review and a paper trail when they change, not a live editor.
 */

const files = import.meta.glob('../content/legal/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export function getLegalDoc(name: 'privacy' | 'terms' | 'shipping' | 'returns'): string {
  const entry = Object.entries(files).find(([path]) => path.endsWith(`/${name}.md`));
  if (!entry) throw new Error(`Missing legal doc: ${name}`);
  return entry[1];
}
