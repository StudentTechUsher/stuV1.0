import { useState } from "react"
import { UploadIcon } from "lucide-react"
import { Button } from "./button"
import { usePlanStore } from "@/lib/store"

export const UploadFile: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null)
  const uploadPlan = usePlanStore(state => state.uploadPlan)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string
        const json = JSON.parse(raw)

        const semesters = Object.entries(json).map(([term, data]: any) => ({
          term,
          courses: data.courses.map((c: any) => ({
            code: c.code,
            title: c.name,
            credits: c.credits,
          })),
        }))

        uploadPlan({ semesters })
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
