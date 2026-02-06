import type { Meta, StoryObj } from "@storybook/react"
import { LandingProblem } from "./landing-problem"

const meta = {
  title: "Landing/Problem",
  component: LandingProblem,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingProblem>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
