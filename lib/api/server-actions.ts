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
    // const prompt = await GetAiPrompt('organize_grad_plan');
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

    Output:
    - Return **ONLY** JSON matching this schema exactly (no extra text):

    Example format:
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
          "term": "2",
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
    
    Input data:
    ${JSON.stringify(coursesData, null, 2)}
    `
    
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [{ role: "user", content: prompt }],
        // JSON mode moved here:
        text: { format: { type: "json_object" } }, // <- was response_format
        max_output_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${err}`);
    }

    type ResponsesApiResult = {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type: string; text?: { value?: string } }>;
      }>;
    };

    const aiResponse = (await response.json()) as ResponsesApiResult;

    // Preferred: concatenated text
    let aiText = aiResponse.output_text;

    // Fallback (defensive)
    if (!aiText && aiResponse.output?.[0]?.content?.[0]?.text?.value) {
      aiText = aiResponse.output[0].content[0].text.value!;
    }

    if (!aiText) {
      throw new Error("No content received from OpenAI");
    }

    // Parse JSON (we asked for JSON mode)
    let semesterPlan: unknown;
    try {
      semesterPlan = JSON.parse(aiText);
    } catch (e) {
      console.error("Error parsing AI response:", e);
      throw new Error("Invalid JSON response from AI");
    }

    // Store the raw JSON string
    try {
      const { error: insertError } = await supabase
        .from("ai_responses")
        .insert({ user_id: user.id, response: aiText });

      if (insertError) console.error("Error storing AI response:", insertError);
      else console.log("✅ AI response stored successfully for user:", user.id);
    } catch (storageError) {
      console.error("Error storing AI response:", storageError);
    }

    return {
      success: true,
      message: "Semester plan generated successfully!",
      semesterPlan,
    };
  } catch (error) {
    console.error("Error generating semester plan:", error);
    return {
      success: false,
      message: "Failed to generate semester plan.",
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

export async function GetAiPrompt(prompt_name: string) {
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('prompt')
    .eq('prompt_name', prompt_name)
    .single();

  if (error) {
    console.error('❌ Error fetching AI prompt:', error);
    return null;
  }

  return data?.prompt || null;
}
