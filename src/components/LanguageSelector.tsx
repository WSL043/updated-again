import { useState } from "react";
import { LANGUAGES, setLanguage, t, useLanguage } from "../i18n";
export function LanguageSelector() {
    const language = useLanguage();
    const [warning, setWarning] = useState(false);
    return <div className="language-control"><label><span className="language-label">{t("Language")}</span><select aria-label={t("Language")} value={language} onChange={(event) => {
            const next = LANGUAGES.find((item) => item.id === event.target.value);
            if (next)
                setWarning(!setLanguage(next.id));
        }}>{LANGUAGES.map((item) => <option key={item.id} value={item.id} lang={item.id}>{t(item.name)}</option>)}</select></label>{warning && <span role="status">{t("Language preference could not be saved.")}</span>}</div>;
}
