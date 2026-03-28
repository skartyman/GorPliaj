const TOOL_GROUPS = [
  {
    id: 'core',
    tools: [
      ['select', 'Select'],
      ['hand', 'Pan']
    ]
  },
  {
    id: 'territory',
    tools: [
      ['addSea', 'Sea'],
      ['addSand', 'Sand'],
      ['addDeck', 'Deck'],
      ['addPathway', 'Pathway'],
      ['addStairs', 'Stairs'],
      ['addPier', 'Pier'],
      ['addBuilding', 'Building'],
      ['addWinterRestaurant', 'Winter Rest.'],
      ['addBar', 'Bar'],
      ['addStage', 'Stage']
    ]
  },
  {
    id: 'bookable',
    tools: [
      ['addRoundTable', 'Round Table'],
      ['addRectTable', 'Rect Table'],
      ['addLoungerBed', 'Lounger'],
      ['addBungalow', 'Bungalow'],
      ['addHookahTable', 'Hookah'],
      ['addVipZone', 'VIP Zone'],
      ['addPierSpot', 'Pier Spot']
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
  onImport
}) {
  return (
    <div className="fp-toolbar">
      <div className="fp-toolbar-section">
        {TOOL_GROUPS.map((group) => (
          <div key={group.id} className="fp-toolbar-group">
            {group.tools.map(([tool, label]) => (
              <button
                key={tool}
                type="button"
                className={`fp-chip ${activeTool === tool ? 'active' : ''}`}
                onClick={() => onToolSelect(tool)}
              >
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="fp-toolbar-section compact">
        <select value={editorMode} onChange={(e) => onModeChange(e.target.value)}>
          <option value="territory">Territory mode</option>
          <option value="bookable">Bookable mode</option>
          <option value="layout">Layout config mode</option>
        </select>

        <select value={layoutCode} onChange={(e) => onLayoutChange(e.target.value)}>
          {layoutModes.map((layout) => (
            <option key={layout.id} value={layout.code}>
              {layout.name}
            </option>
          ))}
        </select>

        <button type="button" className="btn btn-secondary btn-small" onClick={onSaveDraft}>
          Save draft
        </button>
        <button type="button" className="btn btn-small" onClick={onPublish}>
          Publish
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={onExport}>
          Export JSON
        </button>
        <label className="btn btn-secondary btn-small fp-import-btn">
          Import JSON
          <input type="file" accept="application/json" onChange={onImport} />
        </label>
      </div>
    </div>
  );
}
