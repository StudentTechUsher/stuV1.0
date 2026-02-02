import { conversationService } from './conversationService';
import { RouteContext, getRouteContextDescription } from '@/hooks/useRouteContext';

export interface ChatMessage {
  content: string;
  isUser: boolean;
}

export interface ChatResponse {
  response: string;
  escalationSuggested: boolean;
  tokenCount: number;
  intentCategory: string;
}

export interface ParsedTranscriptCourse {
  courseCode: string;
  title: string;
  credits: number;
  grade: string | null;
}

export class AIChatService {
  private static instance: AIChatService;
  private readonly MAX_TOKENS_PER_CONVERSATION = 4000;
  
  static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  async sendMessage(
    userId: string,
    message: string,
    routeContext: RouteContext,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    try {
      // Get or create conversation
      const conversationId = await conversationService.getOrCreateConversation(userId, routeContext);
      
      // Check token limits
      const currentTokens = await conversationService.getTotalTokensInConversation(conversationId);
      if (currentTokens > this.MAX_TOKENS_PER_CONVERSATION) {
        return {
          response: "I notice our conversation has gotten quite long. For the best experience, let's start a fresh conversation or consider connecting with an advisor for more detailed assistance.",
          escalationSuggested: true,
          tokenCount: 0,
          intentCategory: 'token_limit_reached'
        };
      }

      // Check if escalation is needed
      const escalationNeeded = await conversationService.checkEscalationNeeded(conversationId, routeContext);
      
      if (escalationNeeded) {
        return this.createEscalationResponse(routeContext);
      }

      // Build context-aware system prompt
      const systemPrompt = this.buildSystemPrompt(routeContext);
      
      // Prepare messages for OpenAI
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      // Call OpenAI API
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { content, usage } = await response.json();
      
      // Analyze response for escalation triggers
      const escalationSuggested = this.shouldSuggestEscalation(content, message, routeContext);
      const intentCategory = this.categorizeIntent(message);

      // Save to conversation history
      await conversationService.saveMessage(
        userId,
        message,
        content,
        routeContext,
        conversationId,
        {
          token_count: usage?.total_tokens || 0,
          intent_category: intentCategory,
          escalation_suggested: escalationSuggested,
        }
      );

      return {
        response: content,
        escalationSuggested,
        tokenCount: usage?.total_tokens || 0,
        intentCategory,
      };

    } catch (error) {
      console.error('Error in AI chat service:', error);
      return {
        response: "I'm sorry, I'm having trouble responding right now. Please try again in a moment, or consider reaching out to your advisor for assistance.",
        escalationSuggested: true,
        tokenCount: 0,
        intentCategory: 'error'
      };
    }
  }

  async parseTranscriptCourses(transcriptText: string): Promise<ParsedTranscriptCourse[]> {
    const systemPrompt =
      "You extract structured course records from transcript snippets. " +
      "Always respond with valid JSON only (no prose). The JSON must be an array. " +
      "Each array item should include: courseCode (string), title (string), credits (number), grade (string|null). " +
      "Use null if the grade is missing. Convert credits to numbers.";

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          "Transcript content:\n\n" +
          transcriptText +
          "\n\nReturn only the JSON array of courses you can confidently extract.",
      },
    ];

    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          max_tokens: 800,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse transcript with AI');
      }

      const { content } = await response.json();
      return this.extractCoursesFromResponse(content);
    } catch (error) {
      console.error('AI transcript parsing failed:', error);
      throw error instanceof Error ? error : new Error('Failed to parse transcript with AI');
    }
  }

  private extractCoursesFromResponse(content: string): ParsedTranscriptCourse[] {
    const parsed = this.parseJsonPayload(content);

    const items =
      Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).courses)
        ? (parsed as Record<string, unknown>).courses
        : null;

    if (!items) {
      throw new Error('AI response did not contain a course list');
    }

    const courses: ParsedTranscriptCourse[] = [];
    for (const item of items as unknown[]) {
      const normalized = this.normalizeCourseRecord(item);
      if (normalized) {
        courses.push(normalized);
      }
    }

    return courses;
  }

  private parseJsonPayload(rawContent: string): unknown {
    const sanitized = rawContent
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const direct = this.tryJsonParse(sanitized);
    if (direct.success) {
      return direct.value;
    }

    const arrayMatch = sanitized.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const attempt = this.tryJsonParse(arrayMatch[0]);
      if (attempt.success) {
        return attempt.value;
      }
    }

    const objectMatch = sanitized.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      const attempt = this.tryJsonParse(objectMatch[0]);
      if (attempt.success) {
        return attempt.value;
      }
    }

    console.error('Failed to parse JSON from AI response:', { rawContent });
    throw new Error('AI response was not valid JSON');
  }

  private tryJsonParse(payload: string): { success: true; value: unknown } | { success: false } {
    if (!payload) {
      return { success: false };
    }

    try {
      const value = JSON.parse(payload);
      return { success: true, value };
    } catch (_error) {
      return { success: false };
    }
  }

  private normalizeCourseRecord(record: unknown): ParsedTranscriptCourse | null {
    if (!record || typeof record !== 'object') {
      return null;
    }

    const raw = record as Record<string, unknown>;
    const courseCodeValue = raw.courseCode ?? raw.code ?? raw.course ?? null;
    const titleValue = raw.title ?? raw.name ?? raw.description ?? null;
    const creditsValue = raw.credits ?? raw.creditHours ?? raw.credit ?? null;
    const gradeValue = raw.grade ?? null;

    if (typeof courseCodeValue !== 'string' || !courseCodeValue.trim()) {
      console.warn('Skipping AI course with missing courseCode', record);
      return null;
    }

    if (typeof titleValue !== 'string' || !titleValue.trim()) {
      console.warn('Skipping AI course with missing title', record);
      return null;
    }

    let credits = typeof creditsValue === 'number' ? creditsValue : Number(creditsValue);
    if (!Number.isFinite(credits)) {
      console.warn('Skipping AI course with invalid credits', record);
      return null;
    }

    credits = Number(credits.toFixed(2));

    const normalizedGrade =
      gradeValue === null || gradeValue === undefined || gradeValue === ''
        ? null
        : String(gradeValue).trim();

    return {
      courseCode: courseCodeValue.trim(),
      title: titleValue.trim(),
      credits,
      grade: normalizedGrade,
    };
  }

  private buildSystemPrompt(routeContext: RouteContext): string {
    const contextDescription = getRouteContextDescription(routeContext);
    
    const basePrompt = `You are an academic planning assistant helping students with their educational journey. The student is currently ${contextDescription}.

Key guidelines:
- Provide helpful, accurate information about academic planning
- Be encouraging and supportive
- If you're unsure about specific policies or requirements, suggest connecting with an advisor
- Keep responses concise but thorough
- Focus on actionable advice when possible`;

    const contextSpecificPrompts: Record<RouteContext, string> = {
      graduation_planning: `
- Help with course selection, prerequisites, and graduation requirements
- Suggest optimal course sequencing and timing
- Identify potential scheduling conflicts or issues`,
      
      career_exploration: `
- Provide insights about career paths and industry trends
- Suggest relevant courses, internships, or experiences
- Help connect academic choices to career goals`,
      
      advisor_review: `
- Focus on plan analysis and feedback
- Highlight areas that need attention or approval
- Suggest improvements to graduation plans`,
      
      pathfinder: `
- Help explore academic and career pathways
- Suggest relevant majors, minors, and course options
- Connect interests to potential career directions`,
      
      course_scheduling: `
- Help balance course loads and timing
- Consider prerequisites and course availability
- Suggest backup options for full courses`,
      
      inbox: `
- Help with notifications and messages
- Provide context about academic communications
- Guide through important updates and deadlines`,
      
      academic_history: `
- Help review completed coursework and progress
- Identify gaps or opportunities in academic record
- Suggest improvements for future planning`,
      
      general: `
- Provide general academic guidance and support
- Help navigate the academic planning system
- Answer questions about university resources and processes`
    };

    return basePrompt + (contextSpecificPrompts[routeContext] || contextSpecificPrompts.general);
  }

  private shouldSuggestEscalation(response: string, userMessage: string, _routeContext: RouteContext): boolean {
    const escalationKeywords = [
      'specific policy',
      'exact requirement',
      'official approval',
      'detailed review',
      'complex situation',
      'special circumstances',
      'not sure',
      'recommend speaking with',
      'suggest contacting'
    ];

    const userUrgencyKeywords = [
      'urgent',
      'deadline',
      'asap',
      'immediately',
      'graduating soon',
      'need approval'
    ];

    const responseContainsEscalation = escalationKeywords.some(keyword => 
      response.toLowerCase().includes(keyword)
    );

    const userShowsUrgency = userUrgencyKeywords.some(keyword =>
      userMessage.toLowerCase().includes(keyword)
    );

    return responseContainsEscalation || userShowsUrgency;
  }

  private categorizeIntent(message: string): string {
    const message_lower = message.toLowerCase();
    
    if (message_lower.includes('course') || message_lower.includes('class')) {
      return 'course_planning';
    }
    if (message_lower.includes('requirement') || message_lower.includes('credit')) {
      return 'requirements';
    }
    if (message_lower.includes('schedule') || message_lower.includes('semester')) {
      return 'scheduling';
    }
    if (message_lower.includes('career') || message_lower.includes('job')) {
      return 'career_guidance';
    }
    if (message_lower.includes('advisor') || message_lower.includes('meeting')) {
      return 'advisor_request';
    }
    
    return 'general';
  }

  private createEscalationResponse(routeContext: RouteContext): ChatResponse {
    const escalationMessages: Record<RouteContext, string> = {
      graduation_planning: "I notice you've had several questions about graduation planning. An advisor can provide personalized guidance for your specific situation. Would you like me to help you schedule a meeting with your advisor?",
      career_exploration: "You've been exploring many career options! An advisor can help you create a more detailed plan that aligns with your interests and goals. Would you like to connect with career services?",
      advisor_review: "For detailed plan reviews and approvals, it's best to work directly with an advisor. They can provide the official guidance you need.",
      pathfinder: "I see you're exploring different academic pathways. An advisor can help you create a personalized plan that matches your interests and career goals.",
      course_scheduling: "For complex scheduling decisions and course planning, an advisor can provide detailed guidance specific to your program requirements.",
      inbox: "If you have questions about important notifications or deadlines, an advisor can provide clarification and assistance.",
      academic_history: "For detailed review of your academic progress and planning, an advisor can provide comprehensive guidance.",
      general: "I notice you have several ongoing questions. An advisor can provide more comprehensive, personalized assistance. Would you like help connecting with your advisor?"
    };

    return {
      response: escalationMessages[routeContext],
      escalationSuggested: true,
      tokenCount: 0,
      intentCategory: 'escalation_triggered'
    };
  }
}

export const aiChatService = AIChatService.getInstance();
