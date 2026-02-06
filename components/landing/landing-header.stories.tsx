import type { Meta, StoryObj } from "@storybook/react"
import { LandingHeader } from "./landing-header"

const meta = {
  title: "Landing/Header",
  component: LandingHeader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
