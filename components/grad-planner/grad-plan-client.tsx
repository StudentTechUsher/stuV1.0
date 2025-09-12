'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import GraduationPlanner from "@/components/grad-planner/graduation-planner";
import CreateGradPlanDialog from "@/components/grad-planner/create-grad-plan-dialog";
import { GraduationPlan } from "@/types/graduation-plan";
import { ProgramRow } from "@/types/program";
import { PlusIcon } from 'lucide-react';

const RAIL_WIDTH = 80;

interface GradPlanClientProps {
  user: {
    id: string;
    email?: string;
  } | null;
  studentRecord: {
    id: number;
    profile_id: string;
    university_id: number;
    [key: string]: unknown;
  } | null;
  gradPlanRecord: GraduationPlan | null;
  programsData: ProgramRow[];
  genEdData: ProgramRow[];
}

export default function GradPlanClient({ user, studentRecord, gradPlanRecord, programsData, genEdData }: Readonly<GradPlanClientProps>) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreatePlan = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  if (!user) {
    return (
      <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
        <div>Please log in to view your graduation plan.</div>
      </Box>
    );
  }

  if (!studentRecord) {
    return (
      <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
        <Typography variant="h4" gutterBottom>
          Graduation Plan
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Student record not found. User ID: {user.id}
        </Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2 }}>
          Create Student Profile
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ ml: `${RAIL_WIDTH}px`, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Graduation Plan
        </Typography>
        <Button 
          variant="contained" 
          color="success"
          onClick={handleCreatePlan}
          sx={{ 
            backgroundColor: '#4caf50',
            '&:hover': {
              backgroundColor: '#45a049'
            }
          }}
        >
            <PlusIcon style={{ marginRight: 2 }} />
          Create New Grad Plan
        </Button>
      </Box>
      
      {gradPlanRecord ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            Database Output:
          </Typography>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '4px', 
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(gradPlanRecord, null, 2)}
          </pre>
          <GraduationPlanner plan={gradPlanRecord} />
        </Box>
      ) : (
        <Box>
          <Typography variant="body1" color="text.secondary">
            No graduation plan found in database.
          </Typography>
          <Button 
            variant="outlined" 
            color="success"
            onClick={handleCreatePlan}
            sx={{ 
              mt: 2,
              borderColor: '#4caf50',
              color: '#4caf50',
              '&:hover': {
                borderColor: '#45a049',
                backgroundColor: 'rgba(76, 175, 80, 0.04)'
              }
            }}
          >
            Create Your First Grad Plan
          </Button>
        </Box>
      )}

      <CreateGradPlanDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        programsData={programsData}
        genEdData={genEdData}
      />
    </Box>
  );
}
