import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// Define components outside to avoid recreation on each render
const markdownComponents: Components = {
  // Headers
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-base font-bold mt-3 mb-2 text-slate-800 pb-1 border-b border-slate-200">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="text-sm font-bold mt-3 mb-2 text-slate-800 flex items-center gap-2">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-sm font-semibold mt-2 mb-1 text-slate-700">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="text-xs font-semibold mt-2 mb-1 text-slate-600 uppercase tracking-wide">
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }: { children?: ReactNode }) => (
    <p className="my-1.5 text-slate-700 leading-relaxed text-sm">
      {children}
    </p>
  ),

  // Lists
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-2 space-y-1.5 text-slate-700 ml-0 text-sm">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal list-inside my-2 space-y-1.5 text-slate-700 ml-1 text-sm">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="flex items-start gap-2 leading-relaxed">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2"></span>
      <span>{children}</span>
    </li>
  ),

  // Tables
  table: ({ children }: { children?: ReactNode }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-slate-50">{children}</thead>
  ),
  tbody: ({ children }: { children?: ReactNode }) => (
    <tbody className="bg-white divide-y divide-slate-100">{children}</tbody>
  ),
  tr: ({ children }: { children?: ReactNode }) => (
    <tr className="hover:bg-slate-50 transition-colors">{children}</tr>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="px-3 py-2 text-sm text-slate-700">{children}</td>
  ),

  // Code
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono border border-slate-200">
          {children}
        </code>
      );
    }
    return (
      <code
        className={`block p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed ${className || ''}`}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-2 rounded-lg overflow-hidden">{children}</pre>
  ),

  // Blockquotes (for warnings/notes)
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-3 border-amber-400 pl-3 py-2 my-2 bg-amber-50 text-slate-700 rounded-r-lg text-sm">
      <div className="flex items-start gap-2">
        <span className="text-amber-500 mt-0.5">⚠️</span>
        <div>{children}</div>
      </div>
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-3 border-slate-200" />,

  // Links
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500 transition-colors"
    >
      {children}
    </a>
  ),

  // Strong/Bold
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-slate-800">{children}</strong>
  ),

  // Emphasis/Italic
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic text-slate-600">{children}</em>
  ),
};

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="markdown-content prose prose-sm prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
