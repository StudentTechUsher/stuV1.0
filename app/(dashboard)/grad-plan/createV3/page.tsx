import { redirect } from 'next/navigation';
import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import {
  isGradPlanV3ClientDevtoolsEnabled,
  isGradPlanV3ClientEnabled,
  isGradPlanV3ClientMiniChatEnabled,
  isGradPlanV3LiveJobsEnabled,
  isGradPlanV3DevtoolsEnabled,
  isGradPlanV3Enabled,
} from '@/lib/config/featureFlags';
import CreatePlanClientV3 from './create-plan-client-v3';

export const dynamic = 'force-dynamic';

export default async function CreateGradPlanV3Page() {
  const user = await getVerifiedUser();
  if (!user) {
    return <div>Authentication required</div>;
  }

  const v3Enabled = isGradPlanV3Enabled();
  const v3ClientEnabled = isGradPlanV3ClientEnabled();

  if (!v3Enabled || !v3ClientEnabled) {
    redirect('/grad-plan/createV2');
  }

  const userProfile = await getVerifiedUserProfile();
  if (!userProfile) {
    return <div>Profile not found</div>;
  }

  return (
    <CreatePlanClientV3
      user={user}
      studentProfile={userProfile as Record<string, unknown>}
      v3ClientEnabled={v3ClientEnabled}
      v3DevtoolsEnabled={isGradPlanV3DevtoolsEnabled() && isGradPlanV3ClientDevtoolsEnabled()}
      v3LiveJobsEnabled={isGradPlanV3LiveJobsEnabled()}
      v3MiniChatEnabled={isGradPlanV3ClientMiniChatEnabled()}
    />
  );
}
