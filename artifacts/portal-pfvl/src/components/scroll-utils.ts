const TARGET_WAIT_TIMEOUT_MS = 10_000;
const TARGET_HEADER_GAP_PX = 12;

export function scrollToElementBelowHeader(
  target: HTMLElement,
  behavior: ScrollBehavior = "auto",
) {
  if (!target.isConnected) return;

  const header = document.querySelector<HTMLElement>(".site-header");
  const headerBottom = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
  const targetTop = window.scrollY + target.getBoundingClientRect().top;

  window.scrollTo({
    top: Math.max(0, targetTop - headerBottom - TARGET_HEADER_GAP_PX),
    left: 0,
    behavior,
  });
}

export function scrollToHashTarget(hash: string) {
  const encodedTargetId = hash.replace(/^#/, "");
  if (!encodedTargetId || typeof window === "undefined") return () => {};

  let targetId = encodedTargetId;
  try {
    targetId = decodeURIComponent(encodedTargetId);
  } catch {
    // Keep the original id if the URL contains a malformed escape sequence.
  }

  let frame = 0;
  let timeout = 0;
  let stopped = false;
  let observer: MutationObserver | undefined;

  const cleanup = () => {
    stopped = true;
    if (frame) window.cancelAnimationFrame(frame);
    if (timeout) window.clearTimeout(timeout);
    observer?.disconnect();
  };

  const attemptScroll = () => {
    frame = 0;
    if (stopped) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    cleanup();
    scrollToElementBelowHeader(target);
  };

  const scheduleAttempt = () => {
    if (!stopped && !frame) {
      frame = window.requestAnimationFrame(attemptScroll);
    }
  };

  observer = new MutationObserver(scheduleAttempt);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  timeout = window.setTimeout(cleanup, TARGET_WAIT_TIMEOUT_MS);
  scheduleAttempt();

  return cleanup;
}
