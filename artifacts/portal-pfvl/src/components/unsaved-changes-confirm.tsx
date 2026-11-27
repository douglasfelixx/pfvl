import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { translateText } from "@/lib/i18n";

export type ConfirmationOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
};

const unsavedChangesOptions: ConfirmationOptions = {
  title: "Alterações não salvas",
  description: "Se sair agora, você perderá as alterações feitas.",
  confirmLabel: "Sair sem salvar",
  cancelLabel: "Continuar editando",
};

export function useUnsavedChangesConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>(unsavedChangesOptions);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback(
    (overrides: Partial<ConfirmationOptions> = {}) =>
      new Promise<boolean>((resolve) => {
        setOptions({ ...unsavedChangesOptions, ...overrides });
        resolver.current = resolve;
        setOpen(true);
      }),
    [],
  );

  const finish = useCallback((confirmed: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setOpen(false);
    resolve?.(confirmed);
  }, []);

  const dialog = (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) finish(false);
        else setOpen(true);
      }}
      open={open}
    >
      <AlertDialogContent
        className="!w-[calc(100%-2rem)] !max-w-md !gap-0 !rounded-2xl !border-[#233a59]/15 !bg-white !p-0 text-[#012140] shadow-[0_24px_80px_rgba(1,33,64,.24)]"
        overlayClassName="bg-[#012140]/55 backdrop-blur-[3px]"
      >
        <AlertDialogHeader className="p-6 pb-5 text-left">
          <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl ${options.destructive ? "bg-red-50 text-red-700" : "bg-[#eef3f8] text-[#233a59]"}`}>
            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="font-display text-xl font-semibold tracking-normal text-[#012140]">
            {translateText(options.title)}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-sm leading-6 text-[#566579]">
            {translateText(options.description)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 border-t border-[#233a59]/10 bg-[#f7f9fc] p-4 sm:rounded-b-2xl">
          <AlertDialogCancel
            className="mt-0 min-h-10 rounded-xl border-[#233a59]/20 bg-white px-4 font-semibold text-[#233a59] hover:bg-[#eef3f8] sm:mt-0"
            onClick={() => finish(false)}
          >
            {translateText(options.cancelLabel)}
          </AlertDialogCancel>
          <AlertDialogAction
            className={`min-h-10 rounded-xl border-0 px-4 font-semibold text-white ${options.destructive ? "bg-red-700 hover:bg-red-800" : "bg-[#012140] hover:bg-[#183b64]"}`}
            onClick={() => finish(true)}
          >
            {translateText(options.confirmLabel)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}

function getFormSnapshot(form: HTMLFormElement): string {
  const controls: unknown[] = [];
  for (const control of Array.from(form.elements)) {
    if (
      !(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)
      || control.disabled
      || (control instanceof HTMLInputElement && ["button", "submit", "reset", "image", "hidden"].includes(control.type))
      || (control instanceof HTMLInputElement && control.readOnly)
      || (control instanceof HTMLTextAreaElement && control.readOnly)
      || control.hasAttribute("data-unsaved-ignore")
    ) continue;

    if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
      controls.push([control.name, control.type, control.value, control.checked]);
    } else if (control instanceof HTMLInputElement && control.type === "file") {
      controls.push([control.name, control.type, Array.from(control.files ?? []).map((file) => [file.name, file.size, file.lastModified])]);
    } else if (control instanceof HTMLSelectElement && control.multiple) {
      controls.push([control.name, "select-multiple", Array.from(control.selectedOptions).map((option) => option.value)]);
    } else {
      controls.push([control.name, control.value]);
    }
  }
  const editableContent = Array.from(form.querySelectorAll<HTMLElement>('[contenteditable="true"]'))
    .map((element) => element.innerHTML);
  return JSON.stringify([controls, editableContent]);
}

/**
 * Call only after a form mutation succeeds. Failed submissions remain protected.
 */
export function markFormSaved(form: HTMLFormElement) {
  form.dispatchEvent(new CustomEvent("pfvl:form-saved", { bubbles: true }));
}

function isUnsavedForm(form: HTMLFormElement) {
  return !form.hasAttribute("data-unsaved-ignore")
    && Boolean(form.querySelector("input:not([type=hidden]), select, textarea, [contenteditable=true]"));
}

function isPlainPrimaryClick(event: MouseEvent) {
  return event.button === 0
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey;
}

/**
 * Protects forms across the portal. Browser close/reload uses the
 * native beforeunload prompt; in-app links and browser history use the shared
 * confirmation dialog.
 */
export function UnsavedChangesGuard() {
  const [location] = useLocation();
  const { confirm, dialog } = useUnsavedChangesConfirm();
  const baselines = useRef(new Map<HTMLFormElement, string>());
  const dirtyForms = useRef(new Set<HTMLFormElement>());
  const currentUrl = useRef(window.location.href);
  const navigationPending = useRef(false);
  const allowNextPop = useRef(false);
  const replayingButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentUrl.current = window.location.href;
    for (const form of dirtyForms.current) {
      if (!form.isConnected) {
        dirtyForms.current.delete(form);
        baselines.current.delete(form);
      }
    }
  }, [location]);

  useEffect(() => {
    const updateCurrentUrl = () => {
      currentUrl.current = window.location.href;
    };
    const hasUnsavedChanges = () => {
      for (const form of dirtyForms.current) {
        if (!form.isConnected) {
          dirtyForms.current.delete(form);
          baselines.current.delete(form);
        }
      }
      return dirtyForms.current.size > 0
        || Boolean(document.querySelector(
          '[data-unsaved-dirty="true"], [data-admin-unsaved-dirty="true"]',
        ));
    };
    const hasFormUnsavedChanges = () => {
      for (const form of dirtyForms.current) {
        if (!form.isConnected) {
          dirtyForms.current.delete(form);
          baselines.current.delete(form);
        }
      }
      return dirtyForms.current.size > 0
        || Boolean(document.querySelector('[data-unsaved-dirty="true"]'));
    };
    const setFormDirtyState = (form: HTMLFormElement) => {
      if (!form.isConnected || !isUnsavedForm(form)) return;
      const snapshot = getFormSnapshot(form);
      const baseline = baselines.current.get(form);
      if (baseline === undefined) {
        baselines.current.set(form, snapshot);
        return;
      }
      if (snapshot === baseline) dirtyForms.current.delete(form);
      else dirtyForms.current.add(form);
    };
    const getFormFromTarget = (target: EventTarget | null) =>
      target instanceof Element ? target.closest("form") : null;
    const handleFocus = (event: FocusEvent) => {
      const form = getFormFromTarget(event.target);
      if (!form || !isUnsavedForm(form) || dirtyForms.current.has(form)) return;
      baselines.current.set(form, getFormSnapshot(form));
    };
    const handleInput = (event: Event) => {
      const form = getFormFromTarget(event.target);
      if (form) setFormDirtyState(form);
    };
    const handleReset = (event: Event) => {
      const form = getFormFromTarget(event.target);
      if (!form) return;
      window.setTimeout(() => {
        baselines.current.set(form, getFormSnapshot(form));
        dirtyForms.current.delete(form);
      }, 0);
    };
    const handleSaved = (event: Event) => {
      const form = getFormFromTarget(event.target);
      if (!form) return;
      window.setTimeout(() => {
        baselines.current.set(form, getFormSnapshot(form));
        dirtyForms.current.delete(form);
      }, 0);
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented
        || !isPlainPrimaryClick(event)
        || !(event.target instanceof Element)
        || navigationPending.current
      ) return;
      const button = event.target.closest<HTMLButtonElement>(
        'button[role="tab"], button[data-testid^="admin-nav-"], button[data-testid="button-sign-out"], button[aria-controls^="support-request-detail-"]',
      );
      if (button && replayingButton.current === button) {
        replayingButton.current = null;
        return;
      }
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      const isAdminSectionButton = button?.matches('button[data-testid^="admin-nav-"]') ?? false;
      const shouldProtectButton = button
        ? isAdminSectionButton
          ? hasFormUnsavedChanges()
          : button.matches('button[data-testid="button-sign-out"]')
            ? hasUnsavedChanges()
            : hasFormUnsavedChanges()
        : hasUnsavedChanges();
      if (!shouldProtectButton) return;

      let destination: URL | null = null;
      if (anchor) {
        if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
        try {
          destination = new URL(anchor.href, window.location.href);
        } catch {
          return;
        }
        if (destination.origin !== window.location.origin) return;
        const current = new URL(window.location.href);
        if (destination.pathname === current.pathname && destination.search === current.search) return;
      } else if (!button) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      navigationPending.current = true;
      void confirm().then((confirmed) => {
        navigationPending.current = false;
        if (!confirmed) return;
        for (const form of dirtyForms.current) {
          baselines.current.set(form, getFormSnapshot(form));
        }
        dirtyForms.current.clear();
        if (destination) {
          window.history.pushState({}, "", destination.href);
        } else if (button?.isConnected) {
          replayingButton.current = button;
          button.click();
        }
      });
    };
    const handlePopState = (event: PopStateEvent) => {
      if (allowNextPop.current) {
        allowNextPop.current = false;
        currentUrl.current = window.location.href;
        return;
      }
      if (navigationPending.current || !hasUnsavedChanges()) {
        currentUrl.current = window.location.href;
        return;
      }

      const destination = window.location.href;
      event.stopImmediatePropagation();
      window.history.pushState(window.history.state, "", currentUrl.current);
      navigationPending.current = true;
      void confirm().then((confirmed) => {
        navigationPending.current = false;
        if (!confirmed) return;
        for (const form of dirtyForms.current) {
          baselines.current.set(form, getFormSnapshot(form));
        }
        dirtyForms.current.clear();
        // The previous entry is the destination the user was navigating to.
        allowNextPop.current = true;
        window.history.back();
        window.setTimeout(() => {
          if (allowNextPop.current) {
            allowNextPop.current = false;
            window.history.pushState({}, "", destination);
          }
        }, 300);
      });
    };

    document.addEventListener("focusin", handleFocus, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
    document.addEventListener("reset", handleReset, true);
    document.addEventListener("pfvl:form-saved", handleSaved, true);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState, true);
    window.addEventListener("pushState", updateCurrentUrl);
    window.addEventListener("replaceState", updateCurrentUrl);
    window.addEventListener("hashchange", updateCurrentUrl);

    return () => {
      document.removeEventListener("focusin", handleFocus, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleInput, true);
      document.removeEventListener("reset", handleReset, true);
      document.removeEventListener("pfvl:form-saved", handleSaved, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState, true);
      window.removeEventListener("pushState", updateCurrentUrl);
      window.removeEventListener("replaceState", updateCurrentUrl);
      window.removeEventListener("hashchange", updateCurrentUrl);
    };
  }, [confirm]);

  return dialog;
}
