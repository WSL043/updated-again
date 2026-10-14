import { t, useLanguage } from "../i18n";
import { CAPABILITY_LIST } from "../capabilities";
import { isDesktopApp } from "../core/native";
import type { UpdateStation } from "../hooks/useUpdateStation";
export function LabPage({ station }: {
    station: UpdateStation;
}) {
    useLanguage();
    return (<section className="lab-page">
      <header className="page-heading">
        <div><p>{t("它怎么活着")}</p><h1>{t("项目内部")}</h1><span>{t("自动更新、签名、本地数据、聊天和版本短片分开运行。坏掉一块，不耽误其他部分。")}</span></div>
        <span className="workshop-number">{String(CAPABILITY_LIST.length).padStart(2, "0")}</span>
      </header>

      <div className="foundation-map">
        <article><span>01</span><div><small>{t("账本")}</small><h2>{t("签名账本")}</h2><p>{t("公开版本都带哈希和签名，安装时会重新验证。")}</p></div></article>
        <article><span>02</span><div><small>{t("本机")}</small><h2>{t("安装与回滚")}</h2><p>{t("安装前保存本地快照。自动安装可以关闭，最后一次安装可以回滚。")}</p></div></article>
        <article><span>03</span><div><small>{t("聊天")}</small><h2>{t("本地规则优先")}</h2><p>{t("规则和社区语料留在本机；匿名云端失败会自己退回来。")}</p></div></article>
        <article><span>04</span><div><small>{t("短片")}</small><h2>{t("版本短片")}</h2><p>{t("Remotion 按版本数据生成短片，并在点击播放后才加载。")}</p></div></article>
      </div>

      <div className="lab-controls">
        <label><input type="checkbox" checked={station.archive.autoInstall} onChange={(event) => station.setAutoInstall(event.target.checked)}/><span><strong>{t("自动安装通过验签的更新")}</strong>{t("启动时检查账本，并为每次安装保存回滚快照。")}</span></label>
        <button type="button" onClick={() => void station.requestNotifications()}>{t("开启更新通知")}</button>
        {isDesktopApp() && <button type="button" onClick={() => void station.checkForCoreUpdate()}>{t("检查核心版本")}</button>}
      </div>

      <section className="capability-section">
        <header><p>{t("可更新项目")}</p><h2>{t("更新目前能改什么")}</h2></header>
        <div className="capability-list">
          {CAPABILITY_LIST.map((capability, index) => (<article key={capability.kind}><span>{String(index + 1).padStart(2, "0")}</span><div><code>{capability.kind}</code><h3>{t(capability.label)}</h3><p>{t(capability.description)}</p></div></article>))}
        </div>
      </section>
    </section>);
}
