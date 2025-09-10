'use client';
import type { ProgramRow } from '@/types/program';
import { Dialog, DialogTitle, DialogContent, Typography, TextField, DialogActions, Button } from '@mui/material';
import React from 'react';


export type EditRequirementsDialogProps = {
    open: boolean;
    row: ProgramRow | null;
    onClose: () => void;
    onSave: (parsed: unknown, rawText: string) => Promise<void> | void;
};


export default function EditRequirementsDialog({ open, row, onClose, onSave }: EditRequirementsDialogProps) {
    const [text, setText] = React.useState('');


    React.useEffect(() => {
        if (!row) { setText(''); return; }
        try {
            if (typeof row.requirements === 'string') {
            try { setText(JSON.stringify(JSON.parse(row.requirements), null, 2)); }
            catch { setText(row.requirements); }
            } else {
            setText(JSON.stringify(row.requirements, null, 2));
        }
        } catch {
        setText(String(row.requirements ?? ''));
        }
    }, [row]);


    const handleSave = async () => {
        let value: unknown = text;
        try { value = JSON.parse(text); } catch { /* allow plain text */ }
        await onSave(value, text);
    };


    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Requirements</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" gutterBottom>
                    {row?.name} ({row?.program_type})
                    </Typography>
                    <TextField
                    label="Requirements (JSON or text)"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    fullWidth
                    multiline
                    minRows={10}
                    />
                    </DialogContent>
                <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}