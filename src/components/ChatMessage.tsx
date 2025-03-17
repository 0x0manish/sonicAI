"use client";

import React, { useState, useEffect } from 'react';
import { Message } from '@/lib/ai-utils';
import { UserIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import Image from 'next/image';

// Add custom styles for markdown content
const markdownStyles = `
  .markdown-content pre {
    margin: 1em 0;
    background-color: rgb(31, 41, 55);
    border-radius: 0.375rem;
    padding: 0.75rem;
    overflow-x: auto;
  }
  
  .dark .markdown-content pre {
    background-color: rgb(17, 24, 39);
  }
  
  .markdown-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875em;
  }
  
  .markdown-content pre code {
    color: rgb(229, 231, 235);
    padding: 0;
    background-color: transparent;
  }
  
  .markdown-content p code,
  .markdown-content .inline-code {
    background-color: rgb(243, 244, 246);
    color: rgb(31, 41, 55);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    border: 1px solid rgb(229, 231, 235);
  }
  
  .dark .markdown-content p code,
  .dark .markdown-content .inline-code {
    background-color: rgb(31, 41, 55);
    color: rgb(229, 231, 235);
    border: 1px solid rgb(55, 65, 81);
  }
`;

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
      if (event.message && (event.message.includes('markdown') || event.message.includes('hydration'))) {
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
      <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
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
            return inline ? (
              // For inline code
              <code className="inline-code" {...props}>
                {children}
              </code>
            ) : null; // Return null for block code, let the pre component handle it
          },
          // Handle pre elements directly to avoid nesting issues
          pre: ({ node, children, ...props }: any) => {
            // Find the code element inside pre
            const codeElement = React.Children.toArray(children).find(
              (child) => React.isValidElement(child) && child.type === 'code'
            );
            
            // If there's a code element, extract its props
            if (codeElement && React.isValidElement(codeElement)) {
              const codeProps = codeElement.props as { className?: string; children?: React.ReactNode };
              const { className, children: codeChildren } = codeProps;
              const match = className ? /language-(\w+)/.exec(className) : null;
              
              return (
                <pre {...props}>
                  <code className={match ? `language-${match[1]}` : ''}>
                    {codeChildren}
                  </code>
                </pre>
              );
            }
            
            // Fallback to just rendering the pre with its children
            return <pre {...props}>{children}</pre>;
          },
          // Simplify paragraph handling
          p: ({ node, children, ...props }: any) => {
            return <p {...props}>{children}</p>;
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
      {/* Add style tag for markdown content */}
      <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-4.5 h-4.5 text-gray-700 dark:text-gray-300" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <Image 
                src="/logo.jpeg" 
                alt="Sonic AI" 
                width={32} 
                height={32} 
                className="object-cover"
                priority
              />
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