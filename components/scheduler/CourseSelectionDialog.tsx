import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
} from '@mui/material';
import { Clock, User, AlertCircle } from 'lucide-react';
import { getCourseSectionsAction } from '@/lib/services/server-actions';
import type { CourseSection } from '@/lib/services/courseOfferingService';

interface CourseSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (selection: { primaryId: number; backup1Id?: number; backup2Id?: number }) => void;
    courseCode: string;
    courseTitle: string;
    termName: string;
    universityId: number;
}

export default function CourseSelectionDialog({
    open,
    onClose,
    onSave,
    courseCode,
    courseTitle,
    termName,
    universityId
}: CourseSelectionDialogProps) {
    const [loading, setLoading] = useState(false);
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [primaryId, setPrimaryId] = useState<number | null>(null);
    const [backup1Id, setBackup1Id] = useState<number | null>(null);
    const [backup2Id, setBackup2Id] = useState<number | null>(null);

    const loadSections = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getCourseSectionsAction(universityId, termName, courseCode);
            setSections(data || []);
        } catch (err) {
            console.error('Failed to load sections', err);
            setError('Failed to load course sections. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [courseCode, termName, universityId]);

    useEffect(() => {
        if (open && courseCode && termName) {
            loadSections();
            // Reset selections
            setPrimaryId(null);
            setBackup1Id(null);
            setBackup2Id(null);
        }
    }, [open, courseCode, termName, loadSections]);

    const handleSave = () => {
        if (!primaryId) return;
        onSave({
            primaryId,
            backup1Id: backup1Id || undefined,
            backup2Id: backup2Id || undefined
        });
        onClose();
    };

    const renderSectionCard = (section: CourseSection) => {
        const isPrimary = primaryId === section.offering_id;
        const isBackup1 = backup1Id === section.offering_id;
        const isBackup2 = backup2Id === section.offering_id;
        const isSelected = isPrimary || isBackup1 || isBackup2;

        const currentRole = isPrimary ? 'Primary' : isBackup1 ? 'Backup 1' : isBackup2 ? 'Backup 2' : null;

        // Helper to toggle selection logic
        const handleSelect = () => {
            if (isSelected) {
                // Deselect
                if (isPrimary) setPrimaryId(null);
                if (isBackup1) setBackup1Id(null);
                if (isBackup2) setBackup2Id(null);
            } else {
                // Select logic: Fill Primary -> Backup1 -> Backup2
                if (!primaryId) setPrimaryId(section.offering_id);
                else if (!backup1Id) setBackup1Id(section.offering_id);
                else if (!backup2Id) setBackup2Id(section.offering_id);
            }
        };

        const meetings = section.meetings_json as { days?: string, start?: string, end?: string, location?: string } || {};
        const scheduleString = meetings.days && meetings.start ? `${meetings.days} ${meetings.start} - ${meetings.end}` : 'TBA';

        return (
            <Card
                key={section.offering_id}
                variant="outlined"
                sx={{
                    mb: 1.5,
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    bgcolor: isSelected ? 'var(--primary-15)' : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'var(--primary)' }
                }}
                onClick={handleSelect}
            >
                <CardContent sx={{ p: 2, '&:last-child': { p: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="700">
                                Section {section.section_label}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: 'text.secondary', fontSize: '0.85rem' }}>
                                <Clock size={14} />
                                <span>{scheduleString}</span>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, color: 'text.secondary', fontSize: '0.85rem' }}>
                                <User size={14} />
                                <span>{section.instructor || 'Instructor TBA'}</span>
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            {isSelected ? (
                                <Chip
                                    label={currentRole}
                                    color="primary"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                />
                            ) : (
                                <Box sx={{}}>
                                    <Typography variant="caption" display="block" color={section.seats_available === 0 ? 'error.main' : 'success.main'} fontWeight="600">
                                        {section.seats_available !== null && section.seats_available <= 0 ? 'FULL' : `${section.seats_available} seats`}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {section.waitlist_count} waitlisted
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, height: '80vh', display: 'flex', flexDirection: 'column' }
            }}
        >
            <DialogTitle sx={{ pb: 1, fontWeight: 700, fontFamily: '"Red Hat Display", sans-serif' }}>
                Select Section
                <Typography variant="body2" color="text.secondary">
                    {courseCode}: {courseTitle}
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ flex: 1, overflowY: 'auto' }} dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'error.main', p: 2, bgcolor: 'error.lighter', borderRadius: 2 }}>
                        <AlertCircle size={20} />
                        <Typography>{error}</Typography>
                    </Box>
                ) : sections.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                        No sections found for this term.
                    </Typography>
                ) : (
                    <Box>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Click sections to select them in order:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip label="1. Primary" variant={primaryId ? "filled" : "outlined"} color="success" size="small" />
                                <Chip label="2. Backup 1" variant={backup1Id ? "filled" : "outlined"} color="warning" size="small" />
                                <Chip label="3. Backup 2" variant={backup2Id ? "filled" : "outlined"} color="warning" size="small" />
                            </Box>
                        </Box>
                        {sections.map(renderSectionCard)}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={!primaryId}
                    sx={{ fontWeight: 600 }}
                >
                    Add Selection
                </Button>
            </DialogActions>
        </Dialog>
    );
}
