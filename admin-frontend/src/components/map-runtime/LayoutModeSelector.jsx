export default function LayoutModeSelector({ layoutModes, value, onChange }) {
  return (
    <label>
      Layout mode
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {layoutModes.map((mode) => (
          <option key={mode.id} value={mode.code}>{mode.name}</option>
        ))}
      </select>
    </label>
  );
}
