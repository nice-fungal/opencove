import React, { useMemo, useState } from 'react'
import { useTranslation } from '@app/renderer/i18n'
import { SettingsGroup, SettingsGroupBody } from './SettingsGroup'

function getFolderName(path: string): string {
  const parts = path.split(/[/]/).filter(Boolean)
  return parts[parts.length - 1] || path
}

export function WorkspaceSection({
  workspaceName,
  workspacePath,
  environmentVariables,
  onChangeEnvironmentVariables,
  sectionId = 'settings-section-workspace',
}: {
  workspaceName?: string | null
  workspacePath: string | null
  environmentVariables: Record<string, string>
  onChangeEnvironmentVariables: (envVars: Record<string, string>) => void
  sectionId?: string
}): React.JSX.Element {
  const { t } = useTranslation()
  const hasWorkspace = typeof workspacePath === 'string' && workspacePath.trim().length > 0
  const [envKeyInput, setEnvKeyInput] = useState('')
  const [envValueInput, setEnvValueInput] = useState('')
  const resolvedWorkspaceName = useMemo(() => {
    if (typeof workspaceName === 'string' && workspaceName.trim().length > 0) {
      return workspaceName
    }

    if (!hasWorkspace) {
      return ''
    }

    return getFolderName(workspacePath)
  }, [hasWorkspace, workspaceName, workspacePath])

  const envEntries = useMemo(() => Object.entries(environmentVariables), [environmentVariables])

  const addEnvVar = (): void => {
    const key = envKeyInput.trim()
    if (key.length === 0) {
      return
    }
    onChangeEnvironmentVariables({ ...environmentVariables, [key]: envValueInput })
    setEnvKeyInput('')
    setEnvValueInput('')
  }

  const removeEnvVar = (key: string): void => {
    const next = { ...environmentVariables }
    delete next[key]
    onChangeEnvironmentVariables(next)
  }

  return (
    <>
      <SettingsGroup id={sectionId} title={t('settingsPanel.groups.workspace.worktrees')}>
        <SettingsGroupBody>
          {!hasWorkspace ? (
            <div className="settings-panel__row">
              <div className="settings-panel__row-label">
                <strong>{t('settingsPanel.workspace.selectProjectFirst')}</strong>
                <span>{t('settingsPanel.workspace.selectProjectFirstHelp')}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="settings-panel__row">
                <div className="settings-panel__row-label">
                  <strong>{t('settingsPanel.workspace.workspacePathLabel')}</strong>
                  <span>
                    {t('settingsPanel.workspace.workspacePathHelp', {
                      name: resolvedWorkspaceName,
                    })}
                  </span>
                </div>
                <div className="settings-panel__control">
                  <span
                    className="settings-panel__path-chip"
                    data-testid="settings-workspace-path-display"
                    title={workspacePath}
                  >
                    {getFolderName(workspacePath)}
                  </span>
                </div>
              </div>
            </>
          )}
        </SettingsGroupBody>
      </SettingsGroup>

      {hasWorkspace ? (
        <SettingsGroup
          id="settings-section-env-vars"
          title={t('settingsPanel.groups.workspace.environment')}
          description={t('settingsPanel.workspace.environmentVariablesHelp')}
        >
          <div className="settings-list-container" data-testid="settings-env-var-list">
            {envEntries.map(([key, value]) => (
              <div className="settings-list-item" key={key}>
                <span className="settings-panel__value">
                  <strong>{key}</strong> = {value}
                </span>
                <button
                  type="button"
                  className="secondary"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  data-testid={`settings-env-var-remove-${key}`}
                  onClick={() => removeEnvVar(key)}
                >
                  {t('common.remove')}
                </button>
              </div>
            ))}
            {envEntries.length === 0 ? (
              <span className="settings-panel__value">
                {t('settingsPanel.workspace.environmentVariablesEmpty')}
              </span>
            ) : null}
            <div className="settings-panel__input-row">
              <input
                type="text"
                data-testid="settings-env-var-key-input"
                className="cove-field"
                aria-label={t('settingsPanel.workspace.environmentVariablesKeyLabel')}
                value={envKeyInput}
                placeholder={t('settingsPanel.workspace.environmentVariablesKeyPlaceholder')}
                onChange={event => setEnvKeyInput(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && addEnvVar()}
              />
              <input
                type="text"
                data-testid="settings-env-var-value-input"
                className="cove-field"
                aria-label={t('settingsPanel.workspace.environmentVariablesValueLabel')}
                value={envValueInput}
                placeholder={t('settingsPanel.workspace.environmentVariablesValuePlaceholder')}
                onChange={event => setEnvValueInput(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && addEnvVar()}
              />
              <button
                type="button"
                className="primary"
                data-testid="settings-env-var-add-button"
                disabled={envKeyInput.trim().length === 0}
                onClick={() => addEnvVar()}
              >
                {t('common.add')}
              </button>
            </div>
          </div>
        </SettingsGroup>
      ) : null}
    </>
  )
}
