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
        <TabButton id="objects" active={activeTab === 'objects'} onClick={onTabChange}>Objects</TabButton>
        <TabButton id="zones" active={activeTab === 'zones'} onClick={onTabChange}>Zones</TabButton>
        <TabButton id="layouts" active={activeTab === 'layouts'} onClick={onTabChange}>Layout Modes</TabButton>
        <TabButton id="presets" active={activeTab === 'presets'} onClick={onTabChange}>Presets</TabButton>
      </div>

      {activeTab === 'objects' ? (
        <div className="fp-list">
          {objects.map((item, index) => (
            <div key={item.id} className={`fp-list-item ${selectedId === item.id ? 'selected' : ''}`}>
              <button type="button" onClick={() => onSelect(item.id)}>{item.name}</button>
              <div className="fp-row-actions">
                <button type="button" onClick={() => onToggleHidden(item.id)}>{item.hidden ? 'Show' : 'Hide'}</button>
                <button type="button" onClick={() => onToggleLocked(item.id)}>{item.locked ? 'Unlock' : 'Lock'}</button>
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
            Preview layout mode
            <select value={previewLayoutCode} onChange={(e) => onPreviewLayoutChange(e.target.value)}>
              {layoutModes.map((layout) => (
                <option key={layout.id} value={layout.code}>
                  {layout.code}
                </option>
              ))}
            </select>
          </label>
          {layoutModes.map((layout) => (
            <div key={layout.id} className="fp-list-item">
              <strong>{layout.name}</strong>
              <small>{layout.description}</small>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'presets' ? (
        <div className="fp-list">
          <div className="fp-list-item">
            <strong>Territory presets</strong>
            <small>sea, sand, deck, pathway, stairs, pier, building, winterRestaurant, bar, stage</small>
          </div>
          <div className="fp-list-item">
            <strong>Bookable presets</strong>
            <small>restaurant-table, terrace-table, lounger-bed, bungalow, hookah-table, vip-zone, pier-spot</small>
          </div>
          <p className="muted">All presets now resolve visual defaults from the centralized asset registry.</p>
        </div>
      ) : null}
    </aside>
  );
}
