import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';
import { Label } from './label';
import { useState } from 'react';

/**
 * Toggle switch component built with Radix UI.
 * Used for binary on/off states.
 */
const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the switch is disabled',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the switch is checked',
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default unchecked switch
 */
export const Default: Story = {
  args: {
    checked: false,
  },
};

/**
 * Checked switch
 */
export const Checked: Story = {
  args: {
    checked: true,
  },
};

/**
 * Switch with label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="notifications" />
      <Label htmlFor="notifications">Enable notifications</Label>
    </div>
  ),
};

/**
 * Disabled unchecked switch
 */
export const DisabledUnchecked: Story = {
  args: {
    disabled: true,
    checked: false,
  },
};

/**
 * Disabled checked switch
 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
};

/**
 * Interactive switch with state management
 */
export const Interactive: Story = {
  render: function InteractiveSwitch() {
    const [checked, setChecked] = useState(false);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            id="interactive"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Label htmlFor="interactive">
            Notifications are {checked ? 'enabled' : 'disabled'}
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Current state: {checked ? 'ON' : 'OFF'}
        </p>
      </div>
    );
  },
};

/**
 * Multiple switches in a settings panel
 */
export const SettingsPanel: Story = {
  render: function SettingsPanelStory() {
    const [settings, setSettings] = useState({
      notifications: true,
      emailUpdates: false,
      darkMode: false,
      autoSave: true,
    });

    const updateSetting = (key: keyof typeof settings) => {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <div className="w-[350px] space-y-4 p-4 border rounded-lg">
        <h3 className="font-semibold text-sm">Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="notif">Push Notifications</Label>
            <Switch
              id="notif"
              checked={settings.notifications}
              onCheckedChange={() => updateSetting('notifications')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email">Email Updates</Label>
            <Switch
              id="email"
              checked={settings.emailUpdates}
              onCheckedChange={() => updateSetting('emailUpdates')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dark">Dark Mode</Label>
            <Switch
              id="dark"
              checked={settings.darkMode}
              onCheckedChange={() => updateSetting('darkMode')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto">Auto-Save</Label>
            <Switch
              id="auto"
              checked={settings.autoSave}
              onCheckedChange={() => updateSetting('autoSave')}
            />
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Dark mode demonstration
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => (
    <div className="dark p-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch id="dark-unchecked" checked={false} />
          <Label htmlFor="dark-unchecked">Unchecked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="dark-checked" checked={true} />
          <Label htmlFor="dark-checked">Checked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="dark-disabled" disabled checked={false} />
          <Label htmlFor="dark-disabled">Disabled</Label>
        </div>
      </div>
    </div>
  ),
};
