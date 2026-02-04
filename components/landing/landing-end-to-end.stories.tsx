import type { Meta, StoryObj } from "@storybook/react"
import { LandingEndToEnd } from "./landing-end-to-end"

const meta = {
  title: "Landing/End To End",
  component: LandingEndToEnd,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingEndToEnd>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
