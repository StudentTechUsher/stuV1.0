import type { Meta, StoryObj } from "@storybook/react"
import { LandingSuccessStories } from "./landing-success-stories"

const meta = {
  title: "Landing/Success Stories",
  component: LandingSuccessStories,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingSuccessStories>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
