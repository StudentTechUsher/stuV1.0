'use server';

import { getVerifiedUser } from '../supabase/auth';
import { supabase } from '../supabase';


export async function fetchProgramsByUniversity(universityId: number): Promise<ProgramRow[]> {
    const { data, error } = await supabase
    .from('program')
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ProgramRow[];
}


export async function updateProgramRequirements(id: string, requirements: unknown): Promise<ProgramRow> {
    const { data, error } = await supabase
        .from('program')
        .update({ requirements })
        .eq('id', id)
        .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
        .single();

    if (error) throw error;
    return data as ProgramRow;
}

export async function updateProgram(id: string, updates: Partial<Omit<ProgramRow, 'id' | 'created_at'>>): Promise<ProgramRow> {
    // Ensure modified_at is always updated
    const updateData = {
        ...updates,
        modified_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('program')
        .update(updateData)
        .eq('id', id)
        .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
        .single();

    if (error) throw error;
    return data as ProgramRow;
}

export async function deleteProgram(id: string): Promise<void> {
    const { error } = await supabase
        .from('program')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function createGraduationPlan(planData: unknown): Promise<{ success: boolean; message: string; planId?: string }> {
    // TODO: Implement graduation plan creation logic
    // This is a stub function that will be implemented later
    
    console.log('Creating graduation plan with data:', planData);
    
    try {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, just return a success response
        return {
            success: true,
            message: 'Graduation plan created successfully!',
            planId: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        };
    } catch (error) {
        console.error('Error creating graduation plan:', error);
        return {
            success: false,
            message: 'Failed to create graduation plan. Please try again.'
        };
    }
}

export async function submitGradPlanForApproval(
    studentId: number,
    planDetails: unknown
): Promise<{ success: boolean; message: string; planId?: string }> {
    try {
        
        const { data, error } = await supabase
            .from('grad_plan')
            .insert({
                student_id: studentId,
                is_active: false,
                plan_details: planDetails,
                pending_approval: true,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error submitting graduation plan for approval:', {
                error: error,
                errorMessage: error.message,
                errorDetails: error.details,
                errorHint: error.hint,
                errorCode: error.code,
                studentId: studentId,
                planDetailsType: typeof planDetails,
                planDetailsLength: Array.isArray(planDetails) ? planDetails.length : 'not an array'
            });
            throw error;
        }

        return {
            success: true,
            message: 'Graduation plan submitted for approval successfully!',
            planId: data.id.toString()
        };
    } catch (error) {
        console.error('Caught error in submitGradPlanForApproval:', error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return {
            success: false,
            message: 'Failed to submit graduation plan for approval. Please try again.'
        };
    }
}

export default async function GetProgramsForUniversity(university_id: number) {
    
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

export async function GetStudentProfile(user_id: string) {
  console.log('🔍 GetStudentProfile called with user_id:', user_id);
  
  // First, let's try the student table
  const { data: studentData, error: studentError } = await supabase
    .from('student')
    .select('*')
    .eq('profile_id', user_id)
    .single();

  if (!studentError && studentData) {
    console.log('✅ Found student record:', studentData);
    console.log('📊 Student university_id:', studentData.university_id);
    return studentData;
  }
  
  // If not found in student table, try profiles table
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, university_id')
    .eq('id', user_id)
    .single();

  if (profileError) {
    console.error('❌ Error fetching from both tables:', { studentError, profileError });
    return null;
  }
  
  // Map the id to profile_id for consistency
  const mappedProfile = {
    profile_id: profileData.id,
    university_id: profileData.university_id
  };
  
  return mappedProfile;
}

export async function GetActiveGradPlan(profile_id: string) {
  
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

export async function OrganizeCoursesIntoSemesters_ServerAction(coursesData: unknown): Promise<{ success: boolean; message: string; semesterPlan?: unknown }> {
  console.log('🔍 OrganizeCoursesIntoSemesters called with:', coursesData);
  
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
    
    Please return a JSON response with the following structure:
    {
    "plan": [
        {
        "term": "1",
        "notes": "Get comfortable with Excel and study habits.",
        "courses": [
            {
            "code": "UNIV 101",
            "title": "BYU Foundations for Student Success",
            "credits": 2,
            "fulfills": [
                "Foundations for Student Success"
            ]
            },
            {
            "code": "WRTG 150",
            "title": "Writing & Rhetoric",
            "credits": 3,
            "fulfills": [
                "First-Year Writing"
            ]
            },
            {
            "code": "A HTG 100",
            "title": "American Heritage",
            "credits": 3,
            "fulfills": [
                "American Heritage"
            ]
            },
            {
            "code": "IS 110",
            "title": "Spreadsheets & Bus Analysis",
            "credits": 1,
            "fulfills": [
                "Pre-Business"
            ]
            },
            {
            "code": "IS 201",
            "title": "Intro to Information Systems",
            "credits": 3,
            "fulfills": [
                "Pre-Business Prereq"
            ]
            },
            {
            "code": "REL C 200",
            "title": "The Eternal Family",
            "credits": 2,
            "fulfills": [
                "Religion cornerstone"
            ]
            },
            {
            "code": "REL A 275",
            "title": "Teachings & Doctrine of the Book of Mormon",
            "credits": 2,
            "fulfills": [
                "Religion cornerstone/BoM option"
            ]
            }
        ],
        "credits_planned": 16
        },
        {
        "term": "2",
        "notes": "Target B+ or better in ACC 200.",
        "courses": [
            {
            "code": "ACC 200",
            "title": "Principles of Accounting",
            "credits": 3,
            "fulfills": [
                "Pre-Business Prereq"
            ]
            },
            {
            "code": "ECON 110",
            "title": "Economic Principles & Problems",
            "credits": 3,
            "fulfills": [
                "Pre-Business"
            ]
            },
            {
            "code": "MKTG 201",
            "title": "Marketing Management",
            "credits": 3,
            "fulfills": [
                "Pre-Business"
            ]
            },
            {
            "code": "ANTHR 101",
            "title": "Social/Cultural Anthropology",
            "credits": 3,
            "fulfills": [
                "Global & Cultural Awareness (GCA)"
            ]
            },
            {
            "code": "REL A 121",
            "title": "The Book of Mormon",
            "credits": 2,
            "fulfills": [
                "Religion cornerstone/BoM"
            ]
            }
        ],
        "credits_planned": 14
        },
        {
        "term": "3",
        "notes": "Meet B+ in ACC 310 to be eligible to apply.",
        "courses": [
            {
            "code": "ACC 310",
            "title": "Principles of Accounting 2",
            "credits": 3,
            "fulfills": [
                "Pre-Business Prereq"
            ]
            },
            {
            "code": "ACC 241",
            "title": "Business Law",
            "credits": 3,
            "fulfills": [
                "Pre-Business"
            ]
            },
            {
            "code": "FIN 201",
            "title": "Principles of Finance",
            "credits": 3,
            "fulfills": [
                "Pre-Business"
            ]
            },
            {
            "code": "M COM 320",
            "title": "Management Communication",
            "credits": 3,
            "fulfills": [
                "Advanced Writing/Oral Comm"
            ]
            },
            {
            "code": "REL A 250",
            "title": "Christ & the Everlasting Gospel",
            "credits": 2,
            "fulfills": [
                "Religion cornerstone"
            ]
            }
        ],
        "credits_planned": 14
        },
        {
        "term": "4",
        "notes": "Apply to Accounting Junior Core for next semester.",
        "courses": [
            {
            "code": "REL C 225",
            "title": "Foundations of the Restoration",
            "credits": 2,
            "fulfills": [
                "Religion cornerstone"
            ]
            },
            {
            "code": "REL C 333",
            "title": "The Living Prophets",
            "credits": 2,
            "fulfills": [
                "Religion elective"
            ]
            },
            {
            "code": "REL A 122",
            "title": "The Book of Mormon (Part 2)",
            "credits": 2,
            "fulfills": [
                "Religion elective"
            ]
            },
            {
            "code": "GEOG 120",
            "title": "Geography & World Affairs",
            "credits": 3,
            "fulfills": [
                "GCA (alt.)"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective",
            "credits": 3,
            "fulfills": [
                "Elective"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective",
            "credits": 3,
            "fulfills": [
                "Elective"
            ]
            }
        ],
        "credits_planned": 15
        },
        {
        "term": "5",
        "notes": "Junior Core begins.",
        "courses": [
            {
            "code": "ACC 401",
            "title": "Bus & Acc Info Systems",
            "credits": 3,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 403",
            "title": "Interm Financial Accounting 1",
            "credits": 3,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 405",
            "title": "Fundamentals of Taxation",
            "credits": 3,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 408",
            "title": "Critical Thinking",
            "credits": 1.5,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 410",
            "title": "Acct. Prof. Development I",
            "credits": 1.5,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective/GE",
            "credits": 2,
            "fulfills": [
                "Elective/GE"
            ]
            }
        ],
        "credits_planned": 14
        },
        {
        "term": "6",
        "courses": [
            {
            "code": "ACC 402",
            "title": "Cost & Managerial Accounting",
            "credits": 3,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 404",
            "title": "Financial Accounting 2",
            "credits": 3,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 406",
            "title": "Financial Statement Auditing",
            "credits": 3,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 407",
            "title": "Data Analytics in Accounting",
            "credits": 3,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 409",
            "title": "Integrated Topics",
            "credits": 1.5,
            "fulfills": [
                "Junior Core"
            ]
            },
            {
            "code": "ACC 411",
            "title": "Acct. Prof. Development II",
            "credits": 1.5,
            "fulfills": [
                "Junior Core"
            ]
            }
        ],
        "credits_planned": 15
        },
        {
        "term": "7",
        "notes": "Round out remaining GE categories not explicitly listed above.",
        "courses": [
            {
            "code": "FIN 402",
            "title": "Managerial Finance",
            "credits": 3,
            "fulfills": [
                "Business Core"
            ]
            },
            {
            "code": "HRM 391",
            "title": "Organizational Effectiveness",
            "credits": 3,
            "fulfills": [
                "Business Core"
            ]
            },
            {
            "code": "STRAT 392",
            "title": "Strategy and Economics",
            "credits": 3,
            "fulfills": [
                "Business Core"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective/GE",
            "credits": 3,
            "fulfills": [
                "Elective/GE"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective/GE",
            "credits": 3,
            "fulfills": [
                "Elective/GE"
            ]
            }
        ],
        "credits_planned": 15
        },
        {
        "term": "8",
        "notes": "Complete exit survey; verify all GE/Religion totals.",
        "courses": [
            {
            "code": "MSB 571",
            "title": "Ethics for Accounting",
            "credits": 3,
            "fulfills": [
                "Business Core"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective/GE",
            "credits": 3,
            "fulfills": [
                "Elective/GE"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective/GE",
            "credits": 3,
            "fulfills": [
                "Elective/GE"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective/GE",
            "credits": 3,
            "fulfills": [
                "Elective/GE"
            ]
            },
            {
            "code": "Free Elective",
            "title": "Open elective/GE",
            "credits": 2,
            "fulfills": [
                "Elective/GE"
            ]
            }
        ],
        "credits_planned": 14
        },
        {
        "term": "9",
        "notes": "Get comfortable with Excel and study habits.",
        "courses": [
            {
            "code": "UNIV 101",
            "title": "BYU Foundations for Student Success",
            "credits": 2,
            "fulfills": [
                "Foundations for Student Success"
            ]
            },
            {
            "code": "WRTG 150",
            "title": "Writing & Rhetoric",
            "credits": 3,
            "fulfills": [
                "First-Year Writing"
            ]
            },
            {
            "code": "A HTG 100",
            "title": "American Heritage",
            "credits": 3,
            "fulfills": [
                "American Heritage"
            ]
            },
            {
            "code": "IS 110",
            "title": "Spreadsheets & Bus Analysis",
            "credits": 1,
            "fulfills": [
                "Pre-Business"
            ]
            },
            {
            "code": "IS 201",
            "title": "Intro to Information Systems",
            "credits": 3,
            "fulfills": [
                "Pre-Business Prereq"
            ]
            },
            {
            "code": "REL C 200",
            "title": "The Eternal Family",
            "credits": 2,
            "fulfills": [
                "Religion cornerstone"
            ]
            },
            {
            "code": "REL A 275",
            "title": "Teachings & Doctrine of the Book of Mormon",
            "credits": 2,
            "fulfills": [
                "Religion cornerstone/BoM option"
            ]
            }
        ],
        "credits_planned": 16
        }
    ],
    "program": "BS Accounting",
    "assumptions": [
        "Junior Core begins in Fall only.",
        "Minimum B in ACC 200 and ACC 310 before applying to the Accounting program.",
        "M COM 320 satisfies Advanced Writing.",
        "Religion 'cornerstones' included; total Religion hours planned ≈ 14."
    ],
    "checkpoints": [
        {
        "term": "9",
        "action": "Apply to Accounting Junior Core",
        "conditions": [
            "ACC 200 (B+) and ACC 310 (B+) completed",
            "Pre-business set substantially complete",
            "Plan Junior Core for Semester 5"
        ]
        },
        {
        "term": "8",
        "notes": "Per Requirement 5.",
        "action": "Complete exit survey"
        }
    ],
    "duration_years": 4,
    "requirement_buckets_covered": {
        "junior_core": [
        "ACC 401",
        "ACC 402",
        "ACC 403",
        "ACC 404",
        "ACC 405",
        "ACC 406",
        "ACC 407",
        "ACC 408",
        "ACC 409",
        "ACC 410",
        "ACC 411"
        ],
        "pre_business": [
        "ACC 241",
        "ECON 110",
        "FIN 201",
        "IS 110",
        "M COM 320",
        "MKTG 201"
        ],
        "business_core": [
        "FIN 402",
        "HRM 391",
        "MSB 571",
        "STRAT 392"
        ],
        "religion_plan": [
        "REL C 200",
        "REL C 225",
        "REL A 121",
        "REL A 122",
        "REL A 250",
        "REL A 275",
        "REL C 333"
        ],
        "gen_ed_examples": [
        "UNIV 101",
        "A HTG 100",
        "ANTHR 101",
        "GEOG 120"
        ],
        "pre_business_prereqs": [
        "ACC 200",
        "ACC 310",
        "IS 201"
        ]
    }
    }
    `;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert academic advisor who organizes a list of courses into terms.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
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
    
  } catch (error) {
    console.error('❌ Error in OrganizeCoursesIntoSemesters:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate semester plan'
    };
  }
}
