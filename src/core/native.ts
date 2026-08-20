declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isDesktopApp(): boolean {
  return Boolean(window.__TAURI_INTERNALS__);
}

export async function checkForCoreUpdate(): Promise<"none" | "installed"> {
  if (!isDesktopApp()) return "none";
  const [{ check }, { relaunch }] = await Promise.all([
    import("@tauri-apps/plugin-updater"),
    import("@tauri-apps/plugin-process"),
  ]);
  const update = await check();
  if (!update) return "none";
  await update.downloadAndInstall();
  await relaunch();
  return "installed";
}

export async function notifyUpdate(title: string, body: string): Promise<void> {
  if (isDesktopApp()) {
    const notifications = await import("@tauri-apps/plugin-notification");
    const permission = await notifications.isPermissionGranted();
    if (permission) notifications.sendNotification({ title, body });
    return;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export async function enableNotifications(): Promise<boolean> {
  if (isDesktopApp()) {
    const notifications = await import("@tauri-apps/plugin-notification");
    if (await notifications.isPermissionGranted()) return true;
    return (await notifications.requestPermission()) === "granted";
  }
  if (!("Notification" in window)) return false;
  return (await Notification.requestPermission()) === "granted";
}

export async function listenForTrayCheckUpdate(handler: () => void): Promise<() => void> {
  if (!isDesktopApp()) return () => undefined;
  const { listen } = await import("@tauri-apps/api/event");
  return listen("check-update", () => void handler());
}
