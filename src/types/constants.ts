import { CardType, Team } from '.';

export const DEFAULT_WORDS_HE = [
  'הוליווד', 'מסך', 'מחזה', 'שיש', 'דינוזאור',
  'חתול', 'טלסקופ', 'אחות', 'חוזה', 'ירוק',
  'מפתח', 'וושינגטון', 'עמוד שדרה', 'צלחת', 'קנטאור',
  'שייקספיר', 'טיול', 'מסוק', 'צק', 'עגול',
  'ערות', 'גרמניה', 'נחושת', 'גק', 'רשת'
].join('\n');

export const STARTING_TEAM_CARD_COUNT = 9;
export const OTHER_TEAM_CARD_COUNT = 8;
export const ASSASSIN_COUNT = 1;
export const BYSTANDER_COUNT = 7;

export const TEAM_COLORS_UI: { [key in Team]: { bg: string, text: string, accent: string } } = {
  [Team.Red]: { bg: 'bg-red-700', text: 'text-white', accent: 'border-red-500' },
  [Team.Blue]: { bg: 'bg-blue-700', text: 'text-white', accent: 'border-blue-500' },
};

export const CARD_COLORS_HE: { [key in CardType]: { revealed: string, spymaster: string, text: string } } = {
    [CardType.Red]: { revealed: 'bg-red-600', spymaster: 'border-red-500 bg-red-900/30', text: 'text-white' },
    [CardType.Blue]: { revealed: 'bg-blue-600', spymaster: 'border-blue-500 bg-blue-900/30', text: 'text-white' },
    [CardType.Bystander]: { revealed: 'bg-yellow-500', spymaster: 'border-yellow-500 bg-yellow-900/30', text: 'text-black' },
    [CardType.Assassin]: { revealed: 'bg-gray-900', spymaster: 'border-gray-500 bg-gray-900/80', text: 'text-white' },
};