import { supabaseAdmin } from "../supabaseAdmin";
import { encodeAccessId } from "../utils/access-id";
import { createNotifForPlanReady } from './notifService';
import { sendGradPlanCreatedEmail } from './emailService';

/**
 * AUTHORIZED FOR ANONYMOUS USERS AND ABOVE (depending on use case)
 * Fetches an AI prompt by its name
 * @param prompt_name
 * @return
 **/
export async function GetAiPrompt(prompt_name: string) {
  const { data, error } = await supabaseAdmin
    .from('ai_prompts')
    .select('*')
    .eq('prompt_name', prompt_name)
    .single();

  if (error) {
    console.error('❌ Error fetching AI prompt:', error);
    return null;
  }

  return data?.prompt || null;
}

/**
 * AUTHORIZED FOR STUDENTS AND ABOVE
 * Inserts a newly generated AI graduation plan into the grad_plan table.
 * Returns { gradPlanId, accessId } or throws on fatal errors.
 */
export async function InsertGeneratedGradPlan(args: {
  profileId: string;
  planData: unknown; // structured plan object or array
  rawJsonText?: string; // optional raw JSON text if you still want to retain
  programsInPlan?: number[]; // optional associated program IDs
  isActive?: boolean; // default false for newly generated pending plan
}): Promise<{ gradPlanId: number; accessId: string }> {
  const { profileId, planData, programsInPlan = [], isActive = false } = args;

  const { data, error } = await supabaseAdmin
    .from('grad_plan')
    .insert({
      profile_id: profileId,
      is_active: isActive,
      pending_edits: false,
      pending_approval: true,
      plan_details: planData, // store structured object/array directly
      programs_in_plan: programsInPlan
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('⚠️ Error inserting generated grad plan:', error);
    throw new Error('Failed to store generated graduation plan');
  }

  const accessId = encodeAccessId(data.id);

  console.log(`📧 InsertGeneratedGradPlan: Plan inserted with ID ${data.id}, accessId: ${accessId}, profileId: ${profileId}`);

  // Send notification and email to user that the plan is ready
  try {
    // Create in-app notification
    console.log(`📧 Calling createNotifForPlanReady for user ${profileId}, accessId: ${accessId}`);
    const notifResult = await createNotifForPlanReady(profileId, accessId);
    console.log(`✅ In-app notification created successfully:`, notifResult);

    // Get user's email and name from profiles table
    console.log(`📧 Fetching user profile for email notification...`);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, fname')
      .eq('id', profileId)
      .single();

      if (profileError) {
        console.error('⚠️ Failed to fetch user profile for email:', profileError);
      } else if (profile?.email) {
        const firstName = profile.fname || 'Student';
        console.log(`📧 Attempting to send email...`);
        console.log(`   - To: ${profile.email}`);
        console.log(`   - First Name: ${firstName}`);
        console.log(`   - Access ID: ${accessId}`);

        try {
          await sendGradPlanCreatedEmail({
            studentFirstName: firstName,
            studentEmail: profile.email,
            planAccessId: accessId
          });
          console.log(`✅ Grad plan created email sent successfully to ${profile.email}`);
        } catch (emailError) {
          console.error('❌ Email sending failed with error:', emailError);
          if (emailError instanceof Error) {
            console.error('   - Error message:', emailError.message);
            console.error('   - Error stack:', emailError.stack);
          }
        }
      } else {
        console.warn('⚠️ User profile found but has no email address');
        console.warn('   - Profile data:', JSON.stringify(profile));
      }
  } catch (notifError) {
    console.error('⚠️ Failed to create plan ready notification or send email:', notifError);
    // Don't throw - notification failure shouldn't block plan creation
  }

  return { gradPlanId: data.id, accessId };
}

/**
 * Insert a chat exchange (user message + AI response) with a session_id to group related messages.
 * Falls back gracefully if some analytics fields are missing.
 */
export async function InsertAiChatExchange(args: {
  userId: string | null;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  outputTokens?: number;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, sessionId, userMessage, aiResponse, outputTokens = 0 } = args;
  try {
    const { error } = await supabaseAdmin
      .from('ai_responses')
      .insert({
        user_id: userId, // can be null if anonymous usage is allowed by RLS
        session_id: sessionId,
        user_prompt: userMessage,
        response: aiResponse,
        output_tokens: outputTokens,
      });
    if (error) {
      console.error('InsertAiChatExchange failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
