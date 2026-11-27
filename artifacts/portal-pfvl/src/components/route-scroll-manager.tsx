import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { scrollToHashTarget } from "./scroll-utils";

function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function isPlainPrimaryClick(event: MouseEvent) {
  return (
    !event.defaultPrevented
    && event.button === 0
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
  );
}

export function RouteScrollManager() {
  const [location] = useLocation();
  const [navigationRevision, setNavigationRevision] = useState(0);
  const lastHandledUrl = useRef<string | null>(null);
  const cancelPendingTargetScroll = useRef<(() => void) | null>(null);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const handleNavigation = () => {
      setNavigationRevision((revision) => revision + 1);
    };

    const handleSamePageLink = (event: MouseEvent) => {
      if (!isPlainPrimaryClick(event) || !(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !link
        || link.hasAttribute("download")
        || (link.target && link.target.toLowerCase() !== "_self")
      ) {
        return;
      }

      const href = link.getAttribute("href")?.trim();
      if (!href || href === "#" || href.startsWith("javascript:")) return;

      let destination: URL;
      try {
        destination = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      const samePage =
        destination.pathname === current.pathname
        && destination.search === current.search;
      if (!samePage) return;

      if (!destination.hash) {
        scrollToPageTop();
      } else if (destination.hash === current.hash) {
        cancelPendingTargetScroll.current?.();
        cancelPendingTargetScroll.current = scrollToHashTarget(destination.hash);
      }
    };

    window.addEventListener("pushState", handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("hashchange", handleNavigation);
    document.addEventListener("click", handleSamePageLink, true);

    return () => {
      window.history.scrollRestoration = previousRestoration;
      window.removeEventListener("pushState", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("hashchange", handleNavigation);
      document.removeEventListener("click", handleSamePageLink, true);
      cancelPendingTargetScroll.current?.();
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const currentUrl = `${url.pathname}${url.search}${url.hash}`;
    if (lastHandledUrl.current === currentUrl) return;

    lastHandledUrl.current = currentUrl;
    cancelPendingTargetScroll.current?.();
    cancelPendingTargetScroll.current = null;
    scrollToPageTop();

    if (url.hash) {
      cancelPendingTargetScroll.current = scrollToHashTarget(url.hash);
    }
  }, [location, navigationRevision]);

  return null;
}
