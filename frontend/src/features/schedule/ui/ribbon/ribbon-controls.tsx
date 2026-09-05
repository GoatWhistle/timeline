import { useTranslation } from 'react-i18next'
import { SEASON_KEY, SEASON_MARK, type SeasonBand } from '../../model/ribbon/ribbon-season'
import controls from './ribbon-controls.module.css'

export type RibbonControlsProps = {
  season: SeasonBand | undefined
}

export function RibbonControls({ season }: RibbonControlsProps) {
  const { t } = useTranslation()

  return (
    <div className={controls.controls}>
      {season && (
        <span
          className={controls.marker}
          data-ribbon-marker={season.season}
          data-season={season.season}
        >
          <span aria-hidden="true">{SEASON_MARK[season.season]}</span>
          {t(SEASON_KEY[season.season])} {season.year}
        </span>
      )}
    </div>
  )
}
