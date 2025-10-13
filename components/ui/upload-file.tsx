import { UploadIcon } from "lucide-react"
import { Button } from "./button"
import { usePlanStore } from "@/lib/store"

export const UploadFile: React.FC = () => {
  const uploadPlan = usePlanStore(state => state.uploadPlan)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const raw = event.target?.result
        if (typeof raw !== "string") {
          throw new Error("Unexpected file contents")
        }
        const parsed = JSON.parse(raw) as unknown

        if (typeof parsed !== "object" || parsed === null) {
          throw new Error("Invalid plan format")
        }

        const semesters = Object.entries(parsed as Record<string, unknown>).map(([term, data]) => {
          if (!data || typeof data !== "object") {
            throw new Error("Invalid semester data")
          }

          const coursesRaw = (data as Record<string, unknown>).courses
          if (!Array.isArray(coursesRaw)) {
            throw new Error("Courses must be an array")
          }

          return {
            term,
            courses: coursesRaw.map((course) => {
              if (!course || typeof course !== "object") {
                throw new Error("Invalid course entry")
              }
              const item = course as Record<string, unknown>
              return {
                code: String(item.code ?? ""),
                title: String(item.name ?? ""),
                credits: Number(item.credits ?? 0),
              }
            }),
          }
        })

        uploadPlan(semesters)
        alert("✅ Plan uploaded and applied!")
      } catch (err) {
        console.error("Upload failed:", err)
        alert("❌ Invalid JSON file.")
      }
    }

    reader.readAsText(file)
  }

  return (
    <label htmlFor="json-upload">
      <input
        id="json-upload"
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button size="sm" className="ml-4 cursor-pointer" asChild>
        <span>
          <UploadIcon className="h-4 w-4 mr-2 inline" />
          Upload Your Plan
        </span>
      </Button>
    </label>
  )
}
