export interface ChannelPreferences {
  push: boolean;
  email: boolean;
}

export interface NotificationPreferencesPayload {
  events: Record<string, ChannelPreferences>;
}
