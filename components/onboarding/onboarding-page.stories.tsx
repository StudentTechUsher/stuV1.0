import type { Meta, StoryObj } from "@storybook/react"
import { OnboardingPage } from "./onboarding-page"

const universities = [
  { id: 1, name: "Brigham Young University" },
  { id: 2, name: "University of Utah" },
  { id: 3, name: "Utah State University" },
  { id: 4, name: "Boise State University" },
]

const meta = {
  title: "Onboarding/OnboardingPage",
  component: OnboardingPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof OnboardingPage>

export default meta
type Story = StoryObj<typeof meta>

export const Student: Story = {
  args: {
    userName: "Alex Johnson",
    universities,
    initialRole: "student",
  },
}

export const Advisor: Story = {
  args: {
    userName: "Taylor Rivera",
    universities,
    initialRole: "advisor",
  },
}

export const StudentDarkMode: Story = {
  args: Student.args,
  globals: {
    colorMode: "dark",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
}

export const AdvisorDarkMode: Story = {
  args: Advisor.args,
  globals: {
    colorMode: "dark",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
}
