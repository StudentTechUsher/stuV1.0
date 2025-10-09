"use client";

import { useState } from 'react';
import TranscriptUpload from './TranscriptUpload';
import ParsedCoursesTable from './ParsedCoursesTable';

export default function TranscriptUploadSection() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showParsedCourses, setShowParsedCourses] = useState(false);

  const handleUploadSuccess = (report: any) => {
    const docId = report?.documentId ?? report?.document_id ?? null;
    if (docId) {
      setDocumentId(docId);
      setShowParsedCourses(true);
    }
  };

  const handleSaveComplete = () => {
    // Optionally refresh or show success message
    console.log('Courses saved successfully');
  };

  return (
    <div className="space-y-4">
      <TranscriptUpload
        onUploadSuccess={handleUploadSuccess}
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
