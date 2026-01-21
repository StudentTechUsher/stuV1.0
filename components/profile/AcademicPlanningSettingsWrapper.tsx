/**
 * Academic Planning Settings Wrapper Component
 *
 * Client wrapper for AcademicPlanningSettingsForm that connects to server actions
 */

'use client';

import React, { useState } from 'react';
import { AcademicPlanningSettingsForm } from './AcademicPlanningSettingsForm';
import {
  updateGraduationTimelineAction,
  updateStudentTypeAction,
  updateWorkStatusAction,
  updateCareerGoalsAction,
} from '@/lib/services/server-actions';

interface StudentPlanningData {
  est_grad_date: string | null;
  est_grad_term: string | null;
  admission_year: number | null;
  is_transfer: boolean | null;
  student_type: 'undergraduate' | 'graduate' | null;
  work_status: 'not_working' | 'part_time' | 'full_time' | 'variable' | null;
  career_goals: string | null;
}

interface AcademicPlanningSettingsWrapperProps {
  userId: string;
  currentStudentData: StudentPlanningData | null;
}

export function AcademicPlanningSettingsWrapper({
  userId,
  currentStudentData,
}: AcademicPlanningSettingsWrapperProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdateGraduationTimeline = async (data: {
    est_grad_date?: string | null;
    est_grad_term?: string | null;
    admission_year?: number | null;
  }) => {
    await updateGraduationTimelineAction(userId, data);
  };

  const handleUpdateStudentType = async (studentType: 'undergraduate' | 'graduate') => {
    await updateStudentTypeAction(userId, studentType);
  };

  const handleUpdateWorkStatus = async (workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable') => {
    await updateWorkStatusAction(userId, workStatus);
  };

  const handleUpdateCareerGoals = async (careerGoals: string | null) => {
    await updateCareerGoalsAction(userId, careerGoals);
  };

  const handleUpdate = () => {
    // Trigger a re-render to fetch fresh data
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AcademicPlanningSettingsForm
      key={refreshKey}
      userId={userId}
      currentStudentData={currentStudentData}
      onUpdate={handleUpdate}
      onUpdateGraduationTimeline={handleUpdateGraduationTimeline}
      onUpdateStudentType={handleUpdateStudentType}
      onUpdateWorkStatus={handleUpdateWorkStatus}
      onUpdateCareerGoals={handleUpdateCareerGoals}
    />
  );
}

export default AcademicPlanningSettingsWrapper;
