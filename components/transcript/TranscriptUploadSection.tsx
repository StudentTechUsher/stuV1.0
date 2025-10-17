"use client";

import { useState } from 'react';
import TranscriptUpload from './TranscriptUpload';
import ParsedCoursesTable from './ParsedCoursesTable';

export default function TranscriptUploadSection() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showParsedCourses, setShowParsedCourses] = useState(false);

  const handleTextExtracted = (text: string) => {
    console.log('Extracted text:', text);
    // For now, just log the text
    // In the future, we can parse it and create a document
  };

  const handleSaveComplete = () => {
    // Optionally refresh or show success message
  };

  return (
    <div className="space-y-4">
      <TranscriptUpload
        onTextExtracted={handleTextExtracted}
      />

      {showParsedCourses && documentId && (
        <ParsedCoursesTable
          documentId={documentId}
          onSaveComplete={handleSaveComplete}
        />
      )}
    </div>
  );
}
