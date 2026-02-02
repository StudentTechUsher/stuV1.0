export type ServerEventProperties = {
  action?: string;
  status?: string;
  count?: number;
  duration?: number;
  success?: boolean;
  http_status?: number;
  error_type?: string;
  error_code?: string;
  error_hint?: string;
  model?: string;
  text_length?: number;
  byte_count?: number;
  start_date?: string;
  end_date?: string;
  feature_flag?: string;
  environment?: string;
  runtime?: 'server';
  user_id_hash?: string;
};

type PostHogCapturePayload = {
  api_key: string;
  event: string;
  distinct_id: string;
  properties: ServerEventProperties;
  timestamp?: string;
};

function getPostHogConfig(): { apiKey: string; host: string; environment: string } | null {
  const apiKey = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;

  const host = process.env.POSTHOG_HOST
    || process.env.NEXT_PUBLIC_POSTHOG_HOST
    || 'https://app.posthog.com';

  const environment = process.env.NEXT_PUBLIC_ENV
    || process.env.VERCEL_ENV
    || process.env.NODE_ENV
    || 'production';

  return { apiKey, host, environment };
}

function buildPostHogUrl(host: string): string {
  const trimmedHost = host.endsWith('/') ? host.slice(0, -1) : host;
  return `${trimmedHost}/capture/`;
}

function isServerRuntime(): boolean {
  return typeof window === 'undefined';
}

export async function captureServerEvent(
  event: string,
  properties: ServerEventProperties,
  distinctId = 'server'
): Promise<void> {
  if (!isServerRuntime()) return;

  const config = getPostHogConfig();
  if (!config) return;

  const payload: PostHogCapturePayload = {
    api_key: config.apiKey,
    event,
    distinct_id: distinctId,
    properties: {
      ...properties,
      environment: properties.environment || config.environment,
      runtime: properties.runtime || 'server',
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(buildPostHogUrl(config.host), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('PostHog server capture failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('PostHog server capture failed:', error);
  }
}
