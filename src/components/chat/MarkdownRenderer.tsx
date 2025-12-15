import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// Define components outside to avoid recreation on each render and fix TypeScript errors
const markdownComponents: Components = {
  // Headers
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="text-lg font-bold mt-3 mb-2 text-[#131416] flex items-center gap-2">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-base font-semibold mt-2 mb-1 text-[#131416]">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="text-sm font-semibold mt-2 mb-1 text-[#131416]">
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }: { children?: ReactNode }) => (
    <p className="my-1.5 text-[#131416] leading-relaxed text-sm">
      {children}
    </p>
  ),

  // Lists
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc list-inside my-2 space-y-1 text-[#131416] ml-1 text-sm">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal list-inside my-2 space-y-1 text-[#131416] ml-1 text-sm">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="ml-1 leading-relaxed">{children}</li>
  ),

  // Tables
  table: ({ children }: { children?: ReactNode }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-gray-50">{children}</thead>
  ),
  tbody: ({ children }: { children?: ReactNode }) => (
    <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
  ),
  tr: ({ children }: { children?: ReactNode }) => (
    <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="px-3 py-2 text-sm text-gray-700">{children}</td>
  ),

  // Code
  code: ({ className, children }: { className?: string; children?: ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 bg-gray-100 text-red-600 rounded text-xs font-mono border border-gray-200">
          {children}
        </code>
      );
    }
    return (
      <code
        className={`block p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono ${className || ''}`}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-2 rounded-lg overflow-hidden">{children}</pre>
  ),

  // Blockquotes (for warnings/disclaimers)
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="border-l-4 border-amber-500 pl-3 py-1.5 my-2 bg-amber-50 text-gray-700 rounded-r-lg text-sm">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-3 border-gray-200" />,

  // Links
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
    >
      {children}
    </a>
  ),

  // Strong/Bold
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-[#131416]">{children}</strong>
  ),

  // Emphasis/Italic
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic text-gray-700">{children}</em>
  ),
};

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
