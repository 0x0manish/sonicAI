"use client";

import React, { useState, useEffect } from 'react';
import { Message } from '@/lib/ai-utils';
import { UserIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface ChatMessageProps {
  message: Message;
}

// Simple error handling component for markdown rendering
function SafeMarkdown({ children }: { children: string }) {
  const [hasError, setHasError] = useState(false);

  // Use effect to catch errors during rendering
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Only handle errors from this component
      if (event.message && event.message.includes('markdown')) {
        console.error('Markdown rendering error:', event);
        setHasError(true);
        // Prevent the error from bubbling up
        event.preventDefault();
      }
    };

    // Add error event listener
    window.addEventListener('error', handleError);
    
    // Clean up
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    // Fallback UI when markdown rendering fails
    return (
      <div className="text-gray-800 dark:text-gray-200">
        {children}
      </div>
    );
  }

  // Try to render markdown, fallback to plain text if it fails
  try {
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Customize code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="bg-gray-800 dark:bg-gray-900 rounded-md p-3 overflow-x-auto">
                <code
                  className={match ? `language-${match[1]}` : ''}
                  {...props}
                >
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded" {...props}>
                {children}
              </code>
            );
          },
          // Customize links to open in new tab and handle errors
          a: ({ node, children, href, ...props }: any) => {
            try {
              return (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  {...props}
                >
                  {children}
                </a>
              );
            } catch (error) {
              console.error('Error rendering link:', error);
              return <span>{children}</span>;
            }
          },
          // Customize tables
          table: ({ node, children, ...props }: any) => {
            return (
              <div className="overflow-x-auto">
                <table className="border-collapse border border-gray-300 dark:border-gray-700" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          // Style table headers
          th: ({ node, children, ...props }: any) => {
            return (
              <th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left" {...props}>
                {children}
              </th>
            );
          },
          // Style table cells
          td: ({ node, children, ...props }: any) => {
            return (
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2" {...props}>
                {children}
              </td>
            );
          }
        }}
      >
        {children}
      </ReactMarkdown>
    );
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return <div className="text-gray-800 dark:text-gray-200">{children}</div>;
  }
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`px-4 py-4 ${isUser ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} border-b border-gray-100 dark:border-gray-800`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
              {/* Empty icon for Sonic AI */}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          {isUser ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {message.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < message.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
              <SafeMarkdown>
                {message.content}
              </SafeMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 