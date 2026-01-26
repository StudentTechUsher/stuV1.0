'use client';

export const CALENDAR_EXPORT_CLASS = 'stu-calendar-exporting';

export type CalendarCaptureResult = {
  dataUrl: string;
  width: number;
  height: number;
};

const EXPORT_DATA_ATTR = 'data-calendar-export';

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export async function captureCalendarPng(targetEl: HTMLElement): Promise<CalendarCaptureResult> {
  const html2canvas = (await import('html2canvas')).default;

  const hadExportClass = targetEl.classList.contains(CALENDAR_EXPORT_CLASS);
  const previousBg = targetEl.style.backgroundColor;
  const previousHeight = targetEl.style.height;
  const previousMaxHeight = targetEl.style.maxHeight;
  const previousOverflow = targetEl.style.overflow;
  const previousWidth = targetEl.style.width;
  const previousMaxWidth = targetEl.style.maxWidth;
  const previousPaddingBottom = targetEl.style.paddingBottom;
  const hadDataAttr = targetEl.hasAttribute(EXPORT_DATA_ATTR);

  const fullHeight = Math.max(targetEl.scrollHeight, targetEl.offsetHeight);
  const fullWidth = Math.max(targetEl.scrollWidth, targetEl.offsetWidth);
  const legendEl = targetEl.querySelector<HTMLElement>('[data-calendar-export-legend="true"]');
  const legendRect = legendEl?.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const legendBottom = legendRect ? legendRect.bottom - targetRect.top : fullHeight;
  const requiredHeight = Math.max(fullHeight, legendBottom);
  const extraPadding = 80;

  const adjustedNodes = Array.from(
    targetEl.querySelectorAll<HTMLElement>('.fc-scroller, .fc-timegrid-body, .fc-timegrid-slots, .fc-view-harness')
  ).map(node => ({
    node,
    height: node.style.height,
    maxHeight: node.style.maxHeight,
    overflow: node.style.overflow,
  }));

  const scroller = targetEl.querySelector<HTMLElement>('.fc-scroller');
  const scrollerParent = scroller?.closest<HTMLElement>('.fc-view-harness, .fc-view-harness-active');
  const scrollerHeight = scroller ? Math.max(scroller.scrollHeight, scroller.offsetHeight) : null;

  targetEl.classList.add(CALENDAR_EXPORT_CLASS);
  targetEl.setAttribute(EXPORT_DATA_ATTR, 'true');
  targetEl.style.backgroundColor = '#ffffff';
  targetEl.style.height = `${requiredHeight + extraPadding}px`;
  targetEl.style.maxHeight = 'none';
  targetEl.style.overflow = 'visible';
  targetEl.style.width = `${fullWidth}px`;
  targetEl.style.maxWidth = 'none';
  targetEl.style.paddingBottom = `${extraPadding}px`;

  adjustedNodes.forEach(({ node }) => {
    node.style.height = 'auto';
    node.style.maxHeight = 'none';
    node.style.overflow = 'visible';
  });

  if (scroller && scrollerHeight) {
    scroller.style.height = `${scrollerHeight}px`;
  }
  if (scrollerParent && scrollerHeight) {
    scrollerParent.style.height = `${scrollerHeight}px`;
  }

  await nextFrame();

  try {
    const canvas = await html2canvas(targetEl, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      onclone: clonedDoc => {
        const cloneRoot = clonedDoc.querySelector(`[${EXPORT_DATA_ATTR}="true"]`) as HTMLElement | null;
        if (cloneRoot) {
          cloneRoot.classList.add(CALENDAR_EXPORT_CLASS);
          cloneRoot.style.backgroundColor = '#ffffff';
          cloneRoot.style.height = `${requiredHeight + extraPadding}px`;
          cloneRoot.style.maxHeight = 'none';
          cloneRoot.style.overflow = 'visible';
          cloneRoot.style.width = `${fullWidth}px`;
          cloneRoot.style.maxWidth = 'none';
          cloneRoot.style.paddingBottom = `${extraPadding}px`;

          const cloneNodes = cloneRoot.querySelectorAll<HTMLElement>('.fc-scroller, .fc-timegrid-body, .fc-timegrid-slots');
          cloneNodes.forEach(node => {
            node.style.height = 'auto';
            node.style.maxHeight = 'none';
            node.style.overflow = 'visible';
          });

          const cloneScroller = cloneRoot.querySelector<HTMLElement>('.fc-scroller');
          const cloneParent = cloneScroller?.closest<HTMLElement>('.fc-view-harness, .fc-view-harness-active');
          const cloneScrollerHeight = cloneScroller ? Math.max(cloneScroller.scrollHeight, cloneScroller.offsetHeight) : null;
          if (cloneScroller && cloneScrollerHeight) {
            cloneScroller.style.height = `${cloneScrollerHeight}px`;
          }
          if (cloneParent && cloneScrollerHeight) {
            cloneParent.style.height = `${cloneScrollerHeight}px`;
          }
        }
      },
    });

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    if (!hadExportClass) {
      targetEl.classList.remove(CALENDAR_EXPORT_CLASS);
    }
    if (!hadDataAttr) {
      targetEl.removeAttribute(EXPORT_DATA_ATTR);
    }
    targetEl.style.backgroundColor = previousBg;
    targetEl.style.height = previousHeight;
    targetEl.style.maxHeight = previousMaxHeight;
    targetEl.style.overflow = previousOverflow;
    targetEl.style.width = previousWidth;
    targetEl.style.maxWidth = previousMaxWidth;
    targetEl.style.paddingBottom = previousPaddingBottom;

    adjustedNodes.forEach(({ node, height, maxHeight, overflow }) => {
      node.style.height = height;
      node.style.maxHeight = maxHeight;
      node.style.overflow = overflow;
    });
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
