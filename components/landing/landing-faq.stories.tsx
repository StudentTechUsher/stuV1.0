import type { Meta, StoryObj } from "@storybook/react"
import { LandingFaq } from "./landing-faq"

const meta = {
  title: "Landing/FAQ",
  component: LandingFaq,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingFaq>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
