export type ProgramRow = {
    id: string;
    university_id: number;
    name: string;
    program_type: string; // consider: 'major' | 'minor'
    version: string | number | null;
    created_at: string;
    modified_at: string | null;
    requirements: unknown;
};