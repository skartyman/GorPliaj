const BASE_FIELDS = ['name', 'label', 'x', 'y', 'width', 'height', 'rotation', 'zIndex', 'zoneId'];

export default function InspectorPanel({ selectedObject, zones, layoutModes, onFieldChange, onDelete, onDuplicate }) {
  if (!selectedObject) {
    return (
      <aside className="fp-inspector">
        <h3>Inspector</h3>
        <p className="muted">Select an object to edit.</p>
      </aside>
    );
  }

  const isBookable = selectedObject.kind === 'bookable';

  return (
    <aside className="fp-inspector">
      <h3>Inspector</h3>
      <div className="actions compact">
        <button type="button" className="btn btn-secondary btn-small" onClick={onDuplicate}>Duplicate</button>
        <button type="button" className="btn btn-danger btn-small" onClick={onDelete}>Delete</button>
      </div>
      <div className="fp-inspector-fields">
        {BASE_FIELDS.map((field) => (
          <label key={field}>
            {field}
            {field === 'zoneId' ? (
              <select value={selectedObject[field] || ''} onChange={(e) => onFieldChange(field, e.target.value || null)}>
                <option value="">No zone</option>
                {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
              </select>
            ) : (
              <input
                value={selectedObject[field] ?? ''}
                onChange={(e) => onFieldChange(field, ['x','y','width','height','rotation','zIndex'].includes(field) ? Number(e.target.value) : e.target.value)}
              />
            )}
          </label>
        ))}

        <label className="editor-toggle-field">
          <span>locked</span>
          <input type="checkbox" checked={selectedObject.locked} onChange={(e) => onFieldChange('locked', e.target.checked)} />
        </label>

        <label className="editor-toggle-field">
          <span>hidden</span>
          <input type="checkbox" checked={selectedObject.hidden} onChange={(e) => onFieldChange('hidden', e.target.checked)} />
        </label>

        <label>
          visibleInLayoutModes
          <select
            value={selectedObject.visibleInLayoutModes === 'all' ? 'all' : 'custom'}
            onChange={(e) => onFieldChange('visibleInLayoutModes', e.target.value === 'all' ? 'all' : [layoutModes[0]?.code].filter(Boolean))}
          >
            <option value="all">all</option>
            <option value="custom">custom</option>
          </select>
        </label>

        {selectedObject.visibleInLayoutModes !== 'all' ? (
          <label>
            Layout list
            <select
              multiple
              value={selectedObject.visibleInLayoutModes || []}
              onChange={(e) => onFieldChange('visibleInLayoutModes', Array.from(e.target.selectedOptions).map((it) => it.value))}
            >
              {layoutModes.map((layout) => <option key={layout.id} value={layout.code}>{layout.code}</option>)}
            </select>
          </label>
        ) : null}

        {isBookable ? (
          <>
            <label>bookingKind<input value={selectedObject.bookingKind || ''} onChange={(e) => onFieldChange('bookingKind', e.target.value)} /></label>
            <label>capacityMin<input type="number" value={selectedObject.capacityMin || 0} onChange={(e) => onFieldChange('capacityMin', Number(e.target.value))} /></label>
            <label>capacityMax<input type="number" value={selectedObject.capacityMax || 0} onChange={(e) => onFieldChange('capacityMax', Number(e.target.value))} /></label>
            <label>depositType<input value={selectedObject.depositType || ''} onChange={(e) => onFieldChange('depositType', e.target.value || undefined)} /></label>
            <label>depositValue<input type="number" value={selectedObject.depositValue || 0} onChange={(e) => onFieldChange('depositValue', Number(e.target.value) || undefined)} /></label>
            <label>minSpend<input type="number" value={selectedObject.minSpend || 0} onChange={(e) => onFieldChange('minSpend', Number(e.target.value) || undefined)} /></label>
            <label className="editor-toggle-field"><span>combinable</span><input type="checkbox" checked={selectedObject.combinable} onChange={(e) => onFieldChange('combinable', e.target.checked)} /></label>
            <label>combineGroup<input value={selectedObject.combineGroup || ''} onChange={(e) => onFieldChange('combineGroup', e.target.value || undefined)} /></label>
            <label>tableCode<input value={selectedObject.tableCode || ''} onChange={(e) => onFieldChange('tableCode', e.target.value || undefined)} /></label>
          </>
        ) : null}
      </div>
    </aside>
  );
}
