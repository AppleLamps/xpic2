'use client';

import { useMemo, useState, Fragment } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { parseOsintReport, isSectionHeader, getSortedCitations } from '@/lib/report-parser';

interface OsintReportProps {
  content: string;
}

/**
 * Renders a citation as a superscript link
 */
function CitationLink({ number, url }: { number: number; url: string }) {
  return (
    <sup className="inline">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[9px] text-emerald-400 hover:text-emerald-300 transition-colors px-0.5 no-underline hover:underline font-medium"
        title={url}
      >
        {number}
      </a>
    </sup>
  );
}

/**
 * Renders a section header with styling
 */
function SectionHeader({ letter, title }: { letter: string; title: string }) {
  return (
    <div className="mt-10 mb-5 first:mt-0">
      <h3 className="text-emerald-400 text-base font-bold tracking-wider pb-3 border-b border-emerald-500/30 flex items-center gap-3">
        <span className="bg-emerald-500/20 text-emerald-400 w-7 h-7 rounded flex items-center justify-center text-sm font-bold">
          {letter}
        </span>
        <span>{title}</span>
      </h3>
    </div>
  );
}

/**
 * Process inline text to render bold labels, citations, and other formatting
 */
function RichText({
  text,
  citations
}: {
  text: string;
  citations: Map<number, string>;
}) {
  // First, split by citation placeholders
  const segments = text.split(/(\{\{CITE:\d+\}\})/g);

  return (
    <>
      {segments.map((segment, i) => {
        // Check if it's a citation placeholder
        const citeMatch = segment.match(/\{\{CITE:(\d+)\}\}/);
        if (citeMatch) {
          const num = parseInt(citeMatch[1], 10);
          const url = citations.get(num);
          if (url) {
            return <CitationLink key={i} number={num} url={url} />;
          }
          return <sup key={i} className="text-[9px] text-emerald-400/50">{num}</sup>;
        }

        // Process the text segment for bold labels (word followed by colon at start)
        // Match patterns like "Handle:", "Account type:", "Primary domains (ranked):"
        const labelMatch = segment.match(/^([A-Za-z][A-Za-z\s\/\(\)]+):\s*/);
        if (labelMatch && i === 0) {
          const label = labelMatch[1];
          const rest = segment.slice(labelMatch[0].length);
          return (
            <Fragment key={i}>
              <span className="text-emerald-300/90 font-semibold">{label}:</span>
              <span className="text-neutral-300"> {rest}</span>
            </Fragment>
          );
        }

        return <span key={i}>{segment}</span>;
      })}
    </>
  );
}

/**
 * Collapsible references section
 */
function ReferencesSection({ citations }: { citations: Map<number, string> }) {
  const [isOpen, setIsOpen] = useState(false);
  const sortedCitations = getSortedCitations(citations);

  if (sortedCitations.length === 0) return null;

  return (
    <div className="mt-12 pt-6 border-t border-emerald-500/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-emerald-400/80 hover:text-emerald-400 transition-colors text-sm font-semibold tracking-wider uppercase"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
        References ({sortedCitations.length})
      </button>

      {isOpen && (
        <div className="mt-4 space-y-1.5 pl-6 max-h-64 overflow-y-auto">
          {sortedCitations.map(({ number, url }) => (
            <div key={number} className="flex items-start gap-2 text-[11px] py-1">
              <span className="text-emerald-400/70 font-mono min-w-[20px] font-medium">{number}.</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-neutral-300 transition-colors break-all flex items-center gap-1.5 group"
              >
                <span className="truncate max-w-[500px]">{url}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main OSINT Report component
 * Parses and renders the report with proper formatting, clickable citations, and references
 */
export function OsintReport({ content }: OsintReportProps) {
  const { citations, lines } = useMemo(() => {
    const { content: parsedContent, citations } = parseOsintReport(content);
    const lines = parsedContent.split('\n');
    return { parsedContent, citations, lines };
  }, [content]);

  return (
    <div className="text-[13px] leading-relaxed text-neutral-400 select-text cursor-text space-y-0">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        // Check if line is a section header (A) TITLE, B) TITLE, etc.)
        const header = isSectionHeader(trimmedLine);
        if (header) {
          return <SectionHeader key={index} letter={header.letter} title={header.title} />;
        }

        // Empty line = small spacing
        if (trimmedLine === '') {
          return <div key={index} className="h-2" />;
        }

        // Numbered list item (1., 2., etc.)
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex gap-3 py-1 pl-2">
              <span className="text-emerald-500/60 font-mono text-xs min-w-[20px] pt-0.5">{numberedMatch[1]}.</span>
              <span className="flex-1 text-neutral-300">
                <RichText text={numberedMatch[2]} citations={citations} />
              </span>
            </div>
          );
        }

        // Bullet list item (- item)
        if (trimmedLine.startsWith('- ')) {
          const indent = line.length - line.trimStart().length;
          const indentLevel = Math.floor(indent / 2);
          return (
            <div
              key={index}
              className="flex gap-2 py-0.5"
              style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
            >
              <span className="text-emerald-500/50 select-none mt-1.5 w-1 h-1 rounded-full bg-emerald-500/50 flex-shrink-0" />
              <span className="flex-1 text-neutral-300">
                <RichText text={trimmedLine.slice(2)} citations={citations} />
              </span>
            </div>
          );
        }

        // Sub-label line (starts with multiple spaces, like indented content)
        const leadingSpaces = line.length - line.trimStart().length;
        if (leadingSpaces >= 2 && trimmedLine.length > 0) {
          return (
            <div key={index} className="py-0.5 pl-6 text-neutral-400">
              <RichText text={trimmedLine} citations={citations} />
            </div>
          );
        }

        // Regular line
        return (
          <div key={index} className="py-0.5">
            <RichText text={trimmedLine} citations={citations} />
          </div>
        );
      })}

      <ReferencesSection citations={citations} />
    </div>
  );
}
