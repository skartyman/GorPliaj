import { getLayoutModeLabel, getLocalizedObjectName, t } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

function TabButton({ id, active, onClick, children }) {
  return (
    <button type="button" className={`fp-tab ${active ? 'active' : ''}`} onClick={() => onClick(id)}>
      {children}
    </button>
  );
}

export default function LeftSidebar({
  activeTab,
  onTabChange,
  objects,
  zones,
  layoutModes,
  selectedId,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onReorder,
  previewLayoutCode,
  onPreviewLayoutChange
}) {
  const { language } = useAdminI18n();

  return (
    <aside className="fp-left-sidebar">
      <div className="fp-tabs">
        <TabButton id="objects" active={activeTab === 'objects'} onClick={onTabChange}>{t('tabs.objects', language)}</TabButton>
        <TabButton id="zones" active={activeTab === 'zones'} onClick={onTabChange}>{t('tabs.zones', language)}</TabButton>
        <TabButton id="layouts" active={activeTab === 'layouts'} onClick={onTabChange}>{t('tabs.layoutModes', language)}</TabButton>
        <TabButton id="presets" active={activeTab === 'presets'} onClick={onTabChange}>{t('tabs.presets', language)}</TabButton>
      </div>

      {activeTab === 'objects' ? (
        <div className="fp-list">
          {objects.map((item, index) => (
            <div key={item.id} className={`fp-list-item ${selectedId === item.id ? 'selected' : ''}`}>
              <button type="button" onClick={() => onSelect(item.id)}>{getLocalizedObjectName(item, language)}</button>
              <div className="fp-row-actions">
                <button type="button" onClick={() => onToggleHidden(item.id)}>{item.hidden ? t('common.show', language) : t('common.hide', language)}</button>
                <button type="button" onClick={() => onToggleLocked(item.id)}>{item.locked ? t('common.unlock', language) : t('common.lock', language)}</button>
                <button type="button" disabled={index === 0} onClick={() => onReorder(item.id, -1)}>↑</button>
                <button type="button" disabled={index === objects.length - 1} onClick={() => onReorder(item.id, 1)}>↓</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'zones' ? (
        <div className="fp-list">
          {zones.map((zone) => (
            <div key={zone.id} className="fp-list-item">
              <span>{zone.name}</span>
              <small>{zone.zoneType || '—'}</small>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'layouts' ? (
        <div className="fp-list">
          <label>
            {t('sidebar.previewLayout', language)}
            <select value={previewLayoutCode} onChange={(e) => onPreviewLayoutChange(e.target.value)}>
              {layoutModes.map((layout) => (
                <option key={layout.id} value={layout.code}>
                  {getLayoutModeLabel(layout, language)}
                </option>
              ))}
            </select>
          </label>
          {layoutModes.map((layout) => (
            <div key={layout.id} className="fp-list-item">
              <strong>{getLayoutModeLabel(layout, language)}</strong>
              <small>{layout.description}</small>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'presets' ? (
        <div className="fp-list">
          <div className="fp-list-item">
            <strong>{t('sidebar.territoryPresets', language)}</strong>
            <small>{t('category.territory', language)}: {t('tool.addSea', language)}, {t('tool.addSand', language)}, {t('tool.addDeck', language)}, {t('tool.addPathway', language)}</small>
            <small>{t('category.structures', language)}: {t('tool.addStairs', language)}, {t('tool.addPier', language)}, {t('tool.addBuilding', language)}, {t('tool.addWinterRestaurant', language)}, {t('tool.addBar', language)}</small>
            <small>{t('category.event', language)}: {t('tool.addStage', language)}</small>
          </div>
          <div className="fp-list-item">
            <strong>{t('sidebar.bookablePresets', language)}</strong>
            <small>{t('category.bookable', language)}: {t('tool.addRoundTable', language)}, {t('tool.addRectTable', language)}, {t('tool.addLoungerBed', language)}, {t('tool.addBungalow', language)}, {t('tool.addHookahTable', language)}, {t('tool.addVipZone', language)}, {t('tool.addPierSpot', language)}</small>
          </div>
          <p className="muted">{t('sidebar.presetsHint', language)}</p>
        </div>
      ) : null}
    </aside>
  );
}
