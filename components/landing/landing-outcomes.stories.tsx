import type { Meta, StoryObj } from "@storybook/react"
import { LandingOutcomes } from "./landing-outcomes"

const meta = {
  title: "Landing/Outcomes",
  component: LandingOutcomes,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingOutcomes>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
