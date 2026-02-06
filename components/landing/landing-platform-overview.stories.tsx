import type { Meta, StoryObj } from "@storybook/react"
import { LandingPlatformOverview } from "./landing-platform-overview"

const meta = {
  title: "Landing/Platform Overview",
  component: LandingPlatformOverview,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingPlatformOverview>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
