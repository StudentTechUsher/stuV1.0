import {
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    Chip,
    Paper
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Calendar } from 'lucide-react';

interface Term {
    term: string;
    year?: number; // Optional in some grad plan structures
    title?: string; // Optional custom title
}

interface TermSelectorProps {
    terms: Term[];
    selectedTermIndex: number | null;
    selectedYear: number | string | null;
    onTermSelect: (termName: string, index: number) => void;
    isLoading?: boolean;
}

export default function TermSelector({
    terms,
    selectedTermIndex,
    selectedYear: _selectedYear,
    onTermSelect,
    isLoading = false
}: TermSelectorProps) {
    // Filter out terms that don't have a name/title (e.g. empty slots if any)
    // And also filter out "Notes" or other non-term items if they exist in the plan array
    const validTerms = terms.map((term, index) => ({ term, originalIndex: index }))
        .filter(t => t.term && t.term.term);

    const handleChange = (event: SelectChangeEvent<number>) => {
        const index = Number(event.target.value);
        const termObj = terms[index];
        const name = termObj.title || termObj.term;
        onTermSelect(name, index);
    };

    if (validTerms.length === 0) {
        return (
            <Paper elevation={0} sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--muted)' }}>
                <Typography variant="body2" color="text.secondary">
                    No terms found in your active graduation plan.
                </Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'var(--primary-15)',
                color: 'var(--primary)'
            }}>
                <Calendar size={20} />
            </Box>

            <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" className="font-header" sx={{ mb: 0.5, color: 'text.secondary' }}>
                    Scheduling For
                </Typography>
                <FormControl fullWidth size="small" variant="outlined">
                    <Select
                        value={selectedTermIndex !== null ? selectedTermIndex : ''}
                        onChange={handleChange}
                        displayEmpty
                        disabled={isLoading}
                        sx={{
                            bgcolor: 'var(--background)',
                            '& .MuiSelect-select': {
                                py: 1,
                                fontWeight: 600
                            }
                        }}
                    >
                        <MenuItem value="" disabled>
                            <em>Select a term</em>
                        </MenuItem>
                        {validTerms.map((item) => {
                            const isPast = false; // Logic to determine if past could be added here
                            const label = item.term.title || item.term.term;
                            return (
                                <MenuItem key={item.originalIndex} value={item.originalIndex}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <span>{label}</span>
                                        {isPast && <Chip label="Past" size="small" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                                    </Box>
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            </Box>
        </Box>
    );
}
