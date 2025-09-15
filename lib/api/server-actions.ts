'use server';

import { getVerifiedUser } from '../supabase/auth';
import { supabase } from '../supabase';

// Secure server action that handles OpenAI API calls and user authentication
export async function OrganizeCoursesIntoSemesters_ServerAction(coursesData: unknown): Promise<{ success: boolean; message: string; semesterPlan?: unknown }> {
  console.log('🔍 OrganizeCoursesIntoSemesters_ServerAction called with:', coursesData);
  
  try {
    // Get the current user from session
    const user = await getVerifiedUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Validate OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare the prompt for OpenAI
    const prompt = await GetAiPrompt('organize_grad_plan');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: prompt.ai_model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content received from OpenAI');
    }
    
    // Parse the AI response (it should be JSON)
    let semesterPlan;
    try {
      semesterPlan = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Store the AI response in the database
    try {
      const { error: insertError } = await supabase
        .from('ai_responses')
        .insert({
          user_id: user.id,
          response: aiContent
        });
      
      if (insertError) {
        console.error('Error storing AI response:', insertError);
        // Don't throw here - we still want to return the plan even if storage fails
      } else {
        console.log('✅ AI response stored successfully for user:', user.id);
      }
    } catch (storageError) {
      console.error('Error storing AI response:', storageError);
      // Continue without throwing - storage failure shouldn't break the main functionality
    }
    
    return {
      success: true,
      message: 'Semester plan generated successfully!',
      semesterPlan: semesterPlan
    };
    
  } catch (error) {
    console.error('❌ Error in OrganizeCoursesIntoSemesters_ServerAction:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate semester plan'
    };
  }
}

// Server-only functions that need to be called from server components
export default async function GetProgramsForUniversity(university_id: number) {
    console.log('🔍 GetProgramsForUniversity called with university_id:', university_id);
    
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', false);

    if (error) {
      console.error('❌ Error fetching programs:', error);
      return [];
    }

    return data || [];
}

export async function GetGenEdsForUniversity(university_id: number) {
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', true);

    if (error) {
      console.error('❌ Error fetching general education programs:', error);
      return [];
    }

    return data || [];
}

export async function GetActiveGradPlan(profile_id: string) {
  console.log('🔍 GetActiveGradPlan called with profile_id:', profile_id);
  
  // First, get the student record to get the numeric student_id
  const { data: studentData, error: studentError } = await supabase
    .from('student')
    .select('id')
    .eq('profile_id', profile_id)
    .single();

  if (studentError) {
    return null;
  }

  if (!studentData) {
    return null;
  }

  // Now get the active grad plan using the numeric student_id
  const { data, error } = await supabase
    .from('grad_plan')
    .select('*')
    .eq('student_id', studentData.id)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('❌ Error fetching active grad plan:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return null;
  }
  
  return data;
}

export async function GetAiPrompt(aiResponseName: string) {
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('response')
    .eq('prompt_name', aiResponseName)
    .single();

  if (error) {
    console.error('❌ Error fetching AI prompt:', error);
    return null;
  }

  return data?.response || null;
}
