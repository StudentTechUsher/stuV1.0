'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';

interface SecurityDoc {
  id: string;
  title: string;
  description: string;
  filename: string;
  content: string;
  category: 'core' | 'compliance' | 'procedures';
}

interface SecurityDocViewerProps {
  docs: SecurityDoc[];
}

export default function SecurityDocViewer({ docs }: SecurityDocViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<SecurityDoc | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAsPDF = async (doc: SecurityDoc) => {
    setIsDownloading(true);
    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const maxLineWidth = pageWidth - 2 * margin;

      let yPosition = margin;

      // Helper to add page if needed
      const checkAddPage = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      checkAddPage(30);
      pdf.text(doc.title, margin, yPosition);
      yPosition += 40;

      // Process markdown content line by line
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const lines = doc.content.split('\n');

      for (const line of lines) {
        // Skip YAML frontmatter or metadata
        if (line.startsWith('**Last Updated:**') || line.startsWith('**Document Version:**')) {
          continue;
        }

        // Handle headers
        if (line.startsWith('# ')) {
          checkAddPage(30);
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          const text = line.replace(/^# /, '');
          pdf.text(text, margin, yPosition);
          yPosition += 25;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          continue;
        }

        if (line.startsWith('## ')) {
          checkAddPage(25);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          const text = line.replace(/^## /, '');
          pdf.text(text, margin, yPosition);
          yPosition += 20;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          continue;
        }

        if (line.startsWith('### ')) {
          checkAddPage(20);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const text = line.replace(/^### /, '');
          pdf.text(text, margin, yPosition);
          yPosition += 18;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          continue;
        }

        // Handle bullet points
        if (line.match(/^[\s]*[-*•]/)) {
          const text = line.replace(/^[\s]*[-*•]\s*/, '');
          if (text.trim()) {
            checkAddPage(15);
            const wrappedLines = pdf.splitTextToSize(`• ${text}`, maxLineWidth - 20);
            pdf.text(wrappedLines, margin + 20, yPosition);
            yPosition += wrappedLines.length * 14;
          }
          continue;
        }

        // Handle numbered lists
        if (line.match(/^[\s]*\d+\./)) {
          const text = line.replace(/^[\s]*\d+\.\s*/, '');
          if (text.trim()) {
            checkAddPage(15);
            const wrappedLines = pdf.splitTextToSize(line, maxLineWidth - 20);
            pdf.text(wrappedLines, margin + 20, yPosition);
            yPosition += wrappedLines.length * 14;
          }
          continue;
        }

        // Handle empty lines
        if (line.trim() === '') {
          yPosition += 10;
          continue;
        }

        // Handle horizontal rules
        if (line.match(/^[-*_]{3,}$/)) {
          checkAddPage(10);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 15;
          continue;
        }

        // Regular text
        if (line.trim()) {
          // Remove markdown formatting for PDF
          const cleanText = line
            .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold
            .replace(/\*(.+?)\*/g, '$1')       // Remove italic
            .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
            .replace(/`(.+?)`/g, '$1');        // Remove code formatting

          checkAddPage(15);
          const wrappedLines = pdf.splitTextToSize(cleanText, maxLineWidth);
          pdf.text(wrappedLines, margin, yPosition);
          yPosition += wrappedLines.length * 14;
        }
      }

      // Add footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Page ${i} of ${totalPages} | ${doc.title}`,
          margin,
          pageHeight - 20
        );
      }

      // Save the PDF
      pdf.save(`${doc.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'core':
        return 'Core Security';
      case 'compliance':
        return 'Compliance';
      case 'procedures':
        return 'Procedures';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'compliance':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'procedures':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Group docs by category
  const groupedDocs = docs.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, SecurityDoc[]>);

  return (
    <div className="space-y-8">
      {/* Document List */}
      {!selectedDoc && (
        <div className="space-y-6">
          {Object.entries(groupedDocs).map(([category, categoryDocs]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {getCategoryLabel(category)}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {doc.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(doc.category)}`}>
                          {getCategoryLabel(doc.category)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {doc.description}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          View Document
                        </button>
                        <button
                          onClick={() => downloadAsPDF(doc)}
                          disabled={isDownloading}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download as PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer */}
      {selectedDoc && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
          <div className="border-b border-gray-200 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedDoc.title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedDoc.description}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => downloadAsPDF(selectedDoc)}
                disabled={isDownloading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Back to List
              </button>
            </div>
          </div>
          <div className="p-8 prose prose-blue max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children, ...props }) => <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4" {...props}>{children}</h1>,
                h2: ({ children, ...props }) => <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3" {...props}>{children}</h2>,
                h3: ({ children, ...props }) => <h3 className="text-xl font-bold text-gray-900 mt-4 mb-2" {...props}>{children}</h3>,
                h4: ({ children, ...props }) => <h4 className="text-lg font-semibold text-gray-900 mt-3 mb-2" {...props}>{children}</h4>,
                p: ({ children, ...props }) => <p className="text-gray-700 mb-4 leading-relaxed" {...props}>{children}</p>,
                ul: ({ children, ...props }) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700" {...props}>{children}</ul>,
                ol: ({ children, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700" {...props}>{children}</ol>,
                li: ({ children, ...props }) => <li className="ml-4" {...props}>{children}</li>,
                code: ({ children, ...props }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800" {...props}>{children}</code>,
                pre: ({ children, ...props }) => <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto mb-4" {...props}>{children}</pre>,
                blockquote: ({ children, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4" {...props}>{children}</blockquote>,
                table: ({ children, ...props }) => <div className="overflow-x-auto mb-4"><table className="min-w-full divide-y divide-gray-300 border border-gray-300" {...props}>{children}</table></div>,
                thead: ({ children, ...props }) => <thead className="bg-gray-50" {...props}>{children}</thead>,
                tbody: ({ children, ...props }) => <tbody className="divide-y divide-gray-200 bg-white" {...props}>{children}</tbody>,
                tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
                th: ({ children, ...props }) => <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900" {...props}>{children}</th>,
                td: ({ children, ...props }) => <td className="px-4 py-3 text-sm text-gray-700" {...props}>{children}</td>,
                a: ({ children, ...props }) => <a className="text-blue-600 hover:text-blue-800 underline" {...props}>{children}</a>,
                hr: ({ ...props }) => <hr className="my-6 border-gray-300" {...props} />,
                strong: ({ children, ...props }) => <strong className="font-semibold text-gray-900" {...props}>{children}</strong>,
                em: ({ children, ...props }) => <em className="italic" {...props}>{children}</em>,
              }}
            >
              {selectedDoc.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
