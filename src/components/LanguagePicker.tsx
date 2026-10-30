import { LANGS, t } from "@/lib/i18n";
import { setLanguage } from "@/app/(customer)/account/actions";

export function LanguagePicker({ lang, next = "/account" }: { lang: string; next?: string }) {
  return (
    <form action={setLanguage} className="stack">
      <div className="lbl">{t(lang, "account.language")}</div>
      <input type="hidden" name="next" value={next} />
      <div className="row">
        <select className="i grow" name="lang" defaultValue={lang} aria-label="Language">
          {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn sm">OK</button>
      </div>
      {lang !== "en" && <span className="small muted">Some screens are still in English while we finish the translations.</span>}
    </form>
  );
}
