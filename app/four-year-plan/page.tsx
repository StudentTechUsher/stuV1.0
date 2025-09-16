"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { PlanHeader } from "@/components/ui/plan-header"
import { SemesterCard } from "@/components/ui/semester-card"
import { CourseCard } from "@/components/ui/course-card"
import Link from "next/link"
import { usePlanStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ResetIcon } from "@radix-ui/react-icons"
import { SavePlanDialog } from "@/components/ui/save-plan-dialog"

// Dynamically import DragDropContext with SSR disabled
const DragDropContext = dynamic(
  () => import('@/components/ui/drag-drop-context').then(mod => mod.DragDropContext),
  { ssr: false }
)

export default function FourYearPlanPage() {
  const [selectedMajor, setSelectedMajor] = React.useState("")
  const [useCreditLimit, setUseCreditLimit] = React.useState(false)
  const { 
    creditLimit, 
    setCreditLimit,
    semesters,
    isLoading,
    resetToDefault
  } = usePlanStore()
  const [graduationTerm, setGraduationTerm] = React.useState("")
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false)

  if (isLoading || !semesters || semesters.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading your plan...</h2>
          <p className="text-zinc-500">Please wait while we fetch your data</p>
        </div>
      </div>
    )
  }

  return (
    <DragDropContext>
      <div className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-40 glass-effect border-b">
          <div className="container mx-auto px-6 flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-3xl font-bold tracking-tight mr-8">
                stu.
              </Link>
              <PlanHeader
                selectedMajor={selectedMajor}
                onMajorChange={setSelectedMajor}
                useCreditLimit={useCreditLimit}
                onUseCreditLimitChange={setUseCreditLimit}
                creditLimit={creditLimit ?? 18}
                onCreditLimitChange={setCreditLimit}
                graduationTerm={graduationTerm}
                onGraduationTermChange={setGraduationTerm}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefault}
              className="ml-4"
            >
              <ResetIcon className="h-4 w-4 mr-2" />
              Reset Plan
            </Button>
          </div>
        </div>

        <main className="flex-1">
          <div className="container mx-auto py-4 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 [&>*]:h-full">
              {/* Year 1 */}
              <div className="flex flex-col gap-4 h-full">
                {semesters[0] && (
                  <SemesterCard 
                    key={semesters[0].term} 
                    term={semesters[0].term} 
                    className="flex-1"
                  >
                    {semesters[0].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
                {semesters[1] && (
                  <SemesterCard 
                    key={semesters[1].term} 
                    term={semesters[1].term} 
                    className="flex-1"
                  >
                    {semesters[1].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
              </div>

              {/* Year 2 */}
              <div className="flex flex-col gap-4 h-full">
                {semesters[2] && (
                  <SemesterCard 
                    key={semesters[2].term} 
                    term={semesters[2].term} 
                    className="flex-1"
                  >
                    {semesters[2].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
                {semesters[3] && (
                  <SemesterCard 
                    key={semesters[3].term} 
                    term={semesters[3].term} 
                    className="flex-1"
                  >
                    {semesters[3].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
              </div>

              {/* Year 3 */}
              <div className="flex flex-col gap-4 h-full">
                {semesters[4] && (
                  <SemesterCard 
                    key={semesters[4].term} 
                    term={semesters[4].term} 
                    className="flex-1"
                  >
                    {semesters[4].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
                {semesters[5] && (
                  <SemesterCard 
                    key={semesters[5].term} 
                    term={semesters[5].term} 
                    className="flex-1"
                  >
                    {semesters[5].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
              </div>

              {/* Year 4 */}
              <div className="flex flex-col gap-4 h-full">
                {semesters[6] && (
                  <SemesterCard 
                    key={semesters[6].term} 
                    term={semesters[6].term} 
                    className="flex-1"
                  >
                    {semesters[6].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
                {semesters[7] && (
                  <SemesterCard 
                    key={semesters[7].term} 
                    term={semesters[7].term} 
                    className="flex-1"
                  >
                    {semesters[7].courses.map((course) => (
                      <CourseCard
                        key={course.code}
                        courseCode={course.code}
                        courseTitle={course.title}
                        credits={course.credits}
                      />
                    ))}
                  </SemesterCard>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Save Plan Button and Dialog */}
        <div className="fixed bottom-6 right-6">
          <Button
            variant="outline"
            size="lg"
            className="bg-white shadow-lg"
            onClick={() => setIsSaveDialogOpen(true)}
          >
            SAVE PLAN
          </Button>
        </div>

        <SavePlanDialog 
          open={isSaveDialogOpen} 
          onOpenChange={setIsSaveDialogOpen} 
        />
      </div>
    </DragDropContext>
  )
} 