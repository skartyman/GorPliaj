const COMMENT_MODE_PATTERN = /\[mode:([A-Z_]+)\]/i;
const COMMENT_PLACE_PATTERN = /\[place:([A-Z_]+)\]/i;

export function parseReservationMeta(comment = '') {
  const source = String(comment || '');
  const modeMatch = source.match(COMMENT_MODE_PATTERN);
  const placeMatch = source.match(COMMENT_PLACE_PATTERN);

  const cleanComment = source
    .replace(COMMENT_MODE_PATTERN, '')
    .replace(COMMENT_PLACE_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    mode: modeMatch?.[1]?.toUpperCase() || null,
    place: placeMatch?.[1]?.toUpperCase() || null,
    cleanComment
  };
}

