import type { Meta, StoryObj } from "@storybook/react"
import { LandingRoleValue } from "./landing-role-value"

const meta = {
  title: "Landing/Role Value",
  component: LandingRoleValue,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingRoleValue>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
