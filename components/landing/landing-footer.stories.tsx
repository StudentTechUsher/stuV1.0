import type { Meta, StoryObj } from "@storybook/react"
import { LandingFooter } from "./landing-footer"

const meta = {
  title: "Landing/Footer",
  component: LandingFooter,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingFooter>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
