import { supabase } from '@/lib/supabase';
import { RouteContext } from '@/hooks/useRouteContext';

export interface ConversationMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  conversation_id: string;
  token_count?: number;
  intent_category?: string;
}

export interface ConversationMetadata {
  conversation_id: string;
  message_sequence: number;
  intent_category?: string;
  token_count?: number;
  escalation_suggested?: boolean;
  related_question_count?: number;
}

export class ConversationService {
  private static instance: ConversationService;
  
  static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  async getOrCreateConversation(userId: string, routeContext: RouteContext): Promise<string> {
    // Check for existing active conversation for this user and context
    const { data: existingConversation } = await supabase
      .from('ai_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('route_context', routeContext)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within 24 hours
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingConversation && existingConversation.length > 0) {
      const metadata = this.parseMetadata(existingConversation[0].response);
      if (metadata?.conversation_id) {
        return metadata.conversation_id;
      }
    }

    // Create new conversation ID
    return `conv_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    const { data: responses } = await supabase
      .from('ai_responses')
      .select('*')
      .eq('response->conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!responses) return [];

    const messages: ConversationMessage[] = [];

    for (const response of responses) {
      const metadata = this.parseMetadata(response.response);
      
      // Add user message (reconstructed from query)
      messages.push({
        id: `user_${response.id}`,
        content: response.query,
        isUser: true,
        timestamp: new Date(response.created_at),
        conversation_id: conversationId,
      });

      // Add AI response
      messages.push({
        id: `ai_${response.id}`,
        content: response.response,
        isUser: false,
        timestamp: new Date(response.created_at),
        conversation_id: conversationId,
        token_count: metadata?.token_count,
        intent_category: metadata?.intent_category,
      });
    }

    return messages;
  }

  async saveMessage(
    userId: string,
    query: string,
    response: string,
    routeContext: RouteContext,
    conversationId: string,
    metadata: Partial<ConversationMetadata> = {}
  ): Promise<void> {
    const messageSequence = await this.getNextSequenceNumber(conversationId);
    
    const fullMetadata: ConversationMetadata = {
      conversation_id: conversationId,
      message_sequence: messageSequence,
      ...metadata,
    };

    const insertData = {
      user_id: userId,
      query,
      response: JSON.stringify({
        content: response,
        metadata: fullMetadata,
      }),
      route_context: routeContext,
      escalation_flag: metadata.escalation_suggested || false,
    };

    await supabase.from('ai_responses').insert(insertData);
  }

  async checkEscalationNeeded(conversationId: string, routeContext: RouteContext): Promise<boolean> {
    // Get recent messages from this conversation
    const { data: recentMessages } = await supabase
      .from('ai_responses')
      .select('*')
      .eq('response->conversation_id', conversationId)
      .eq('route_context', routeContext)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
      .order('created_at', { ascending: false })
      .limit(6); // Look at last 6 messages (3 exchanges)

    if (!recentMessages || recentMessages.length < 5) return false;

    // Count related questions about the same topic
    const relatedQuestionCount = recentMessages.filter(msg => {
      const metadata = this.parseMetadata(msg.response);
      return metadata?.intent_category === routeContext;
    }).length;

    return relatedQuestionCount >= 5;
  }

  async getTotalTokensInConversation(conversationId: string): Promise<number> {
    const { data: messages } = await supabase
      .from('ai_responses')
      .select('response')
      .eq('response->conversation_id', conversationId);

    if (!messages) return 0;

    return messages.reduce((total, msg) => {
      const metadata = this.parseMetadata(msg.response);
      return total + (metadata?.token_count || 0);
    }, 0);
  }

  private async getNextSequenceNumber(conversationId: string): Promise<number> {
    const { data: lastMessage } = await supabase
      .from('ai_responses')
      .select('response')
      .eq('response->conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!lastMessage || lastMessage.length === 0) return 1;

    const metadata = this.parseMetadata(lastMessage[0].response);
    return (metadata?.message_sequence || 0) + 1;
  }

  private parseMetadata(response: string | object): ConversationMetadata | null {
    try {
      if (typeof response === 'string') {
        const parsed = JSON.parse(response);
        return parsed.metadata || null;
      }
      return (response as any)?.metadata || null;
    } catch {
      return null;
    }
  }
}

export const conversationService = ConversationService.getInstance();