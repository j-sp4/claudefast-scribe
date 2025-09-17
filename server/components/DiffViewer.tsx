'use client';

import { useMemo } from 'react';

interface DiffViewerProps {
  original: string;
  proposed: string;
  changeKind: 'replace' | 'append' | 'prepend';
}

export function DiffViewer({ original, proposed, changeKind }: DiffViewerProps) {
  const { added, removed, unchanged } = useMemo(() => {
    const originalLines = original.split('\n');
    const proposedLines = proposed.split('\n');
    
    if (changeKind === 'replace') {
      return {
        removed: originalLines,
        added: proposedLines,
        unchanged: [],
      };
    } else if (changeKind === 'append') {
      return {
        removed: [],
        added: proposedLines,
        unchanged: originalLines,
      };
    } else { // prepend
      return {
        removed: [],
        added: proposedLines,
        unchanged: originalLines,
      };
    }
  }, [original, proposed, changeKind]);

  const renderLine = (line: string, type: 'added' | 'removed' | 'unchanged', index: number) => {
    const bgColor = type === 'added' ? 'bg-green-50' : type === 'removed' ? 'bg-red-50' : '';
    const textColor = type === 'added' ? 'text-green-700' : type === 'removed' ? 'text-red-700' : 'text-gray-700';
    const prefix = type === 'added' ? '+ ' : type === 'removed' ? '- ' : '  ';
    
    return (
      <div key={`${type}-${index}`} className={`${bgColor} ${textColor} font-mono text-sm`}>
        <span className="select-none opacity-50">{prefix}</span>
        <span>{line || ' '}</span>
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
        <span className="text-sm font-medium text-gray-700">
          Change Type: <span className="capitalize">{changeKind}</span>
        </span>
      </div>
      
      <div className="max-h-[600px] overflow-y-auto p-3 bg-white">
        {changeKind === 'replace' ? (
          <>
            <div className="mb-4">
              <div className="text-xs font-semibold text-red-600 mb-1">Removed:</div>
              {removed.map((line, i) => renderLine(line, 'removed', i))}
            </div>
            <div>
              <div className="text-xs font-semibold text-green-600 mb-1">Added:</div>
              {added.map((line, i) => renderLine(line, 'added', i))}
            </div>
          </>
        ) : changeKind === 'prepend' ? (
          <>
            <div className="mb-4">
              <div className="text-xs font-semibold text-green-600 mb-1">Added at beginning:</div>
              {added.map((line, i) => renderLine(line, 'added', i))}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Existing content:</div>
              {unchanged.slice(0, 5).map((line, i) => renderLine(line, 'unchanged', i))}
              {unchanged.length > 5 && (
                <div className="text-sm text-gray-500 italic mt-2">
                  ... and {unchanged.length - 5} more lines
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-600 mb-1">Existing content:</div>
              {unchanged.slice(-5).map((line, i) => renderLine(line, 'unchanged', i))}
              {unchanged.length > 5 && (
                <div className="text-sm text-gray-500 italic mb-2">
                  ... showing last 5 lines of {unchanged.length} total
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-green-600 mb-1">Added at end:</div>
              {added.map((line, i) => renderLine(line, 'added', i))}
            </div>
          </>
        )}
      </div>
      
      <div className="bg-gray-100 px-3 py-2 border-t border-gray-300 text-xs text-gray-600">
        {changeKind === 'replace' 
          ? `${removed.length} lines removed, ${added.length} lines added`
          : changeKind === 'append'
          ? `${added.length} lines appended`
          : `${added.length} lines prepended`}
      </div>
    </div>
  );
}

export function SimpleDiff({ before, after }: { before: string; after: string }) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-xs font-semibold text-red-600 mb-2">Before</div>
          <pre className="text-sm font-mono text-red-700 whitespace-pre-wrap">
            {before}
          </pre>
        </div>
      </div>
      <div>
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="text-xs font-semibold text-green-600 mb-2">After</div>
          <pre className="text-sm font-mono text-green-700 whitespace-pre-wrap">
            {after}
          </pre>
        </div>
      </div>
    </div>
  );
}