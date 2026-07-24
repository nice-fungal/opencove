import React from 'react'
import { useTranslation } from '@app/renderer/i18n'
import { EndpointsSection } from './EndpointsSection'
import { ExperimentalWorkerWebUiSection } from './ExperimentalWorkerWebUiSection'
import { WorkerSection } from './WorkerSection'
import { SettingsGroup, SettingsGroupBody } from './SettingsGroup'

export function WorkerConnectionsSection({
  remoteWorkersEnabled,
}: {
  remoteWorkersEnabled: boolean
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <WorkerSection remoteWorkersEnabled={remoteWorkersEnabled} />

      {remoteWorkersEnabled ? (
        <EndpointsSection />
      ) : (
        <SettingsGroup id="settings-section-endpoints" title={t('settingsPanel.endpoints.title')}>
          <SettingsGroupBody>
            <div className="settings-panel__row">
              <div className="settings-panel__row-label">
                <strong>{t('settingsPanel.endpoints.list.title')}</strong>
                <span>{t('settingsPanel.workerConnections.endpointsDisabledHelp')}</span>
              </div>
              <div className="settings-panel__control">
                <span className="settings-panel__value">
                  {t('settingsPanel.workerConnections.endpointsDisabledValue')}
                </span>
              </div>
            </div>
          </SettingsGroupBody>
        </SettingsGroup>
      )}

      <ExperimentalWorkerWebUiSection />
    </>
  )
}
