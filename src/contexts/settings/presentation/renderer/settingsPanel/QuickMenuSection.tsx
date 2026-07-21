import React from 'react'
import { useTranslation } from '@app/renderer/i18n'
import type { QuickPhrase } from '@contexts/settings/domain/agentSettings'
import { QuickPhrasesSubsection } from './quickMenu/QuickPhrasesSubsection'
import { SettingsGroup } from './SettingsGroup'

export function QuickMenuSection({
  quickPhrases,
  onChangeQuickPhrases,
}: {
  quickPhrases: QuickPhrase[]
  onChangeQuickPhrases: (phrases: QuickPhrase[]) => void
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <SettingsGroup
      id="settings-section-quick-menu"
      title={t('settingsPanel.groups.tasksShortcuts.quickActions')}
    >
      <QuickPhrasesSubsection
        quickPhrases={quickPhrases}
        onChangeQuickPhrases={onChangeQuickPhrases}
      />
    </SettingsGroup>
  )
}
