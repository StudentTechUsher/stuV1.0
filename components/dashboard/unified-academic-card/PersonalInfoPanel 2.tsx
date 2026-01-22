'use client';

import { useState, useCallback, useMemo } from 'react';
import { Pencil, X, Check } from 'lucide-react';
import { Button, TextField, IconButton } from '@mui/material';
import { PERSONAL_INFO_MOCK } from './dashboardMockData';
import { StatusHoldsSection } from './StatusHoldsSection';

/**
 * Calculate age from birthdate string
 * Supports formats like "12 July 2001" or "July 12, 2001" or "2001-07-12"
 */
function calculateAge(birthdateStr: string): number {
  const birthDate = new Date(birthdateStr);
  if (isNaN(birthDate.getTime())) {
    return 0; // Invalid date
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

interface PersonalInfoData {
  netId: string;
  studentId: string;
  birthdate: string;
  classStanding: string;
  email: string;
  university: string;
}

interface PersonalInfoPanelProps {
  isVisible: boolean;
  standing: string;
  email?: string;
  university?: string;
}

/**
 * Personal Information Panel - expandable dropdown from header bar
 * Shows student details with edit capability (POC - local state only)
 * Includes Status/Holds section below personal info
 */
export function PersonalInfoPanel({
  isVisible,
  standing,
  email,
  university,
}: PersonalInfoPanelProps) {
  // Combine real and dummy data (age is calculated, not stored)
  const initialData: PersonalInfoData = {
    netId: PERSONAL_INFO_MOCK.netId,
    studentId: PERSONAL_INFO_MOCK.studentId,
    birthdate: PERSONAL_INFO_MOCK.birthdate,
    classStanding: standing,
    email: email || 'student@university.edu',
    university: university || 'University',
  };

  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>(initialData);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedInfo, setEditedInfo] = useState<PersonalInfoData>(initialData);

  // Calculate age from birthdate (auto-updates when birthdate changes)
  const displayData = isEditMode ? editedInfo : personalInfo;
  const calculatedAge = useMemo(() => calculateAge(displayData.birthdate), [displayData.birthdate]);

  const handleEditToggle = useCallback(() => {
    if (isEditMode) {
      // Cancel edit - reset to current values
      setEditedInfo(personalInfo);
    } else {
      // Enter edit mode
      setEditedInfo(personalInfo);
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, personalInfo]);

  const handleSave = useCallback(() => {
    // POC: Save to local state only (no DB persistence)
    setPersonalInfo(editedInfo);
    setIsEditMode(false);
  }, [editedInfo]);

  const handleCancel = useCallback(() => {
    setEditedInfo(personalInfo);
    setIsEditMode(false);
  }, [personalInfo]);

  const handleFieldChange = useCallback((field: keyof PersonalInfoData, value: string) => {
    setEditedInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isVisible ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-[#0A0A0A] px-5 pb-5">
        {/* Personal Information Section */}
        <div className="pt-2 border-t border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-header-bold text-sm font-bold text-white/90">
              Personal Information
            </h3>
            {/* Edit/Cancel button */}
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <IconButton
                  onClick={handleCancel}
                  size="small"
                  sx={{
                    color: 'var(--action-cancel)',
                    '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' },
                  }}
                >
                  <X size={16} />
                </IconButton>
                <IconButton
                  onClick={handleSave}
                  size="small"
                  sx={{
                    color: 'var(--primary)',
                    '&:hover': { bgcolor: 'rgba(18, 249, 135, 0.1)' },
                  }}
                >
                  <Check size={16} />
                </IconButton>
              </div>
            ) : (
              <IconButton
                onClick={handleEditToggle}
                size="small"
                sx={{
                  color: 'var(--action-edit)',
                  '&:hover': { bgcolor: 'rgba(253, 204, 74, 0.1)' },
                }}
              >
                <Pencil size={14} />
              </IconButton>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoField
              label="Student NetID"
              value={displayData.netId}
              isEditMode={isEditMode}
              onChange={(v) => handleFieldChange('netId', v)}
            />
            <InfoField
              label="Student ID#"
              value={displayData.studentId}
              isEditMode={isEditMode}
              onChange={(v) => handleFieldChange('studentId', v)}
            />
            <InfoField
              label="Birthdate"
              value={displayData.birthdate}
              isEditMode={isEditMode}
              onChange={(v) => handleFieldChange('birthdate', v)}
            />
            <InfoField
              label="Age"
              value={String(calculatedAge)}
              isEditMode={false} // Age is auto-calculated from birthdate
              onChange={() => {}}
            />
            <InfoField
              label="Class"
              value={displayData.classStanding}
              isEditMode={false} // Class is derived from credits, not editable
              onChange={() => {}}
            />
            <InfoField
              label="Email"
              value={displayData.email}
              isEditMode={isEditMode}
              onChange={(v) => handleFieldChange('email', v)}
            />
            <InfoField
              label="University"
              value={displayData.university}
              isEditMode={false} // University is from profile, not editable here
              onChange={() => {}}
              fullWidth
            />
          </div>

          {/* Save/Cancel buttons for edit mode */}
          {isEditMode && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-700">
              <Button
                onClick={handleCancel}
                size="small"
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  textTransform: 'none',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                }}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                size="small"
                variant="contained"
                sx={{
                  bgcolor: 'var(--primary)',
                  color: '#0A0A0A',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'var(--hover-green)' },
                }}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Status/Holds Section */}
        <StatusHoldsSection isVisible={isVisible} university={university} />
      </div>
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value: string;
  isEditMode: boolean;
  onChange: (value: string) => void;
  fullWidth?: boolean;
}

/**
 * Individual info field - displays as text or editable input
 */
function InfoField({ label, value, isEditMode, onChange, fullWidth }: InfoFieldProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <span className="font-body text-xs text-white/50 block mb-0.5">{label}</span>
      {isEditMode ? (
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          size="small"
          fullWidth
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              color: 'white',
              fontSize: '0.875rem',
              '& fieldset': {
                borderColor: 'rgba(255,255,255,0.2)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255,255,255,0.4)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--primary)',
              },
            },
            '& .MuiOutlinedInput-input': {
              py: 0.75,
              px: 1,
            },
          }}
        />
      ) : (
        <span className="font-body-semi text-sm text-white/90">{value}</span>
      )}
    </div>
  );
}
