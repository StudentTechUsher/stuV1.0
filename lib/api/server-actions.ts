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
    const prompt = `
    You are an academic advisor AI. Given the following selected courses and program requirements, 
    organize them into a logical semester-by-semester plan for a 4-year degree.
    
    Consider:
    - Prerequisites and course dependencies
    - Typical course load (12-18 credits per semester)
    - General education requirements should be spread throughout
    - Major requirements should be sequenced appropriately
    - Electives should fill gaps and meet credit requirements
    - Most students take 8 semesters (4 years), but can adjust if needed
    
    Input data:
    ${JSON.stringify(coursesData, null, 2)}
    
    Please return a JSON response with a logical semester plan structure.
    `;

    console.log('🔄 Using stub implementation - OpenAI integration is ready but commented out');
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock AI response with a sample semester plan
    const mockSemesterPlan = {
      "plan": [
        {
          "term": "1",
          "notes": "Foundation semester - focus on core skills and general education",
          "courses": [
            {
              "code": "UNIV 101",
              "title": "University Foundations",
              "credits": 2,
              "fulfills": ["University Requirements"]
            },
            {
              "code": "WRTG 150",
              "title": "Writing & Rhetoric",
              "credits": 3,
              "fulfills": ["First-Year Writing"]
            },
            {
              "code": "MATH 110",
              "title": "College Algebra",
              "credits": 4,
              "fulfills": ["Quantitative Literacy"]
            },
            {
              "code": "BIO 100",
              "title": "Principles of Biology",
              "credits": 3,
              "fulfills": ["Physical Science"]
            }
          ],
          "credits_planned": 12
        },
        {
          "term": "2",
          "notes": "Continue building foundation with major prerequisites",
          "courses": [
            {
              "code": "ACC 200",
              "title": "Principles of Accounting",
              "credits": 3,
              "fulfills": ["Business Prerequisites"]
            },
            {
              "code": "ECON 110",
              "title": "Economic Principles",
              "credits": 3,
              "fulfills": ["Social Science"]
            },
            {
              "code": "ENG 201",
              "title": "Literature Survey",
              "credits": 3,
              "fulfills": ["Humanities"]
            },
            {
              "code": "HIST 101",
              "title": "World History",
              "credits": 3,
              "fulfills": ["Social Science"]
            }
          ],
          "credits_planned": 12
        }
      ]
    };

    /* COMMENTED OUT - OpenAI Implementation Ready for Activation
    console.log('Sending request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
    
    console.log('✅ AI-generated semester plan:', semesterPlan);
    
    return {
      success: true,
      message: 'Semester plan generated successfully!',
      semesterPlan: semesterPlan
    };
    */
    
    // Store the mock response in the database
    try {
      const { error: insertError } = await supabase
        .from('ai_responses')
        .insert({
          user_id: user.id,
          response: JSON.stringify(mockSemesterPlan)
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
      message: 'AI-organized semester plan generated successfully! (Using mock data)',
      semesterPlan: mockSemesterPlan
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

  console.log('✅ Found student_id:', studentData.id);

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