import type { Meta, StoryObj } from "@storybook/react"
import { LandingFinalCta } from "./landing-final-cta"

const meta = {
  title: "Landing/Final CTA",
  component: LandingFinalCta,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingFinalCta>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
