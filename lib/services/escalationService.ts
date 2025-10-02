import { conversationService } from './conversationService';
import { RouteContext } from '@/hooks/useRouteContext';

export interface EscalationSuggestion {
  suggested: boolean;
  reason: string;
  action: 'schedule_meeting' | 'contact_advisor' | 'view_resources';
  urgency: 'low' | 'medium' | 'high';
}

export class EscalationService {
  private static instance: EscalationService;
  
  static getInstance(): EscalationService {
    if (!EscalationService.instance) {
      EscalationService.instance = new EscalationService();
    }
    return EscalationService.instance;
  }

  async checkEscalationForUser(userId: string, routeContext: RouteContext): Promise<EscalationSuggestion> {
    const defaultSuggestion: EscalationSuggestion = {
      suggested: false,
      reason: '',
      action: 'schedule_meeting',
      urgency: 'low'
    };

    try {
      // Check if escalation is needed based on conversation patterns
      const conversationId = await conversationService.getOrCreateConversation(userId, routeContext);
      const escalationNeeded = await conversationService.checkEscalationNeeded(conversationId, routeContext);

      if (!escalationNeeded) {
        return defaultSuggestion;
      }

      // Determine escalation type and urgency based on context
      const escalationInfo = this.getEscalationInfo(routeContext);

      return {
        suggested: true,
        reason: escalationInfo.reason,
        action: escalationInfo.action,
        urgency: escalationInfo.urgency
      };

    } catch (error) {
      console.error('Error checking escalation:', error);
      return defaultSuggestion;
    }
  }

  private getEscalationInfo(routeContext: RouteContext): Omit<EscalationSuggestion, 'suggested'> {
    const escalationMap: Record<RouteContext, Omit<EscalationSuggestion, 'suggested'>> = {
      graduation_planning: {
        reason: 'Multiple questions about graduation requirements suggest complex planning needs',
        action: 'schedule_meeting',
        urgency: 'high'
      },
      career_exploration: {
        reason: 'Career guidance benefits from personalized advisor consultation',
        action: 'contact_advisor',
        urgency: 'medium'
      },
      advisor_review: {
        reason: 'Plan review and approval requires direct advisor interaction',
        action: 'schedule_meeting',
        urgency: 'high'
      },
      pathfinder: {
        reason: 'Complex pathway decisions benefit from advisor guidance',
        action: 'contact_advisor',
        urgency: 'medium'
      },
      semester_scheduling: {
        reason: 'Detailed scheduling conflicts need advisor assistance',
        action: 'schedule_meeting',
        urgency: 'medium'
      },
      inbox: {
        reason: 'Important notifications may require advisor clarification',
        action: 'view_resources',
        urgency: 'low'
      },
      academic_history: {
        reason: 'Academic progress review benefits from advisor insight',
        action: 'schedule_meeting',
        urgency: 'medium'
      },
      general: {
        reason: 'Complex questions benefit from personalized advisor support',
        action: 'contact_advisor',
        urgency: 'low'
      }
    };

    return escalationMap[routeContext];
  }

  getEscalationActionUrl(action: EscalationSuggestion['action']): string {
    const actionUrls = {
      schedule_meeting: '/dashboard/meet-with-advisor',
      contact_advisor: '/dashboard/meet-with-advisor',
      view_resources: '/dashboard/settings'
    };

    return actionUrls[action];
  }

  getEscalationMessage(escalation: EscalationSuggestion): string {
    if (!escalation.suggested) return '';

    const urgencyMessages = {
      high: 'I recommend scheduling a meeting with your advisor soon.',
      medium: 'Consider reaching out to your advisor for guidance.',
      low: 'Your advisor can provide additional resources when needed.'
    };

    return `${escalation.reason}. ${urgencyMessages[escalation.urgency]}`;
  }
}

export const escalationService = EscalationService.getInstance();