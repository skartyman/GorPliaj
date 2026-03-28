import { getLayoutModeLabel, t } from '../../lib/editor-locale';

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
  return (
    <aside className="fp-left-sidebar">
      <div className="fp-tabs">
        <TabButton id="objects" active={activeTab === 'objects'} onClick={onTabChange}>{t('tabs.objects')}</TabButton>
        <TabButton id="zones" active={activeTab === 'zones'} onClick={onTabChange}>{t('tabs.zones')}</TabButton>
        <TabButton id="layouts" active={activeTab === 'layouts'} onClick={onTabChange}>{t('tabs.layoutModes')}</TabButton>
        <TabButton id="presets" active={activeTab === 'presets'} onClick={onTabChange}>{t('tabs.presets')}</TabButton>
      </div>

      {activeTab === 'objects' ? (
        <div className="fp-list">
          {objects.map((item, index) => (
            <div key={item.id} className={`fp-list-item ${selectedId === item.id ? 'selected' : ''}`}>
              <button type="button" onClick={() => onSelect(item.id)}>{item.name}</button>
              <div className="fp-row-actions">
                <button type="button" onClick={() => onToggleHidden(item.id)}>{item.hidden ? t('common.show') : t('common.hide')}</button>
                <button type="button" onClick={() => onToggleLocked(item.id)}>{item.locked ? t('common.unlock') : t('common.lock')}</button>
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
            {t('sidebar.previewLayout')}
            <select value={previewLayoutCode} onChange={(e) => onPreviewLayoutChange(e.target.value)}>
              {layoutModes.map((layout) => (
                <option key={layout.id} value={layout.code}>
                  {getLayoutModeLabel(layout)}
                </option>
              ))}
            </select>
          </label>
          {layoutModes.map((layout) => (
            <div key={layout.id} className="fp-list-item">
              <strong>{getLayoutModeLabel(layout)}</strong>
              <small>{layout.description}</small>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'presets' ? (
        <div className="fp-list">
          <div className="fp-list-item">
            <strong>{t('sidebar.territoryPresets')}</strong>
            <small>{t('category.territory')}: {t('tool.addSea')}, {t('tool.addSand')}, {t('tool.addDeck')}, {t('tool.addPathway')}</small>
            <small>{t('category.structures')}: {t('tool.addStairs')}, {t('tool.addPier')}, {t('tool.addBuilding')}, {t('tool.addWinterRestaurant')}, {t('tool.addBar')}</small>
            <small>{t('category.event')}: {t('tool.addStage')}</small>
          </div>
          <div className="fp-list-item">
            <strong>{t('sidebar.bookablePresets')}</strong>
            <small>{t('category.bookable')}: {t('tool.addRoundTable')}, {t('tool.addRectTable')}, {t('tool.addLoungerBed')}, {t('tool.addBungalow')}, {t('tool.addHookahTable')}, {t('tool.addVipZone')}, {t('tool.addPierSpot')}</small>
          </div>
          <p className="muted">{t('sidebar.presetsHint')}</p>
        </div>
      ) : null}
    </aside>
  );
}
