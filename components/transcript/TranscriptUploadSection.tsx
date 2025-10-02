"use client";

import { useState } from 'react';
import TranscriptUpload from './TranscriptUpload';
import ParsedCoursesTable from './ParsedCoursesTable';

export default function TranscriptUploadSection() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showParsedCourses, setShowParsedCourses] = useState(false);

  const handleParseComplete = (docId: string) => {
    setShowParsedCourses(true);
  };

  const handleSaveComplete = () => {
    // Optionally refresh or show success message
    console.log('Courses saved successfully');
  };

  return (
    <div className="space-y-4">
      <TranscriptUpload
        onUploadComplete={(docId) => setDocumentId(docId)}
        onParseComplete={handleParseComplete}
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
