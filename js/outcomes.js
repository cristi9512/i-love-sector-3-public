// Shared rules: which categories are parking enforcement, what each city-hall
// outcome means, the 30-day legal deadline, and how replies are grouped.
// Used by the site (app, Statistici, monthly report) and by the collector.

// Parking and stopping enforcement: "Parcări ocupate", "Staționare
// neregulamentară", "Mașini ridicate" (plus two older ids). Abandoned cars and
// parking-space markings stay with city problems: they ask for something to be fixed.
export const PARKING_CATS = new Set(['1', '2', '26', '27', '200']);
export const isParking = (catId) => PARKING_CATS.has(String(catId));

// OG 27/2002 (petitions): an answer within 30 days, extendable by 15.
export const OVERDUE_DAYS = 30;

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The city's exact outcome, finer than the five colours: good, partial, bad,
 *  internal, declined, pending, open or unknown. */
export function outcomeKind(code, label) {
  if (code === 'O') return 'open';
  const l = fold(label);
  if (l.includes('nefavorabil')) return 'bad';
  if (l.includes('partial')) return 'partial';
  if (l.includes('intern')) return 'internal';
  if (l.includes('declinat')) return 'declined';
  if (l.includes('favorabil')) return 'good';
  if (l.includes('asteptare')) return 'pending';
  return 'unknown';
}
export const OUTCOME_ORDER = ['good', 'partial', 'bad', 'declined', 'internal', 'pending', 'unknown', 'open'];
// colour group of each outcome (the validated 5-colour palette)
export const OUTCOME_COLOR = { good: 'good', partial: 'partial', bad: 'bad', declined: 'other', internal: 'other', pending: 'other', unknown: 'other', open: 'open' };

/** Groups near-identical replies: first 8 meaningful words, without plates and greetings. */
export function replyKey(text) {
  return fold(text)
    .replace(/\b[a-z]{1,2}\s*\d{2,3}\s*[a-z]{3}\b/g, ' ') // plates like "B 123 ABC"
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\b(buna ziua|buna seara|buna dimineata|stimate|stimata|domnule|doamna)\b/g, ' ')
    .split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
}
