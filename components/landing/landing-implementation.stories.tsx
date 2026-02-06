import type { Meta, StoryObj } from "@storybook/react"
import { LandingImplementation } from "./landing-implementation"

const meta = {
  title: "Landing/Implementation",
  component: LandingImplementation,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingImplementation>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
