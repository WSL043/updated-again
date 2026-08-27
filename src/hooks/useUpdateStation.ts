import { useCallback, useEffect, useMemo, useState } from "react";
import { rollbackLatest } from "../capabilities";
import { checkForCoreUpdate, enableNotifications, listenForTrayCheckUpdate, notifyUpdate } from "../core/native";
import { loadArchive, saveArchive } from "../core/storage";
import type { FeedIndex, LocalArchive, UpdateCapsule } from "../core/types";
import { fetchCapsule, fetchCoreVersion, fetchFeed, findPendingCapsules, installVerifiedCapsule } from "../core/update-client";

export type StationStatus = "idle" | "checking" | "installing" | "error";

export function useUpdateStation() {
  const [archive, setArchive] = useState<LocalArchive>(() => loadArchive());
  const [feed, setFeed] = useState<FeedIndex | null>(null);
  const [capsules, setCapsules] = useState<Map<string, UpdateCapsule>>(new Map());
  const [status, setStatus] = useState<StationStatus>("idle");
  const [notice, setNotice] = useState("正在读取公共更新账本……");
  const [coreVersion, setCoreVersion] = useState("0.1.2");

  const persist = useCallback((next: LocalArchive) => {
    setArchive(next);
    saveArchive(next);
  }, []);

  const installedIds = useMemo(() => new Set(archive.state.installedIds), [archive.state.installedIds]);
  const pendingCount = feed?.entries.filter((entry) => !installedIds.has(entry.id)).length ?? 0;
  const latestEntry = feed?.entries[0];
  const latestCapsule = latestEntry ? capsules.get(latestEntry.id) : undefined;
  const isBusy = status === "checking" || status === "installing";

  const refresh = useCallback(async () => {
    setStatus("checking");
    setNotice("正在核对签名账本……");
    try {
      const nextFeed = await fetchFeed();
      setFeed(nextFeed);
      const pending = await findPendingCapsules(nextFeed, archive);
      const latest = nextFeed.entries[0];
      const visible = [...pending];
      if (latest && !visible.some((capsule) => capsule.id === latest.id)) {
        visible.push(await fetchCapsule(latest.path));
      }
      setCapsules((current) => new Map([
        ...current,
        ...visible.map((capsule) => [capsule.id, capsule] as const),
      ]));
      setNotice(pending.length ? `有 ${pending.length} 个经过签名的变化等待安装。` : "你已经拥有当前全部变化。");
      if (pending.length) await notifyUpdate("Updated Again 又更了", pending[0].reason.headline);
      if (archive.autoInstall && pending.length) {
        setStatus("installing");
        let next = archive;
        for (const capsule of pending) next = await installVerifiedCapsule(next, capsule);
        persist(next);
        setNotice(`已自动安装 ${pending.length} 个真实变化。`);
      }
      setStatus("idle");
      try {
        setCoreVersion(await fetchCoreVersion());
      } catch {
        // The signed capsule ledger stays usable when the core version endpoint is unavailable.
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, persist]);

  useEffect(() => {
    void refresh();
    // Initial synchronization intentionally runs once; manual checks reuse refresh().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void listenForTrayCheckUpdate(() => void checkForCoreUpdate()).then((handler) => {
      unsubscribe = handler;
    });
    return () => unsubscribe?.();
  }, []);

  const installOne = useCallback(async (id: string) => {
    setStatus("installing");
    try {
      const entry = feed?.entries.find((candidate) => candidate.id === id);
      if (!entry) throw new Error("公开账本里找不到这个版本。");
      const capsule = capsules.get(id) ?? await fetchCapsule(entry.path);
      persist(await installVerifiedCapsule(archive, capsule));
      setCapsules((current) => new Map(current).set(id, capsule));
      setNotice(`安装完成：${capsule.reason.headline}`);
      setStatus("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, capsules, feed, persist]);

  const installAll = useCallback(async () => {
    if (!feed) return void refresh();
    setStatus("installing");
    setNotice("正在验签、安装并保存回滚快照……");
    try {
      const pending = await findPendingCapsules(feed, archive);
      let next = archive;
      for (const capsule of pending) next = await installVerifiedCapsule(next, capsule);
      persist(next);
      setNotice(pending.length ? `已安装 ${pending.length} 个变化。` : "检查完成，没有新更新。");
      setStatus("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, feed, persist, refresh]);

  const rollback = useCallback(() => {
    persist(rollbackLatest(archive));
    setNotice("已回滚最后一个本地变化。公共历史不受影响。");
  }, [archive, persist]);

  const setAutoInstall = useCallback((enabled: boolean) => {
    persist({ ...archive, autoInstall: enabled });
  }, [archive, persist]);

  const requestNotifications = useCallback(async () => {
    const enabled = await enableNotifications();
    setNotice(enabled ? "更新通知已开启。" : "没有获得通知权限。打开应用时仍会检查。");
  }, []);

  return {
    archive,
    coreVersion,
    feed,
    installedIds,
    isBusy,
    latestCapsule,
    latestEntry,
    notice,
    pendingCount,
    status,
    installAll,
    installOne,
    refresh,
    requestNotifications,
    rollback,
    setAutoInstall,
    checkForCoreUpdate,
  };
}

export type UpdateStation = ReturnType<typeof useUpdateStation>;
