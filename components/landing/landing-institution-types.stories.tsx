import type { Meta, StoryObj } from "@storybook/react"
import { LandingInstitutionTypes } from "./landing-institution-types"

const meta = {
  title: "Landing/Institution Types",
  component: LandingInstitutionTypes,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LandingInstitutionTypes>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
