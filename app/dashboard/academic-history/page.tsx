"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Paper, TextField, Button, IconButton, Divider, Tooltip } from '@mui/material';
import { Add, Delete, Edit, Save, FileCopy, Refresh } from '@mui/icons-material';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ProgressCircle } from '@/components/ui/progress-circle';

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
	electives: CourseEntry[];
}

const EMPTY: ColumnState = { general: [], program: [], electives: [] };

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

	// Optimistic immediate sample (only if everything truly empty at mount)
	useEffect(() => {
		setData(prev => {
			if (prev.general.length || prev.program.length || prev.electives.length) return prev;
			return {
				general: [
					{ id: 'seed-eng101', code: 'ENG 101', title: 'College Writing I', credits: 3, requirement: 'Communication', editing: false },
					{ id: 'seed-math110', code: 'MATH 110', title: 'Quantitative Reasoning', credits: 3, requirement: 'Mathematics', editing: false },
				],
				program: [
					{ id: 'seed-cs101', code: 'CS 101', title: 'Intro to Computer Science', credits: 3, requirement: 'Major Core', editing: false },
					{ id: 'seed-cs201', code: 'CS 201', title: 'Data Structures', credits: 4, requirement: 'Major Core', editing: false },
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
					electives: Array.isArray(parsed.electives) ? parsed.electives : [],
				};
				// If all three arrays are empty, treat as fresh and seed
				const allEmpty = !loaded.general.length && !loaded.program.length && !loaded.electives.length;
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
	const grandTotal = totalCredits('general') + totalCredits('program') + totalCredits('electives');

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

	const renderCourseRow = (col: keyof ColumnState, course: CourseEntry) => {
		const editing = !!course.editing;
		return (
			<Box key={course.id} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 80px 120px 36px 36px', gap: 1, alignItems: 'center', mb: 1 }}>
				{editing ? (
					<TextField size="small" placeholder="CODE" value={course.code} onChange={e => updateCourse(col, course.id, { code: e.target.value })} />
				) : (
					<Typography variant="body2" fontWeight={600}>{course.code || '—'}</Typography>
				)}
				{editing ? (
					<TextField size="small" placeholder="Title" value={course.title} onChange={e => updateCourse(col, course.id, { title: e.target.value })} />
				) : (
					<Typography variant="body2">{course.title || 'Untitled'}</Typography>
				)}
				{editing ? (
					<TextField size="small" placeholder="Cr" type="number" value={course.credits ?? ''} onChange={e => updateCourse(col, course.id, { credits: e.target.value === '' ? null : Number(e.target.value) })} />
				) : (
					<Typography variant="body2" textAlign="center">{course.credits ?? '—'}</Typography>
				)}
				{editing ? (
					<TextField size="small" placeholder="Requirement" value={course.requirement || ''} onChange={e => updateCourse(col, course.id, { requirement: e.target.value })} />
				) : (
					<Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 1, bgcolor: 'var(--primary-15)', color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 600, justifySelf: 'start' }}>
						{course.requirement || '—'}
					</Box>
				)}
				<IconButton size="small" onClick={() => updateCourse(col, course.id, { editing: !editing })} aria-label={editing ? 'Save' : 'Edit'}>
					{editing ? <Save fontSize="small" /> : <Edit fontSize="small" />}
				</IconButton>
				<IconButton size="small" onClick={() => deleteCourse(col, course.id)} aria-label="Delete">
					<Delete fontSize="small" />
				</IconButton>
			</Box>
		);
	};

	// Fixed variant mapping (GE = red, Program = blue, Electives = green)
	// Using existing variant keys: error (red), default (blue), success (green)
	const progressMeta = useMemo(() => ([
		{ variant: 'error' as const, value: Math.floor(10 + Math.random() * 86) },    // General Education
		{ variant: 'default' as const, value: Math.floor(10 + Math.random() * 86) },  // Program Requirements
		{ variant: 'success' as const, value: Math.floor(10 + Math.random() * 86) },  // Electives
	]), []);

	const renderColumn = (col: keyof ColumnState, title: string, description: string, idx: number) => (
		<Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75 }}>
				<ProgressCircle value={progressMeta[idx]?.value ?? 0} max={100} radius={22} strokeWidth={6} variant={progressMeta[idx]?.variant}>
					<Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.65rem' }}>{progressMeta[idx]?.value ?? 0}%</Typography>
				</ProgressCircle>
				<Box>
					<Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>{title}</Typography>
					<Typography variant="caption" color="text.secondary">{description}</Typography>
				</Box>
			</Box>
			<Divider sx={{ mb: 1 }} />
			<Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
				{data[col].length === 0 && (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No courses added yet.</Typography>
				)}
				{data[col].map(c => renderCourseRow(col, c))}
			</Box>
			<Button startIcon={<Add />} size="small" onClick={() => addCourse(col)} sx={{ mt: 1 }}>
				Add Course
			</Button>
			<Divider sx={{ my: 1 }} />
			<Typography variant="caption" color="text.secondary">Total Credits: {totalCredits(col)}</Typography>
		</Paper>
	);

	return (
		<Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
				<Box>
					<Typography variant="h4" sx={{ fontWeight: 'bold' }}>Academic History</Typography>
					<Typography variant="body2" color="text.secondary">Track previously completed coursework across your curriculum.</Typography>
				</Box>
				<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
					<Tooltip title="Copy JSON to clipboard">
						<Button variant="outlined" size="small" startIcon={<FileCopy />} onClick={exportJson}>{copyStatus === 'copied' ? 'Copied!' : 'Export JSON'}</Button>
					</Tooltip>
					<Tooltip title="Clear all entries (local)" >
						<Button variant="outlined" size="small" color="error" startIcon={<Refresh />} onClick={clearAll}>
							Clear All
						</Button>
					</Tooltip>
				</Box>
			</Box>
			<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2, flex: 1, alignItems: 'stretch' }}>
				{renderColumn('general', 'General Education', 'Core / general education / foundational courses already completed.', 0)}
				{renderColumn('program', 'Program Requirements', 'Major / minor / program-specific requirement courses completed.', 1)}
				{renderColumn('electives', 'Electives', 'Elective or exploratory courses taken that count toward credit totals.', 2)}
			</Box>
			<Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
				<Typography variant="body2" color="text.secondary">Grand Total Credits: {grandTotal}</Typography>
			</Box>
		</Box>
	);
}

