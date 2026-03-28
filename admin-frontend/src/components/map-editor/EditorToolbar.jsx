import { t, getLayoutModeLabel } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

const TOOL_GROUPS = [
  {
    id: 'core',
    titleKey: 'toolbar.group.core',
    tools: [
      ['select', 'tool.select'],
      ['hand', 'tool.hand']
    ]
  },
  {
    id: 'territory',
    titleKey: 'toolbar.group.territory',
    tools: [
      ['addSea', 'tool.addSea'],
      ['addSand', 'tool.addSand'],
      ['addDeck', 'tool.addDeck'],
      ['addPathway', 'tool.addPathway'],
      ['addStairs', 'tool.addStairs'],
      ['addPier', 'tool.addPier'],
      ['addBuilding', 'tool.addBuilding'],
      ['addWinterRestaurant', 'tool.addWinterRestaurant'],
      ['addBar', 'tool.addBar'],
      ['addStage', 'tool.addStage']
    ]
  },
  {
    id: 'bookable',
    titleKey: 'toolbar.group.bookable',
    tools: [
      ['addRoundTable', 'tool.addRoundTable'],
      ['addRectTable', 'tool.addRectTable'],
      ['addLoungerBed', 'tool.addLoungerBed'],
      ['addBungalow', 'tool.addBungalow'],
      ['addHookahTable', 'tool.addHookahTable'],
      ['addVipZone', 'tool.addVipZone'],
      ['addPierSpot', 'tool.addPierSpot']
    ]
  }
];

export default function EditorToolbar({
  activeTool,
  onToolSelect,
  editorMode,
  onModeChange,
  layoutCode,
  layoutModes,
  onLayoutChange,
  onSaveDraft,
  onPublish,
  onExport,
  onImport,
  onLoadDraft
}) {
  const { language } = useAdminI18n();

  return (
    <div className="fp-toolbar">
      <div className="fp-toolbar-section">
        {TOOL_GROUPS.map((group) => (
          <div key={group.id} className="fp-toolbar-group" title={t(group.titleKey, language)}>
            {group.tools.map(([tool, labelKey]) => (
              <button
                key={tool}
                type="button"
                className={`fp-chip ${activeTool === tool ? 'active' : ''}`}
                onClick={() => onToolSelect(tool)}
                title={t(labelKey, language)}
              >
                {t(labelKey, language)}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="fp-toolbar-section compact">
        <select value={editorMode} onChange={(e) => onModeChange(e.target.value)}>
          <option value="territory">{t('toolbar.mode.territory', language)}</option>
          <option value="bookable">{t('toolbar.mode.bookable', language)}</option>
          <option value="layout">{t('toolbar.mode.layout', language)}</option>
        </select>

        <select value={layoutCode} onChange={(e) => onLayoutChange(e.target.value)}>
          {layoutModes.map((layout) => (
            <option key={layout.id} value={layout.code}>
              {getLayoutModeLabel(layout, language)}
            </option>
          ))}
        </select>

        <button type="button" className="btn btn-secondary btn-small" onClick={onSaveDraft}>
          {t('toolbar.saveDraft', language)}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={onLoadDraft}>
          {t('toolbar.loadDraft', language)}
        </button>
        <button type="button" className="btn btn-small" onClick={onPublish}>
          {t('toolbar.publish', language)}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={onExport}>
          {t('toolbar.exportJson', language)}
        </button>
        <label className="btn btn-secondary btn-small fp-import-btn">
          {t('toolbar.importJson', language)}
          <input type="file" accept="application/json" onChange={onImport} />
        </label>
      </div>
    </div>
  );
}
