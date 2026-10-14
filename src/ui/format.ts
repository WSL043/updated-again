import { getLanguage, t } from "../i18n";
import { localDay } from "../core/calendar";

export function dateTimeLabel(value?: string): string {
  if (!value) return t("等待中");
  return new Intl.DateTimeFormat(getLanguage(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function shortDateLabel(value?: string): string {
  return localDay(value ? new Date(value) : new Date());
}
