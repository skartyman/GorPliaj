function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getRotatedObjectBounds(object) {
  const x = numberOr(object?.x);
  const y = numberOr(object?.y);
  const width = Math.max(numberOr(object?.width, 44), 24);
  const height = Math.max(numberOr(object?.height, 44), 24);
  const rotation = (numberOr(object?.rotation) * Math.PI) / 180;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ].map(([cornerX, cornerY]) => {
    const dx = cornerX - width / 2;
    const dy = cornerY - height / 2;
    return {
      x: centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation),
      y: centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation),
    };
  });

  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  };
}

function getMapContentSize(map, objects = []) {
  const width = Math.max(numberOr(map?.width, 1200), 100);
  const height = Math.max(numberOr(map?.height, 760), 100);

  const bounds = objects.reduce(
    (acc, object) => {
      const objectBounds = getRotatedObjectBounds(object);
      return {
        maxX: Math.max(acc.maxX, objectBounds.maxX),
        maxY: Math.max(acc.maxY, objectBounds.maxY),
      };
    },
    { maxX: width, maxY: height }
  );

  return {
    width: Math.ceil(Math.max(width, bounds.maxX)),
    height: Math.ceil(Math.max(height, bounds.maxY)),
  };
}

function fitMapToObjects(map, objects = []) {
  if (!map) {
    return map;
  }

  return {
    ...map,
    ...getMapContentSize(map, objects),
  };
}

module.exports = {
  fitMapToObjects,
  getMapContentSize,
  getRotatedObjectBounds,
};
