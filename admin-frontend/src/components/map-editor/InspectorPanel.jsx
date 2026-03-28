import { getAssetDefinitionForObject } from '../../lib/editor-assets';
import { EDITOR_TEXTURE_REGISTRY } from '../../lib/editor-textures';
import { getLayoutModeLabel, t } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

const BASE_FIELDS = ['name', 'label', 'x', 'y', 'width', 'height', 'rotation', 'zIndex', 'zoneId'];


export default function InspectorPanel({ selectedObject, zones, layoutModes, onFieldChange, onDelete, onDuplicate }) {
  const { language } = useAdminI18n();
  const baseFieldLabels = {
    name: t('inspector.field.name', language),
    label: t('inspector.field.label', language),
    x: 'X',
    y: 'Y',
    width: t('inspector.field.width', language),
    height: t('inspector.field.height', language),
    rotation: t('inspector.field.rotation', language),
    zIndex: 'Z-index',
    zoneId: t('inspector.field.zone', language)
  };

  if (!selectedObject) {
    return (
      <aside className="fp-inspector">
        <h3>{t('inspector.title', language)}</h3>
        <p className="muted">{t('inspector.empty', language)}</p>
      </aside>
    );
  }

  const isBookable = selectedObject.kind === 'bookable';
  const assetDefinition = getAssetDefinitionForObject(selectedObject);
  const visual = selectedObject.visual || {};

  function updateVisualField(field, value) {
    onFieldChange('visual', {
      ...visual,
      [field]: value
    });
  }

  return (
    <aside className="fp-inspector">
      <h3>{t('inspector.title', language)}</h3>
      <div className="actions compact">
        <button type="button" className="btn btn-secondary btn-small" onClick={onDuplicate}>{t('inspector.duplicate', language)}</button>
        <button type="button" className="btn btn-danger btn-small" onClick={onDelete}>{t('inspector.delete', language)}</button>
      </div>
      <div className="fp-inspector-fields">
        {BASE_FIELDS.map((field) => (
          <label key={field}>
            {baseFieldLabels[field] || field}
            {field === 'zoneId' ? (
              <select value={selectedObject[field] || ''} onChange={(e) => onFieldChange(field, e.target.value || null)}>
                <option value="">{t('inspector.noZone', language)}</option>
                {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
              </select>
            ) : (
              <input
                value={selectedObject[field] ?? ''}
                onChange={(e) => onFieldChange(field, ['x', 'y', 'width', 'height', 'rotation', 'zIndex'].includes(field) ? Number(e.target.value) : e.target.value)}
              />
            )}
          </label>
        ))}

        <label className="editor-toggle-field">
          <span>{t('inspector.locked', language)}</span>
          <input type="checkbox" checked={selectedObject.locked} onChange={(e) => onFieldChange('locked', e.target.checked)} />
        </label>

        <label className="editor-toggle-field">
          <span>{t('inspector.hidden', language)}</span>
          <input type="checkbox" checked={selectedObject.hidden} onChange={(e) => onFieldChange('hidden', e.target.checked)} />
        </label>

        <label>
          {t('inspector.visibleInLayouts', language)}
          <select
            value={selectedObject.visibleInLayoutModes === 'all' ? 'all' : 'custom'}
            onChange={(e) => onFieldChange('visibleInLayoutModes', e.target.value === 'all' ? 'all' : [layoutModes[0]?.code].filter(Boolean))}
          >
            <option value="all">{t('inspector.visibleInLayouts.all', language)}</option>
            <option value="custom">{t('inspector.visibleInLayouts.custom', language)}</option>
          </select>
        </label>

        {selectedObject.visibleInLayoutModes !== 'all' ? (
          <label>
            {t('inspector.layoutList', language)}
            <select
              multiple
              value={selectedObject.visibleInLayoutModes || []}
              onChange={(e) => onFieldChange('visibleInLayoutModes', Array.from(e.target.selectedOptions).map((it) => it.value))}
            >
              {layoutModes.map((layout) => <option key={layout.id} value={layout.code}>{getLayoutModeLabel(layout, language)}</option>)}
            </select>
          </label>
        ) : null}

        {assetDefinition ? (
          <>
            <label>
              {t('inspector.assetKey', language)}
              <input value={visual.assetKey || assetDefinition.key} onChange={(e) => updateVisualField('assetKey', e.target.value || assetDefinition.key)} />
            </label>
            <label>
              {t('inspector.renderMode', language)}
              <select value={visual.renderMode || assetDefinition.renderMode} onChange={(e) => updateVisualField('renderMode', e.target.value)}>
                <option value="asset">{t('inspector.renderMode.asset', language)}</option>
                <option value="shape">{t('inspector.renderMode.shape', language)}</option>
              </select>
            </label>
            <label className="editor-toggle-field">
              <span>{t('inspector.useTexture', language)}</span>
              <input type="checkbox" checked={Boolean(visual.useTexture ?? assetDefinition.useTexture)} onChange={(e) => updateVisualField('useTexture', e.target.checked)} />
            </label>
            <label>
              {t('inspector.textureKey', language)}
              <select
                value={visual.textureKey || assetDefinition.textureKey || ''}
                onChange={(e) => updateVisualField('textureKey', e.target.value || undefined)}
                disabled={!Boolean(visual.useTexture ?? assetDefinition.useTexture)}
              >
                <option value="">{t('inspector.texture.none', language)}</option>
                {Object.keys(EDITOR_TEXTURE_REGISTRY).map((textureKey) => <option key={textureKey} value={textureKey}>{textureKey}</option>)}
              </select>
            </label>
            <label>
              {t('inspector.opacity', language)}
              <input type="number" min="0.05" max="1" step="0.05" value={visual.opacity ?? 1} onChange={(e) => updateVisualField('opacity', Number(e.target.value))} />
            </label>
            <label>
              {t('inspector.tint', language)}
              <input value={visual.tint || ''} placeholder={t('inspector.tint.placeholder', language)} onChange={(e) => updateVisualField('tint', e.target.value || undefined)} />
            </label>
          </>
        ) : null}

        {isBookable ? (
          <>
            <label>{t('inspector.field.bookingKind', language)}<input value={selectedObject.bookingKind || ''} onChange={(e) => onFieldChange('bookingKind', e.target.value)} /></label>
            <label>{t('inspector.field.capacityMin', language)}<input type="number" value={selectedObject.capacityMin || 0} onChange={(e) => onFieldChange('capacityMin', Number(e.target.value))} /></label>
            <label>{t('inspector.field.capacityMax', language)}<input type="number" value={selectedObject.capacityMax || 0} onChange={(e) => onFieldChange('capacityMax', Number(e.target.value))} /></label>
            <label>{t('inspector.field.depositType', language)}<input value={selectedObject.depositType || ''} onChange={(e) => onFieldChange('depositType', e.target.value || undefined)} /></label>
            <label>{t('inspector.field.depositValue', language)}<input type="number" value={selectedObject.depositValue || 0} onChange={(e) => onFieldChange('depositValue', Number(e.target.value) || undefined)} /></label>
            <label>{t('inspector.field.minSpend', language)}<input type="number" value={selectedObject.minSpend || 0} onChange={(e) => onFieldChange('minSpend', Number(e.target.value) || undefined)} /></label>
            <label className="editor-toggle-field"><span>{t('inspector.field.combinable', language)}</span><input type="checkbox" checked={selectedObject.combinable} onChange={(e) => onFieldChange('combinable', e.target.checked)} /></label>
            <label>{t('inspector.field.combineGroup', language)}<input value={selectedObject.combineGroup || ''} onChange={(e) => onFieldChange('combineGroup', e.target.value || undefined)} /></label>
            <label>{t('inspector.field.tableCode', language)}<input value={selectedObject.tableCode || ''} onChange={(e) => onFieldChange('tableCode', e.target.value || undefined)} /></label>
          </>
        ) : null}
      </div>
    </aside>
  );
}
