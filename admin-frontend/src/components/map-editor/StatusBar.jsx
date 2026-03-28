export default function StatusBar({ document, selectedObject, layoutMode, zoom, mode }) {
  return (
    <footer className="fp-statusbar">
      <span>{document.name}</span>
      <span>Version: {document.version}</span>
      <span>Mode: {mode}</span>
      <span>Layout Preview: {layoutMode?.code}</span>
      <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
      <span>Selected: {selectedObject?.name || 'none'}</span>
    </footer>
  );
}
