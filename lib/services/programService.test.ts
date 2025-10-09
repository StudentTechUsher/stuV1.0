import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase } from '@/lib/__mocks__/supabase';
import { ProgramRow } from '@/types/program';

// Mock the database module BEFORE importing the service
vi.mock('@/lib/database', () => ({
  db: mockSupabase,
}));

// NOW import the service after mocking
import GetProgramsForUniversity, {
  fetchProgramsByUniversity,
  GetMajorsForUniversity,
  GetMinorsForUniversity,
  GetGenEdsForUniversity,
  createProgram,
  updateProgram,
  updateProgramRequirements,
  deleteProgram,
} from './programService';

describe('programService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchProgramsByUniversity', () => {
    it('should fetch programs for a university and order by created_at', async () => {
      const mockPrograms: ProgramRow[] = [
        {
          id: '1',
          university_id: 1,
          name: 'Computer Science',
          program_type: 'major',
          version: '1.0',
          created_at: '2024-01-01',
          modified_at: '2024-01-01',
          requirements: {},
        },
      ];

      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockResolvedValue({ data: mockPrograms, error: null });

      const result = await fetchProgramsByUniversity(1);

      expect(mockSupabase.from).toHaveBeenCalledWith('program');
      expect(mockSupabase.select).toHaveBeenCalledWith(
        'id, university_id, name, program_type, version, created_at, modified_at, requirements'
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('university_id', 1);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockPrograms);
    });

    it('should throw error when database query fails', async () => {
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      await expect(fetchProgramsByUniversity(1)).rejects.toThrow('Database error');
    });

    it('should return empty array when no data is found', async () => {
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.order.mockResolvedValue({ data: null, error: null });

      const result = await fetchProgramsByUniversity(1);
      expect(result).toEqual([]);
    });
  });

  describe('GetProgramsForUniversity', () => {
    it('should fetch non-general-ed programs', async () => {
      const mockPrograms = [
        { id: '1', name: 'Computer Science', is_general_ed: false },
      ];

      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ data: mockPrograms, error: null });

      const result = await GetProgramsForUniversity(1);

      expect(mockSupabase.eq).toHaveBeenCalledWith('university_id', 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_general_ed', false);
      expect(result).toEqual(mockPrograms);
    });

    it('should return empty array on error', async () => {
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Database error'),
        });

      const result = await GetProgramsForUniversity(1);
      expect(result).toEqual([]);
    });
  });

  describe('GetMajorsForUniversity', () => {
    it('should fetch only majors', async () => {
      const mockMajors = [
        { id: '1', name: 'Computer Science', program_type: 'major' },
      ];

      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ data: mockMajors, error: null });

      const result = await GetMajorsForUniversity(1);

      expect(mockSupabase.eq).toHaveBeenCalledWith('university_id', 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith('program_type', 'major');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_general_ed', false);
      expect(result).toEqual(mockMajors);
    });
  });

  describe('GetMinorsForUniversity', () => {
    it('should fetch only minors', async () => {
      const mockMinors = [
        { id: '1', name: 'Mathematics', program_type: 'minor' },
      ];

      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ data: mockMinors, error: null });

      const result = await GetMinorsForUniversity(1);

      expect(mockSupabase.eq).toHaveBeenCalledWith('university_id', 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith('program_type', 'minor');
      expect(result).toEqual(mockMinors);
    });
  });

  describe('GetGenEdsForUniversity', () => {
    it('should fetch only general education programs', async () => {
      const mockGenEds = [
        { id: '1', name: 'English 101', is_general_ed: true },
      ];

      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ data: mockGenEds, error: null });

      const result = await GetGenEdsForUniversity(1);

      expect(mockSupabase.eq).toHaveBeenCalledWith('university_id', 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_general_ed', true);
      expect(result).toEqual(mockGenEds);
    });
  });

  describe('createProgram', () => {
    it('should create a new program with timestamps', async () => {
      const newProgram = {
        university_id: 1,
        name: 'Data Science',
        program_type: 'major' as const,
        version: '1.0',
        requirements: {},
      };

      const createdProgram: ProgramRow = {
        id: '1',
        ...newProgram,
        created_at: expect.any(String),
        modified_at: expect.any(String),
      };

      mockSupabase.from.mockReturnThis();
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({ data: createdProgram, error: null });

      const result = await createProgram(newProgram);

      expect(mockSupabase.from).toHaveBeenCalledWith('program');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newProgram,
          created_at: expect.any(String),
          modified_at: expect.any(String),
        })
      );
      expect(result).toEqual(createdProgram);
    });

    it('should throw error when creation fails', async () => {
      mockSupabase.from.mockReturnThis();
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Creation failed'),
      });

      await expect(
        createProgram({
          university_id: 1,
          name: 'Test',
          program_type: 'major',
          version: '1.0',
          requirements: {},
        })
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('updateProgram', () => {
    it('should update program and bump modified_at', async () => {
      const updates = { name: 'Updated Name' };
      const updatedProgram: ProgramRow = {
        id: '1',
        university_id: 1,
        name: 'Updated Name',
        program_type: 'major',
        version: '1.0',
        created_at: '2024-01-01',
        modified_at: expect.any(String),
        requirements: {},
      };

      mockSupabase.from.mockReturnThis();
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({ data: updatedProgram, error: null });

      const result = await updateProgram('1', updates);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          modified_at: expect.any(String),
        })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(updatedProgram);
    });
  });

  describe('updateProgramRequirements', () => {
    it('should update only requirements field', async () => {
      const newRequirements = { courses: ['CS101', 'CS102'] };
      const updatedProgram: ProgramRow = {
        id: '1',
        university_id: 1,
        name: 'Computer Science',
        program_type: 'major',
        version: '1.0',
        created_at: '2024-01-01',
        modified_at: '2024-01-01',
        requirements: newRequirements,
      };

      mockSupabase.from.mockReturnThis();
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValue({ data: updatedProgram, error: null });

      const result = await updateProgramRequirements('1', newRequirements);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        requirements: newRequirements,
      });
      expect(result).toEqual(updatedProgram);
    });
  });

  describe('deleteProgram', () => {
    it('should delete a program by id', async () => {
      mockSupabase.from.mockReturnThis();
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      await deleteProgram('1');

      expect(mockSupabase.from).toHaveBeenCalledWith('program');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should throw error when deletion fails', async () => {
      mockSupabase.from.mockReturnThis();
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({
        error: new Error('Deletion failed'),
      });

      await expect(deleteProgram('1')).rejects.toThrow('Deletion failed');
    });
  });
});
