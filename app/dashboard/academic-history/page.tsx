"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Paper, TextField, Button, IconButton, Divider, Tooltip, Dialog, DialogContent, Autocomplete } from '@mui/material';
import { Add, Delete, Edit, Save, FileCopy, Refresh, Upload } from '@mui/icons-material';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ProgressCircle } from '@/components/ui/progress-circle';
import ParsedCoursesCards from '@/components/transcript/ParsedCoursesCards';
import TranscriptUpload from '@/components/transcript/TranscriptUpload';

type CourseEntry = {
	id: string;
	code: string;
	title: string;
	credits: number | null;
	term?: string;
	notes?: string;
	requirement?: string; // e.g., "Humanities", "Major Core", "Free Elective"
	editing?: boolean;
};

interface ColumnState {
	general: CourseEntry[];
	program: CourseEntry[];
	minor: CourseEntry[];
	religion: CourseEntry[];
	electives: CourseEntry[];
}

const EMPTY: ColumnState = { general: [], program: [], minor: [], religion: [], electives: [] };

function newCourse(): CourseEntry {
	return { id: crypto.randomUUID(), code: '', title: '', credits: null, editing: true };
}

export default function AcademicHistoryPage() {
	const supabase = createSupabaseBrowserClient();
	const [userId, setUserId] = useState<string | null>(null);
	const [data, setData] = useState<ColumnState>(EMPTY);
	const [loadedKey, setLoadedKey] = useState<string | null>(null);
	const [dirty, setDirty] = useState(false);
	const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
	const [parsedCoursesCount, setParsedCoursesCount] = useState(0);
	const [refreshTrigger] = useState(0);
	const [parseReport] = useState<{coursesFound: number; lowConfidence: number} | null>(null);
	const [availableCourses, setAvailableCourses] = useState<Array<{ code: string; title: string; credits: number }>>([]);

	// Optimistic immediate sample (only if everything truly empty at mount)
	useEffect(() => {
		setData(prev => {
			if (prev.general.length || prev.program.length || prev.minor.length || prev.religion.length || prev.electives.length) return prev;
			return {
				general: [
					{ id: 'seed-eng101', code: 'ENG 101', title: 'College Writing I', credits: 3, requirement: 'Communication', editing: false },
					{ id: 'seed-math110', code: 'MATH 110', title: 'Quantitative Reasoning', credits: 3, requirement: 'Mathematics', editing: false },
				],
				program: [
					{ id: 'seed-cs101', code: 'CS 101', title: 'Intro to Computer Science', credits: 3, requirement: 'Major Core', editing: false },
					{ id: 'seed-cs201', code: 'CS 201', title: 'Data Structures', credits: 4, requirement: 'Major Core', editing: false },
				],
				minor: [
					{ id: 'seed-bus101', code: 'BUS 101', title: 'Principles of Business', credits: 3, requirement: 'Minor Requirement', editing: false },
				],
				religion: [
					{ id: 'seed-rel121', code: 'REL 121', title: 'Book of Mormon', credits: 2, requirement: 'Religion', editing: false },
				],
				electives: [
					{ id: 'seed-art105', code: 'ART 105', title: 'Foundations of Drawing', credits: 3, requirement: 'Fine Arts Elective', editing: false },
					{ id: 'seed-phil120', code: 'PHIL 120', title: 'Ethics & Society', credits: 3, requirement: 'Humanities Elective', editing: false },
				],
			};
		});
	}, []);

	// Load session user id
	useEffect(() => {
		(async () => {
			const { data: sess } = await supabase.auth.getSession();
			const id = sess.session?.user?.id || null;
			setUserId(id);
		})();
	}, [supabase]);

	// Load available courses from database
	useEffect(() => {
		(async () => {
			const { data: courses } = await supabase
				.from('courses')
				.select('code, title, credits')
				.order('code');
			if (courses) setAvailableCourses(courses);
		})();
	}, [supabase]);

	// Load from localStorage when user id resolves
	useEffect(() => {
		if (!userId) return;
		const key = `academic-history:${userId}`;
		setLoadedKey(key);
		try {
			const raw = localStorage.getItem(key);
			if (raw) {
				const parsed = JSON.parse(raw);
				const loaded: ColumnState = {
					general: Array.isArray(parsed.general) ? parsed.general : [],
					program: Array.isArray(parsed.program) ? parsed.program : [],
					minor: Array.isArray(parsed.minor) ? parsed.minor : [],
					religion: Array.isArray(parsed.religion) ? parsed.religion : [],
					electives: Array.isArray(parsed.electives) ? parsed.electives : [],
				};
				// If all arrays are empty, treat as fresh and seed
				const allEmpty = !loaded.general.length && !loaded.program.length && !loaded.minor.length && !loaded.religion.length && !loaded.electives.length;
				if (allEmpty) {
					setData({
						general: [
							{ id: crypto.randomUUID(), code: 'ENG 101', title: 'College Writing I', credits: 3, requirement: 'Communication', editing: false },
							{ id: crypto.randomUUID(), code: 'MATH 110', title: 'Quantitative Reasoning', credits: 3, requirement: 'Mathematics', editing: false },
						],
						program: [
							{ id: crypto.randomUUID(), code: 'CS 101', title: 'Intro to Computer Science', credits: 3, requirement: 'Major Core', editing: false },
							{ id: crypto.randomUUID(), code: 'CS 201', title: 'Data Structures', credits: 4, requirement: 'Major Core', editing: false },
						],
						minor: [
							{ id: crypto.randomUUID(), code: 'BUS 101', title: 'Principles of Business', credits: 3, requirement: 'Minor Requirement', editing: false },
						],
						religion: [
							{ id: crypto.randomUUID(), code: 'REL 121', title: 'Book of Mormon', credits: 2, requirement: 'Religion', editing: false },
						],
						electives: [
							{ id: crypto.randomUUID(), code: 'ART 105', title: 'Foundations of Drawing', credits: 3, requirement: 'Fine Arts Elective', editing: false },
							{ id: crypto.randomUUID(), code: 'PHIL 120', title: 'Ethics & Society', credits: 3, requirement: 'Humanities Elective', editing: false },
						],
					});
					setDirty(true);
				} else {
					setData(loaded);
				}
			} else {
				// Seed sample courses (only when no saved data)
				setData({
					general: [
						{ id: crypto.randomUUID(), code: 'ENG 101', title: 'College Writing I', credits: 3, requirement: 'Communication', editing: false },
						{ id: crypto.randomUUID(), code: 'MATH 110', title: 'Quantitative Reasoning', credits: 3, requirement: 'Mathematics', editing: false },
					],
					program: [
						{ id: crypto.randomUUID(), code: 'CS 101', title: 'Intro to Computer Science', credits: 3, requirement: 'Major Core', editing: false },
						{ id: crypto.randomUUID(), code: 'CS 201', title: 'Data Structures', credits: 4, requirement: 'Major Core', editing: false },
					],
					minor: [
						{ id: crypto.randomUUID(), code: 'BUS 101', title: 'Principles of Business', credits: 3, requirement: 'Minor Requirement', editing: false },
					],
					religion: [
						{ id: crypto.randomUUID(), code: 'REL 121', title: 'Book of Mormon', credits: 2, requirement: 'Religion', editing: false },
					],
					electives: [
						{ id: crypto.randomUUID(), code: 'ART 105', title: 'Foundations of Drawing', credits: 3, requirement: 'Fine Arts Elective', editing: false },
						{ id: crypto.randomUUID(), code: 'PHIL 120', title: 'Ethics & Society', credits: 3, requirement: 'Humanities Elective', editing: false },
					],
				});
				setDirty(true); // ensure seeded data persists
			}
		} catch (e) {
			console.error('[AcademicHistory] load failed', e);
		}
	}, [userId]);

	// Persist (debounced) to localStorage
	useEffect(() => {
		if (!loadedKey) return;
		if (!dirty) return;
		const handle = setTimeout(() => {
			try {
				localStorage.setItem(loadedKey, JSON.stringify(data));
				setDirty(false);
			} catch (e) {
				console.error('[AcademicHistory] save failed', e);
			}
		}, 600); // debounce 600ms
		return () => clearTimeout(handle);
	}, [data, dirty, loadedKey]);

	const mutate = useCallback(<K extends keyof ColumnState>(col: K, fn: (arr: CourseEntry[]) => CourseEntry[]) => {
		setData(prev => ({ ...prev, [col]: fn(prev[col]) }));
		setDirty(true);
	}, []);

	const addCourse = (col: keyof ColumnState) => mutate(col, arr => [...arr, newCourse()]);

	const updateCourse = (col: keyof ColumnState, id: string, patch: Partial<CourseEntry>) => mutate(col, arr => arr.map(c => c.id === id ? { ...c, ...patch } : c));

	const deleteCourse = (col: keyof ColumnState, id: string) => mutate(col, arr => arr.filter(c => c.id !== id));

	const totalCredits = (col: keyof ColumnState) => data[col].reduce((sum, c) => sum + (c.credits || 0), 0);
	const grandTotal = totalCredits('general') + totalCredits('program') + totalCredits('minor') + totalCredits('religion') + totalCredits('electives');

	const exportJson = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
			setCopyStatus('copied');
			setTimeout(() => setCopyStatus('idle'), 2500);
		} catch (e) {
			console.error('Copy failed', e);
		}
	};

	const clearAll = () => {
		if (!confirm('Clear all academic history entries? This cannot be undone.')) return;
		setData(EMPTY);
		setDirty(true);
	};

	const saveToDatabase = async () => {
		if (!userId) {
			alert('Please log in to save courses');
			return;
		}

		try {
			// Collect all courses from all columns
			const allCourses = [
				...data.general,
				...data.program,
				...data.electives
			];

			// Save each course to user_courses table
			for (const course of allCourses) {
				if (!course.code) continue; // Skip empty courses

				// Parse code into subject and number
				const match = course.code.match(/^([A-Z]+)\s*(\d+)$/i);
				if (!match) continue;

				const [, subject, number] = match;

				await supabase.from('user_courses').upsert({
					user_id: userId,
					subject: subject.toUpperCase(),
					number: number,
					title: course.title || null,
					credits: course.credits || null,
					term: course.term || null,
					grade: null
				}, {
					onConflict: 'user_id,subject,number,term'
				});
			}

			alert(`Successfully saved ${allCourses.filter(c => c.code).length} courses to your profile!`);
			// Trigger reload of parsed courses
			setParsedCoursesCount(prev => prev + 1);
		} catch (error) {
			console.error('Error saving courses:', error);
			alert('Failed to save courses to database');
		}
	};

	const renderCourseRow = (col: keyof ColumnState, course: CourseEntry) => {
		const editing = !!course.editing;
		return (
			<Box key={course.id} sx={{ display: 'grid', gridTemplateColumns: '90px 1fr 60px 100px 32px 32px', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
				{editing ? (
					<Autocomplete
						size="small"
						freeSolo
						options={availableCourses}
						getOptionLabel={(option) => typeof option === 'string' ? option : option.code}
						value={course.code || ''}
						onInputChange={(_, newValue) => updateCourse(col, course.id, { code: newValue })}
						onChange={(_, newValue) => {
							if (newValue && typeof newValue !== 'string') {
								updateCourse(col, course.id, {
									code: newValue.code,
									title: newValue.title,
									credits: newValue.credits
								});
							}
						}}
						renderInput={(params) => <TextField {...params} placeholder="CODE" />}
					/>
				) : (
					<Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>{course.code || '—'}</Typography>
				)}
				{editing ? (
					<TextField size="small" placeholder="Title" value={course.title} onChange={e => updateCourse(col, course.id, { title: e.target.value })} sx={{ '& input': { fontSize: '0.75rem', py: 0.5 } }} />
				) : (
					<Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{course.title || 'Untitled'}</Typography>
				)}
				{editing ? (
					<TextField size="small" placeholder="Cr" type="number" value={course.credits ?? ''} onChange={e => updateCourse(col, course.id, { credits: e.target.value === '' ? null : Number(e.target.value) })} sx={{ '& input': { fontSize: '0.75rem', py: 0.5 } }} />
				) : (
					<Typography variant="body2" textAlign="center" sx={{ fontSize: '0.75rem' }}>{course.credits ?? '—'}</Typography>
				)}
				{editing ? (
					<TextField size="small" placeholder="Requirement" value={course.requirement || ''} onChange={e => updateCourse(col, course.id, { requirement: e.target.value })} sx={{ '& input': { fontSize: '0.7rem', py: 0.5 } }} />
				) : (
					<Box sx={{ display: 'inline-flex', px: 0.75, py: 0.15, borderRadius: 0.75, bgcolor: 'var(--primary-15)', color: 'var(--primary)', fontSize: '0.6rem', fontWeight: 600, justifySelf: 'start', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
						{course.requirement || '—'}
					</Box>
				)}
				<IconButton size="small" onClick={() => updateCourse(col, course.id, { editing: !editing })} aria-label={editing ? 'Save' : 'Edit'} sx={{ p: 0.5 }}>
					{editing ? <Save sx={{ fontSize: '1rem' }} /> : <Edit sx={{ fontSize: '1rem' }} />}
				</IconButton>
				<IconButton size="small" onClick={() => deleteCourse(col, course.id)} aria-label="Delete" sx={{ p: 0.5 }}>
					<Delete sx={{ fontSize: '1rem' }} />
				</IconButton>
			</Box>
		);
	};

	// Color scheme matching graduation-planner and academic-progress-card:
	// General Education = blue (#2196f3) - default variant
	// Program (Major) = primary green (var(--primary)) - success variant
	// Minor = dark blue (#001F54) - navy variant
	// Religion = purple (#5E35B1) - purple variant
	// Electives = violet (#9C27B0) - violet variant
	const progressMeta = useMemo(() => ([
		{ variant: 'default' as const, value: Math.floor(10 + Math.random() * 86) },  // General Education (blue)
		{ variant: 'success' as const, value: Math.floor(10 + Math.random() * 86) },  // Program Requirements (green/primary)
		{ variant: 'navy' as const, value: Math.floor(10 + Math.random() * 86) },     // Minor (dark blue #001F54)
		{ variant: 'purple' as const, value: Math.floor(10 + Math.random() * 86) },   // Religion (purple #5E35B1)
		{ variant: 'violet' as const, value: Math.floor(10 + Math.random() * 86) },   // Electives (violet #9C27B0)
	]), []);

	const renderColumn = (col: keyof ColumnState, title: string, description: string, idx: number) => (
		<Paper elevation={2} sx={{ p: 1.5, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, overflow: 'hidden' }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
				<ProgressCircle value={progressMeta[idx]?.value ?? 0} max={100} radius={18} strokeWidth={5} variant={progressMeta[idx]?.variant}>
					<Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.6rem' }}>{progressMeta[idx]?.value ?? 0}%</Typography>
				</ProgressCircle>
				<Box sx={{ minWidth: 0, overflow: 'hidden' }}>
					<Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1, fontSize: '0.875rem' }}>{title}</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{description}</Typography>
				</Box>
			</Box>
			<Divider sx={{ mb: 0.5 }} />
			<Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, minHeight: 0 }}>
				{data[col].length === 0 && (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>No courses added yet.</Typography>
				)}
				{data[col].map(c => renderCourseRow(col, c))}
			</Box>
			<Button startIcon={<Add />} size="small" onClick={() => addCourse(col)} sx={{ mt: 0.5, fontSize: '0.75rem', py: 0.5 }}>
				Add Course
			</Button>
			<Divider sx={{ my: 0.5 }} />
			<Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Total Credits: {totalCredits(col)}</Typography>
		</Paper>
	);

	return (
		<Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '100%', overflow: 'hidden' }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2, width: '100%' }}>
				<Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
					<Typography variant="h4" sx={{ fontWeight: 'bold' }}>Academic History</Typography>
					<Typography variant="body2" color="text.secondary">Track previously completed coursework across your curriculum.</Typography>
				</Box>
				<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: '0 1 auto', justifyContent: 'flex-end' }}>
					<Tooltip title="Save courses to your profile">
						<Button variant="contained" size="small" startIcon={<Save />} onClick={saveToDatabase} color="primary" sx={{ minWidth: 'auto' }}>
							Save
						</Button>
					</Tooltip>
					<Tooltip title="Upload transcript PDF">
						<Button variant="outlined" size="small" startIcon={<Upload />} onClick={() => setUploadDialogOpen(true)} sx={{ minWidth: 'auto' }}>
							Upload
						</Button>
					</Tooltip>
					<Tooltip title="Copy JSON to clipboard">
						<Button variant="outlined" size="small" startIcon={<FileCopy />} onClick={exportJson} sx={{ minWidth: 'auto' }}>{copyStatus === 'copied' ? 'Copied!' : 'Export'}</Button>
					</Tooltip>
					<Tooltip title="Clear all entries (local)" >
						<Button variant="outlined" size="small" color="error" startIcon={<Refresh />} onClick={clearAll} sx={{ minWidth: 'auto' }}>
							Clear
						</Button>
					</Tooltip>
				</Box>
			</Box>
			<Box sx={{
				display: 'grid',
				gridTemplateColumns: {
					xs: '1fr',
					sm: 'repeat(2, 1fr)',
					lg: 'repeat(3, 1fr)'
				},
				gap: 2,
				flex: 1,
				alignItems: 'stretch',
				width: '100%',
				maxWidth: '100%',
				overflow: 'hidden'
			}}>
				{renderColumn('general', 'General Education', 'Core / general education / foundational courses already completed.', 0)}
				{renderColumn('program', 'Major Requirements', 'Major / program-specific requirement courses completed.', 1)}
				{renderColumn('minor', 'Minor Requirements', 'Minor program courses completed.', 2)}
				{renderColumn('religion', 'Religion', 'Religion requirement courses completed.', 3)}
				{renderColumn('electives', 'Electives', 'Elective or exploratory courses taken that count toward credit totals.', 4)}
			</Box>
			<Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
				<Typography variant="body2" color="text.secondary">Grand Total Credits: {grandTotal}</Typography>
			</Box>

			{/* Parsed Transcript Courses Section */}
			<Box sx={{ mt: 4 }}>
				<Divider sx={{ mb: 3 }} />
				<Box sx={{ mb: 2 }}>
					<Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
						Parsed Transcript Courses
					</Typography>
					{parsedCoursesCount > 0 ? (
						<>
							<Typography variant="body2" color="text.secondary">
								{parsedCoursesCount} course{parsedCoursesCount !== 1 ? 's' : ''} from uploaded transcripts
							</Typography>
							{parseReport && parseReport.lowConfidence > 0 && (
								<Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>
									⚠️ {parseReport.lowConfidence} course{parseReport.lowConfidence !== 1 ? 's' : ''} flagged for review (low confidence)
								</Typography>
							)}
						</>
					) : (
						<Typography variant="body2" color="text.secondary">
							Upload a transcript above to see parsed courses here
						</Typography>
					)}
				</Box>
				<ParsedCoursesCards
					userId={userId}
					onCoursesLoaded={setParsedCoursesCount}
					refreshTrigger={refreshTrigger}
				/>
			</Box>

			{/* Upload Transcript Dialog */}
			<Dialog
				open={uploadDialogOpen}
				onClose={() => setUploadDialogOpen(false)}
				maxWidth="md"
				fullWidth
			>
				<DialogContent sx={{ p: 3 }}>
					<TranscriptUpload
						onTextExtracted={(text) => {
							console.log('Extracted text:', text);
							// For now, just log the extracted text
							// In the future, we can parse it and add courses
						}}
					/>
				</DialogContent>
			</Dialog>
		</Box>
	);
}

