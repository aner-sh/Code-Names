export enum Team {
  Red = 'אדום',
  Blue = 'כחול',
}

export enum Role {
  Spymaster = 'רב-מרגלים',
  Operative = 'סוכן שטח',
}

export enum CardType {
  Red = 'RED',
  Blue = 'BLUE',
  Bystander = 'BYSTANDER',
  Assassin = 'ASSASSIN',
}

export interface Player {
  email: string;
  name: string;
  team: Team | null;
  role: Role | null;
  isRoomCreator?: boolean;
}

export interface CardData {
  word: string;
  type: CardType;
  isRevealed: boolean;
}

export interface GameState {
  players: Player[];
  board: CardData[];
  currentTurn: Team;
  clue: { word: string; count: number } | null;
  guessesMade: number;
  redScore: number;
  blueScore: number;
  redRemaining?: number;
  blueRemaining?: number;
  log: string[];
  roomCode: string;
}

export enum GamePhase {
  Login,
  Lobby,
  Setup,
  Playing,
  GameOver,
}

export interface LeaderboardEntry {
  email: string;
  name: string;
  wins: number;
  losses: number;
  assassinHits: number;
  gamesPlayed: number;
}