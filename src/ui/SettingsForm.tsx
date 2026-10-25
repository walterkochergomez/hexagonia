import { useT } from '../app/i18n';
import { defaultVp } from '../engine/game';
import { SEA_SCENARIOS, SEA_SPECIAL, SHIRES, type SeaScenario, type Shire } from '../engine/types';
import type { LobbySettings } from '../net/protocol';
import { Toggle } from './common';

export function SettingsForm({ value, onChange, readOnly, seats }: { value: LobbySettings; onChange: (p: Partial<LobbySettings>) => void; readOnly?: boolean; seats: number }) {
  const t = useT();
  const auto = defaultVp(value);
  const special = value.openSea && SEA_SPECIAL.includes(value.scenario);
  const xp = !!value.expedition;
  const scenario = (sc: SeaScenario) => (
    <label key={sc} className={`scenario${value.scenario === sc ? ' on' : ''}`}>
      <input type="radio" name="scenario" checked={value.scenario === sc} onChange={() => onChange(SEA_SPECIAL.includes(sc) ? { scenario: sc, guilds: false } : { scenario: sc })} />
      <span className="scenario-name">{t(`scenario.${sc}`)}</span>
      <span className="hint">{t(`scenario.${sc}Hint`)}</span>
    </label>
  );
  return (
    <div className="settings">
      <fieldset disabled={readOnly}>
        <legend>{t('set.modules')}</legend>
        <Toggle checked={value.openSea} onChange={(v) => onChange(v ? { openSea: v, duel: false, shire: null, expedition: null } : { openSea: v })} label={t('set.openSea')} hint={xp ? t('set.notWithExpedition') : t('set.openSeaHint')} disabled={readOnly || xp} />
        {value.openSea && (
          <div className="scenarios" role="radiogroup" aria-label={t('set.scenario')}>
            {SEA_SCENARIOS.filter((sc) => !SEA_SPECIAL.includes(sc)).map(scenario)}
            <p className="scenarios-sub">{t('set.special')}</p>
            {SEA_SPECIAL.map(scenario)}
          </div>
        )}
        <Toggle checked={value.guilds && !special && !xp} onChange={(v) => onChange(v ? { guilds: v, chronicle: false, duel: false, shire: null, expedition: null } : { guilds: v })} label={t('set.guilds')} hint={xp ? t('set.notWithExpedition') : special ? t('set.notWithScenario') : t('set.guildsHint')} disabled={readOnly || special || xp} />
      </fieldset>
      <fieldset disabled={readOnly}>
        <legend>{t('set.expedition')}</legend>
        <Toggle checked={xp} onChange={(v) => onChange(v ? { expedition: { fish: true, spice: true, lairs: true }, openSea: false, guilds: false, shire: null, duel: false } : { expedition: null })} label={t('set.expedition')} hint={t('set.expeditionHint')} disabled={readOnly} />
        {xp && (
          <div className="missions" role="group" aria-label={t('set.missions')}>
            {(['fish', 'spice', 'lairs'] as const).map((m) => (
              <Toggle key={m} checked={!!value.expedition?.[m]} onChange={(v) => onChange({ expedition: { ...value.expedition!, [m]: v } })} label={t(`set.mission.${m}`)} hint={t(`set.mission.${m}Hint`)} disabled={readOnly} />
            ))}
          </div>
        )}
      </fieldset>
      <fieldset disabled={readOnly}>
        <legend>{t('set.shires')}</legend>
        <div className="scenarios flat" role="radiogroup" aria-label={t('set.shires')}>
          {([null, ...SHIRES] as (Shire | null)[]).map((sh) => (
            <label key={sh ?? 'none'} className={`scenario${(value.shire ?? null) === sh ? ' on' : ''}`}>
              <input type="radio" name="shire" checked={(value.shire ?? null) === sh} onChange={() => onChange(sh ? { shire: sh, openSea: false, guilds: false, duel: false, expedition: null } : { shire: null })} />
              <span className="scenario-name">{t(sh ? `shire.${sh}` : 'shire.none')}</span>
              <span className="hint">{t(sh ? `shire.${sh}Hint` : 'shire.noneHint')}</span>
            </label>
          ))}
        </div>
        <Toggle checked={!!value.harbormaster} onChange={(v) => onChange({ harbormaster: v })} label={t('set.harbormaster')} hint={t('set.harbormasterHint')} disabled={readOnly} />
        <Toggle checked={!!value.chronicle && !value.guilds} onChange={(v) => onChange({ chronicle: v })} label={t('set.chronicle')} hint={value.guilds ? t('set.notWithGuilds') : t('set.chronicleHint')} disabled={readOnly || value.guilds} />
        {seats === 2 && (
          <Toggle checked={!!value.duel && !value.openSea && !value.guilds && !value.shire} onChange={(v) => onChange({ duel: v })} label={t('set.duel')} hint={value.openSea || value.guilds || value.shire ? t('set.duelBaseOnly') : t('set.duelHint')} disabled={readOnly || value.openSea || value.guilds || !!value.shire} />
        )}
      </fieldset>
      <fieldset disabled={readOnly}>
        <legend>{t('set.options')}</legend>
        <label className="field">
          <span>{t('set.vpTarget')}</span>
          <select value={value.vpTarget} onChange={(e) => onChange({ vpTarget: Number(e.target.value) })}>
            <option value={0}>{t('set.auto', { n: auto })}</option>
            {Array.from({ length: 13 }, (_, i) => i + 6).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {seats >= 5 && (
          <div className="field">
            <span>{t('set.turnMode')}</span>
            {(['specialBuild', 'paired'] as const).map((m) => (
              <label key={m} className={`radio-card${value.turnMode === m ? ' on' : ''}`}>
                <input type="radio" name="turnMode" checked={value.turnMode === m} onChange={() => onChange({ turnMode: m })} />
                <span className="scenario-name">{t(`set.turnMode.${m}`)}</span>
                <span className="hint">{t(`set.turnMode.${m}Hint`)}</span>
              </label>
            ))}
          </div>
        )}
        <Toggle checked={value.friendlyRobber} onChange={(v) => onChange({ friendlyRobber: v })} label={t('set.friendlyRobber')} hint={t('set.friendlyRobberHint')} disabled={readOnly} />
        {seats >= 5 && <p className="muted small">{t('lobby.bigBoard')}</p>}
      </fieldset>
    </div>
  );
}
