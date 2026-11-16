export type SpeciesGroup = 'dog' | 'cat' | 'other';

export function speciesGroup(species?: string | null): SpeciesGroup {
  const value = (species ?? '').toLowerCase();
  if (/dog|perro|canin/.test(value)) return 'dog';
  if (/cat|gato|felin/.test(value)) return 'cat';
  return 'other';
}

export function speciesLabel(species?: string | null): string {
  const group = speciesGroup(species);
  if (group === 'dog') return 'Canino';
  if (group === 'cat') return 'Felino';
  return species?.trim() || 'No informada';
}

export function speciesEmoji(species?: string | null): string {
  const group = speciesGroup(species);
  return group === 'dog' ? '🐶' : group === 'cat' ? '🐱' : '🐾';
}
