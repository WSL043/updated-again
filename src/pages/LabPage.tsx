import { CAPABILITY_LIST } from "../capabilities";
import { isDesktopApp } from "../core/native";
import type { UpdateStation } from "../hooks/useUpdateStation";

export function LabPage({ station }: { station: UpdateStation }) {
  return (
    <section className="lab-page">
      <header className="page-heading">
        <div><p>HOW IT WORKS</p><h1>项目内部</h1><span>自动更新、签名、本地数据、聊天和版本短片分别运行。一项出错时，其余功能仍然可用。</span></div>
        <span className="workshop-number">{String(CAPABILITY_LIST.length).padStart(2, "0")}</span>
      </header>

      <div className="foundation-map">
        <article><span>01</span><div><small>LEDGER</small><h2>签名账本</h2><p>公开版本都带哈希和签名，安装时会重新验证。</p></div></article>
        <article><span>02</span><div><small>LOCAL DATA</small><h2>安装与回滚</h2><p>安装前保存本地快照。自动安装可以关闭，最后一次安装可以回滚。</p></div></article>
        <article><span>03</span><div><small>CHAT</small><h2>本地规则优先</h2><p>RiveScript 默认离线运行。只有点击连接后才会加载 Puter。</p></div></article>
        <article><span>04</span><div><small>VIDEO</small><h2>版本短片</h2><p>Remotion 按版本数据生成短片，并在点击播放后才加载。</p></div></article>
      </div>

      <div className="lab-controls">
        <label><input type="checkbox" checked={station.archive.autoInstall} onChange={(event) => station.setAutoInstall(event.target.checked)} /><span><strong>自动安装通过验签的更新</strong>启动时检查账本，并为每次安装保存回滚快照。</span></label>
        <button type="button" onClick={() => void station.requestNotifications()}>开启更新通知</button>
        {isDesktopApp() && <button type="button" onClick={() => void station.checkForCoreUpdate()}>检查核心版本</button>}
      </div>

      <section className="capability-section">
        <header><p>CAPABILITY REGISTRY</p><h2>更新目前能改什么</h2></header>
        <div className="capability-list">
          {CAPABILITY_LIST.map((capability, index) => (
            <article key={capability.kind}><span>{String(index + 1).padStart(2, "0")}</span><div><code>{capability.kind}</code><h3>{capability.label}</h3><p>{capability.description}</p></div></article>
          ))}
        </div>
      </section>
    </section>
  );
}
