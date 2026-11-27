import { getLocale } from "./i18n";

type PrivateStatusLabel = {
  label: string;
  labelEn: string;
};

export function getPrivateStatusLabel(status: PrivateStatusLabel): string {
  return getLocale() === "en-US" ? status.labelEn : status.label;
}

export function getPrivateStatusLabelFromRequest(status: {
  statusLabel: string;
  statusLabelEn: string;
}): string {
  return getLocale() === "en-US" ? status.statusLabelEn : status.statusLabel;
}

export function getPrivateStatusLabelFromNotification(status: {
  statusLabel?: string | null;
  statusLabelEn?: string | null;
}): string | undefined {
  if (!status.statusLabel || !status.statusLabelEn) return undefined;
  return getLocale() === "en-US" ? status.statusLabelEn : status.statusLabel;
}
