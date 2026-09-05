import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/styling/class-names/class-names'
import { TOUCH_REACH } from '@/shared/styling/touch/touch-reach'
import { SEASON_KEY, SEASON_MARK, type SeasonBand } from '../../model/ribbon/ribbon-season'
import controls from './ribbon-controls.module.css'

export type RibbonControlsProps = {
  paneId: string
  season: SeasonBand | undefined
  onNudge: (direction: 1 | -1) => void
  onPresent: () => void
}

export function RibbonControls({ paneId, season, onNudge, onPresent }: RibbonControlsProps) {
  const { t } = useTranslation()

  return (
    <div className={controls.controls}>
      <button
        type="button"
        className={cn(controls.control, TOUCH_REACH)}
        data-ribbon-earlier
        aria-label={t('schedule.earlier')}
        aria-controls={paneId}
        onClick={() => onNudge(-1)}
      >
        <ChevronLeft className={controls.controlIcon} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={cn(controls.control, TOUCH_REACH)}
        data-ribbon-later
        aria-label={t('schedule.later')}
        aria-controls={paneId}
        onClick={() => onNudge(1)}
      >
        <ChevronRight className={controls.controlIcon} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={cn(controls.control, TOUCH_REACH)}
        data-ribbon-today
        aria-label={t('schedule.backToPresent')}
        aria-controls={paneId}
        onClick={onPresent}
      >
        <LocateFixed className={controls.controlIcon} aria-hidden="true" />
      </button>

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

      <span className={controls.spacer} />

      <span className={controls.reading} data-ribbon-hint>
        {t('schedule.ribbonHint')}
      </span>
    </div>
  )
}
