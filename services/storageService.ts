import { LeaderboardEntry } from '../src/types/index';

const STORAGE_KEY = 'codenames_secure_data';
const SECRET_SALT = 'SPY_MASTER_KEY_2024';

// Basic security layer using Base64 and XOR-like obfuscation
function obfuscate(str: string): string {
  return btoa(
    str
      .split('')
      .map((char, i) =>
        String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
      )
      .join('')
  );
}

function deobfuscate(str: string): string {
  try {
    return atob(str)
      .split('')
      .map((char, i) =>
        String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
      )
      .join('');
  } catch (e) {
    return '{}';
  }
}

export const saveLeaderboard = (data: Record<string, LeaderboardEntry>) => {
  const jsonData = JSON.stringify(data);
  const secureData = obfuscate(jsonData);
  localStorage.setItem(STORAGE_KEY, secureData);
};

export const loadLeaderboard = (): Record<string, LeaderboardEntry> => {
  const secureData = localStorage.getItem(STORAGE_KEY);
  if (!secureData) return {};
  const jsonData = deobfuscate(secureData);
  try {
    return JSON.parse(jsonData);
  } catch (e) {
    return {};
  }
};