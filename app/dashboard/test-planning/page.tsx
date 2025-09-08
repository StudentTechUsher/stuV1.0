"use client";

// High-level component
import React, { useState } from "react";

function TestPlanningPage() {
  const [step, setStep] = useState(1);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [requirementSelections, setRequirementSelections] = useState<Record<string, string[]>>({});

  return (
    <div>
      {step === 1 && (
        <div>
          <h2>Step 1: Program selection</h2>
          {/* TODO: Display list of majors/minors (checkboxes or cards) */}
          {/* TODO: Allow selecting multiple */}
          <button onClick={() => setStep(2)}>Continue</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Step 2: Requirements</h2>
          {/* TODO: For each selected program, render requirements */}
          <button onClick={() => setStep(1)}>Back</button>
          <button onClick={() => setStep(3)}>Continue</button>
        </div>
      )}

      {/* TODO: Add steps 3, 4, etc. as needed */}
    </div>
  );
}

export default TestPlanningPage;
