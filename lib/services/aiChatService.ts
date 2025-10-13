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
      
      semester_scheduling: `
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
      semester_scheduling: "For complex scheduling decisions and course planning, an advisor can provide detailed guidance specific to your program requirements.",
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