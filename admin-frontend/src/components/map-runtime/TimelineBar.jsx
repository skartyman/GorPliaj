export default function TimelineBar({ value, onChange }) {
  return (
    <label>
      Timeline
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
