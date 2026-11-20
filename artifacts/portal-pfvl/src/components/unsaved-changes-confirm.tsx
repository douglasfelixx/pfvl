import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
