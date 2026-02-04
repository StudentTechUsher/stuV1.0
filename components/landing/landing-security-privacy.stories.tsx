import type { Meta, StoryObj } from "@storybook/react"
import { LandingSecurityPrivacy } from "./landing-security-privacy"

const meta = {
  title: "Landing/Security Privacy",
  component: LandingSecurityPrivacy,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingSecurityPrivacy>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
