import type { Meta, StoryObj } from "@storybook/react"
import { LandingReasons } from "./landing-reasons"

const meta = {
  title: "Landing/Reasons",
  component: LandingReasons,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingReasons>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
