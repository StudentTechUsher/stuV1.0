import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const routerPushMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}));

vi.mock('@/components/EditablePlanTitle', () => ({
  default: () => null,
}));

vi.mock('@/components/grad-planner/ProgramSelectionDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/grad-planner/create-grad-plan-dialog', () => ({
  default: () => null,
}));

vi.mock('@/components/grad-planner/ProfileInfoDialog', () => ({
  default: () => null,
}));

vi.mock('@/lib/services/server-actions', () => ({
  updateGradPlanNameAction: vi.fn(),
}));

vi.mock('@/lib/services/gradPlanService', () => ({
  deleteGradPlan: vi.fn(),
}));

vi.mock('@/lib/utils/access-id', () => ({
  encodeAccessIdClient: vi.fn(() => 'mock-access-id'),
}));

import PlanHeader from '@/components/grad-planner/PlanHeader';

afterEach(() => {
  routerPushMock.mockReset();
  routerRefreshMock.mockReset();
  document.querySelectorAll('form[action="/api/grad-plan-agent/launch"]').forEach((form) => form.remove());
});

describe('PlanHeader launch button', () => {
  it('submits a POST form to the agent launch route when useChatbotFlow is enabled', () => {
    const submitSpy = vi
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(() => undefined);

    render(
      <PlanHeader
        selectedGradPlan={null}
        allGradPlans={[]}
        universityId={1}
        useChatbotFlow
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create new plan/i }));

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(routerPushMock).not.toHaveBeenCalled();

    const launchForm = document.querySelector('form[action="/api/grad-plan-agent/launch"]') as HTMLFormElement | null;
    expect(launchForm).toBeTruthy();
    expect(launchForm?.method.toLowerCase()).toBe('post');

    submitSpy.mockRestore();
  });
});
