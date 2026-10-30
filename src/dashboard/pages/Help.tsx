/**
 * Help (handoff §5.11).
 *
 * The copy rules card reproduces §14 verbatim. It lives in the product rather
 * than only in a handoff document because the rules are legal constraints —
 * whoever writes the next line of copy needs to be able to find them without
 * digging up a markdown file.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBody, PageHeader } from '../layout/AppShell';
import { Button, Card, CardTitle, Chip, SearchField } from '../ui';
import { HELP_QUESTIONS, HELP_TOPICS } from '../mock';
import { COPY_ALSO_NEVER, COPY_RULES } from '../copyRules';
import { cn } from '../lib/cn';
import { ChevronDown, Chat, Warning } from '../icons';

const POPULAR = ['Launch gates', 'Copy rules', 'Waitlist', 'Publishing an update'];


export default function Help() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number[]>([]);

  const needle = query.trim().toLowerCase();
  const questions = HELP_QUESTIONS.filter(
    (item) =>
      !needle || item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle),
  );
  const topics = HELP_TOPICS.filter(
    (item) =>
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.body.toLowerCase().includes(needle),
  );

  const allOpen = open.length === questions.length && questions.length > 0;

  return (
    <>
      <PageHeader title="Help" description="How to read this dashboard, and the rules for its copy." />

      <PageBody
        rail={
          <Card pad={16}>
            <CardTitle>Still stuck</CardTitle>
            <p className="text-[11.5px] text-ink-4">
              Everything on this dashboard is two people deep. Ask the other one.
            </p>
            <Link
              to="/admin/messages"
              className="on-lime mt-[12px] inline-flex h-[34px] w-full items-center justify-center gap-[7px] rounded-chip bg-lime-grad text-[12px] font-bold text-lime-ink shadow-lime transition hover:brightness-110"
            >
              <Chat size={14} />
              Open messages
            </Link>
          </Card>
        }
      >
        <Card pad={18}>
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search help"
            placeholder="Search help"
            height={40}
            kbd="⌘K"
          />
          <div className="mt-[12px] flex flex-wrap gap-[6px]">
            {POPULAR.map((topic) => (
              <Chip
                key={topic}
                label={topic}
                active={query === topic}
                onClick={() => setQuery(query === topic ? '' : topic)}
              />
            ))}
          </div>
        </Card>

        {topics.length > 0 && (
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <Card key={topic.title} pad={16}>
                <p className="text-[12.5px] font-bold text-ink-1">{topic.title}</p>
                <p className="mt-[5px] text-[11.5px] text-ink-4">{topic.body}</p>
              </Card>
            ))}
          </div>
        )}

        <Card pad={18}>
          <CardTitle
            action={
              questions.length > 0 ? (
                <Button
                  size="sm"
                  onClick={() => setOpen(allOpen ? [] : questions.map((_, index) => index))}
                >
                  {allOpen ? 'Collapse all' : 'Expand all'}
                </Button>
              ) : undefined
            }
          >
            Questions
          </CardTitle>

          {questions.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-ink-4">
              Nothing matches “{query}”.
            </p>
          ) : (
            <div className="flex flex-col">
              {questions.map((item, index) => {
                const expanded = open.includes(index);
                return (
                  <div
                    key={item.q}
                    className={cn(index < questions.length - 1 && 'border-b border-line-row')}
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() =>
                        setOpen((current) =>
                          current.includes(index)
                            ? current.filter((value) => value !== index)
                            : [...current, index],
                        )
                      }
                      className="flex w-full items-center gap-[10px] py-[13px] text-left"
                    >
                      <span className="flex-1 text-[12.5px] font-semibold text-ink-1">
                        {item.q}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-ink-4 transition-transform duration-140',
                          expanded && 'rotate-180',
                        )}
                      >
                        <ChevronDown size={14} />
                      </span>
                    </button>
                    {expanded && (
                      <p className="pb-[14px] text-[11.5px] leading-[1.65] text-ink-3">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card pad={18}>
          <CardTitle
            action={
              <span className="inline-flex items-center gap-[5px] rounded-pill border border-status-rose/30 px-[6px] py-[1px] text-[11px] font-medium text-status-rose">
                <Warning size={11} />
                Legal
              </span>
            }
          >
            Copy rules
          </CardTitle>
          <p className="mb-[14px] text-[11.5px] text-ink-4">
            These are hard constraints, not a style guide. Breaking one is a defect.
          </p>

          <div className="flex flex-col">
            {COPY_RULES.map((rule, index) => (
              <div
                key={rule.never}
                className={cn(
                  'py-[13px]',
                  index < COPY_RULES.length - 1 && 'border-b border-line-row',
                )}
              >
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="text-[12px] font-semibold text-status-rose line-through">
                    {rule.never}
                  </span>
                  <span className="text-ink-5" aria-hidden="true">
                    →
                  </span>
                  <span className="text-[12px] font-bold text-lime">{rule.instead}</span>
                </div>
                <p className="mt-[5px] text-[11px] text-ink-4">{rule.why}</p>
              </div>
            ))}
          </div>

          <p className="mt-[14px] text-[11px] text-ink-4">{COPY_ALSO_NEVER}</p>
        </Card>
      </PageBody>
    </>
  );
}
