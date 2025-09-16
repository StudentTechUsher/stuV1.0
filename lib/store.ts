import { create } from 'zustand'

interface Course {
  code: string
  title: string
  credits: number
  id?: string
  semesterTerm?: string
}

interface Semester {
  term: string
  courses: Course[]
}

interface PlanState {
  semesters: Semester[]
  isLoading: boolean
  creditLimit: number
  activeCourseId: string | null
  setSemesters: (semesters: Semester[]) => void
  setIsLoading: (loading: boolean) => void
  setCreditLimit: (limit: number) => void
  setActiveCourseId: (courseId: string | null) => void
  addCourseToSemester: (term: string, course: Course) => void
  removeCourseFromSemester: (term: string, courseId: string) => void
  moveCourse: (courseId: string, fromTerm: string, toTerm: string, toIndex?: number) => void
  getCourse: (courseId: string) => Course | undefined
  getSemester: (term: string) => Semester | undefined
  getSemesterCredits: (term: string) => number
  isSemesterOverLimit: (term: string, limit?: number) => boolean
  uploadPlan: (semesters: Semester[]) => void
  resetPlan: () => void
  resetToDefault: () => void
}

export const usePlanStore = create<PlanState>((set, get) => ({
  semesters: [],
  isLoading: false,
  creditLimit: 18,
  activeCourseId: null,
  
  setSemesters: (semesters) => set({ semesters }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setCreditLimit: (limit) => set({ creditLimit: limit }),
  setActiveCourseId: (courseId) => set({ activeCourseId: courseId }),
  
  addCourseToSemester: (term, course) => set((state) => ({
    semesters: state.semesters.map(semester =>
      semester.term === term
        ? { ...semester, courses: [...semester.courses, { ...course, id: course.id || Math.random().toString(36) }] }
        : semester
    )
  })),
  
  removeCourseFromSemester: (term, courseId) => set((state) => ({
    semesters: state.semesters.map(semester =>
      semester.term === term
        ? { ...semester, courses: semester.courses.filter(course => course.id !== courseId) }
        : semester
    )
  })),
  
  moveCourse: (courseId, fromTerm, toTerm, toIndex) => set((state) => {
    const course = state.semesters
      .find(s => s.term === fromTerm)
      ?.courses.find(c => c.id === courseId)
    
    if (!course) return state
    
    return {
      semesters: state.semesters.map(semester => {
        if (semester.term === fromTerm) {
          return { ...semester, courses: semester.courses.filter(c => c.id !== courseId) }
        }
        if (semester.term === toTerm) {
          const updatedCourses = [...semester.courses]
          if (toIndex !== undefined && toIndex >= 0) {
            updatedCourses.splice(toIndex, 0, course)
          } else {
            updatedCourses.push(course)
          }
          return { ...semester, courses: updatedCourses }
        }
        return semester
      })
    }
  }),
  
  getSemesterCredits: (term) => {
    const semester = get().semesters.find(s => s.term === term)
    return semester?.courses.reduce((total, course) => total + course.credits, 0) || 0
  },
  
  getCourse: (courseId) => {
    for (const semester of get().semesters) {
      const course = semester.courses.find(c => c.id === courseId)
      if (course) return course
    }
    return undefined
  },
  
  getSemester: (term) => {
    return get().semesters.find(s => s.term === term)
  },
  
  isSemesterOverLimit: (term, limit = 18) => {
    return get().getSemesterCredits(term) > limit
  },
  
  uploadPlan: (semesters) => set({ semesters }),
  
  resetPlan: () => set({ semesters: [] }),
  
  resetToDefault: () => set({ 
    semesters: [], 
    isLoading: false, 
    creditLimit: 18 
  })
}))

// Initialize store function for compatibility
export const initializeStore = () => {
  // This function exists for compatibility but doesn't need to do anything
  // since Zustand handles initialization automatically
}
