import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './src/components/LoginScreen';
import RoomManager from './src/components/RoomManager';
import SetupScreen from './src/components/SetupScreen';
import GameScreen from './src/components/GameScreen';
import GameOverScreen from './src/components/GameOverScreen';
import { GamePhase, Team, Role, GameState, Player, CardData, CardType } from './src/types/index';
import { socket } from './src/types/socket'; 
import { createRoot } from 'react-dom/client';

const normalizeGameState = (
  raw: any,
  players: Player[],
  roomCode: string
): GameState => {
  // If it already looks like our frontend shape, just return it
  if (Array.isArray(raw.board)) {
    return raw as GameState;
  }

  const rawCards = Array.isArray(raw.cards) ? raw.cards : [];

  const board: CardData[] = rawCards.map((card: any) => {
    let type: CardType;
    switch (card.type) {
      case 'Red':
      case 'RED':
        type = CardType.Red;
        break;
      case 'Blue':
      case 'BLUE':
        type = CardType.Blue;
        break;
      case 'Assassin':
      case 'ASSASSIN':
        type = CardType.Assassin;
        break;
      default:
        type = CardType.Bystander;
    }

    return {
      word: card.word,
      type,
      isRevealed: !!(card.revealed ?? card.isRevealed),
    };
  });

  const currentTurn =
    raw.currentTurn === 'Red' || raw.currentTurn === 'RED'
      ? Team.Red
      : Team.Blue;

  const redRemaining = typeof raw.redRemaining === 'number' ? raw.redRemaining : 9;
  const blueRemaining = typeof raw.blueRemaining === 'number' ? raw.blueRemaining : 8;

  const redScore = 9 - redRemaining;
  const blueScore = 8 - blueRemaining;

  const clue = raw.clue ?? null;
  const guessesMade = typeof raw.guessesMade === 'number' ? raw.guessesMade : 0;
  const log = Array.isArray(raw.log) ? raw.log : [];

  return {
    players,
    board,
    currentTurn,
    clue,
    guessesMade,
    redScore,
    blueScore,
    redRemaining,
    blueRemaining,
    log,
    roomCode,
  };
};

const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.Login);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOverInfo, setGameOverInfo] = useState<{ winningTeam: Team; reason: string; assassinHit?: boolean } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLocalGame, setIsLocalGame] = useState(false);

  useEffect(() => {
    // Restore auth token & username from sessionStorage (if exist)
    const storedToken = sessionStorage.getItem('authToken') || '';
    const storedUser = sessionStorage.getItem('authUsername') || '';
    if (storedToken && storedUser && !authToken && !currentUser) {
      setAuthToken(storedToken);
      setCurrentUser({ email: storedUser, name: storedUser, team: null, role: null });
      setGamePhase(GamePhase.Lobby);
    }
  }, []);

  useEffect(() => {
    const handleServerMessage = (event: any) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case "auth_success":
          setAuthToken(payload.token);
          setCurrentUser({ email: payload.username, name: payload.username, team: null, role: null });
          sessionStorage.setItem('authToken', payload.token);
          sessionStorage.setItem('authUsername', payload.username);
          setGamePhase(GamePhase.Lobby);
          break;

        case "auth_error":
          alert(payload.message || "שגיאת אימות");
          break;

        case "room_updated": {
          const nextPlayers: Player[] = payload.players || players;
          setPlayers(nextPlayers);
          if (payload.isLocal !== undefined) setIsLocalGame(payload.isLocal);
          if (payload.gameState) {
            const normalized = normalizeGameState(
              payload.gameState,
              nextPlayers,
              roomCode || payload.roomCode || ''
            );
            setGameState(normalized);
            setGamePhase(GamePhase.Playing);
          }
          break;
        }

        case "room_created":
          setIsCreating(false);
          setRoomCode(payload.roomCode);
          setPlayers(payload.players);
          setIsLocalGame(payload.isLocal);
          setCurrentUser(prev => prev ? { ...prev, isRoomCreator: true } : null);
          setGamePhase(GamePhase.Setup);
          break;

        case "join_success": {
          setRoomCode(payload.roomCode);
          const nextPlayers: Player[] = payload.players || players;
          setPlayers(nextPlayers);
          setIsLocalGame(payload.isLocal || false);
          setCurrentUser(prev => prev ? { ...prev, isRoomCreator: false } : null);
          if (payload.gameState) {
            const normalized = normalizeGameState(
              payload.gameState,
              nextPlayers,
              payload.roomCode || roomCode || ''
            );
            setGameState(normalized);
            setGamePhase(GamePhase.Playing);
          } else {
            setGamePhase(GamePhase.Setup);
          }
          break;
        }

        case "join_error":
          alert(payload.message || "Failed to join room");
          break;

        case "game_started":
        case "game_updated": {
          const normalized = normalizeGameState(
            payload,
            players,
            roomCode
          );
          setGameState(normalized);
          setGamePhase(GamePhase.Playing);
          break;
        }

        case "game_over":
          setGameOverInfo({ 
            winningTeam: payload.winningTeam, 
            reason: payload.reason, 
            assassinHit: !!payload.assassinEmail 
          });
          setGamePhase(GamePhase.GameOver);
          break;

        case "game_reset":
          setGameState(null);
          setGamePhase(GamePhase.Setup);
          break;
      }
    };

    socket.addEventListener("message", handleServerMessage);
    return () => socket.removeEventListener("message", handleServerMessage);
  }, [players]); // Dependency on players needed for leaderboard update logic

  const handleLogin = (username: string, password: string, mode: 'login' | 'register') => {
    socket.send(JSON.stringify({
      type: mode === 'register' ? 'register_user' : 'login_user',
      payload: [username, password],
    }));
  };

  const handleCreateRoom = () => {
    if (!currentUser) return;
    setIsCreating(true);
    socket.send(JSON.stringify({
      type: "create_room",
      payload: [authToken, currentUser, false]
    }));
  };

  const handleStartLocalGame = () => {
    if (!currentUser) return;
    setIsCreating(true);
    socket.send(JSON.stringify({
      type: "create_room",
      payload: [authToken, currentUser, true]
    }));
  };

  const handleJoinRoom = (code: string) => {
    if (!currentUser) return;
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      alert('קוד חדר לא תקין.');
      return;
    }
    socket.send(JSON.stringify({
      type: "join_room",
      payload: [authToken, code, currentUser]
    }));
  };

  const handleLeaveRoom = () => {
    if (roomCode && currentUser) {
      socket.send(JSON.stringify({
        type: "leave_room",
        payload: [authToken, roomCode, currentUser.email]
      }));
    }
    setRoomCode('');
    setPlayers([]);
    setGameState(null);
    setGamePhase(GamePhase.Lobby);
  };

  const handleJoinRole = (team: Team, role: Role) => {
    if (!currentUser || !roomCode) return;
    setCurrentUser({ ...currentUser, team, role });
    socket.send(JSON.stringify({
      type: "join_role",
      payload: [authToken, roomCode, currentUser.email, team, role]
    }));
  };

  const handleStartGame = useCallback((words: string[]) => {
    if (!roomCode) return;
    socket.send(JSON.stringify({
      type: "start_game",
      payload: [authToken, roomCode, words]
    }));
  }, [authToken, roomCode]);

  const handlePlayAgain = () => {
    if (roomCode) {
      socket.send(JSON.stringify({
        type: "reset_game",
        payload: [authToken, roomCode]
      }));
    }
  };
  
  const handleReturnToLobby = () => {
    handleLeaveRoom();
  };

  const renderContent = () => {
    switch (gamePhase) {
      case GamePhase.Login: return <LoginScreen onLogin={handleLogin} />;
      case GamePhase.Lobby: return <RoomManager onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} onStartLocalGame={handleStartLocalGame} isCreating={isCreating} />;
      case GamePhase.Setup: return currentUser && <SetupScreen currentUser={currentUser} roomCode={roomCode} players={players} onStartGame={handleStartGame} onJoinRole={handleJoinRole} onLeaveRoom={handleLeaveRoom} isLocalGame={isLocalGame} />;
      case GamePhase.Playing: return gameState && currentUser && <GameScreen gameState={gameState} currentUser={currentUser} roomCode={roomCode} authToken={authToken} onPlayAgain={handlePlayAgain} onLeaveRoom={handleLeaveRoom} isLocalGame={isLocalGame} />;
      case GamePhase.GameOver: return gameOverInfo && currentUser && <GameOverScreen {...gameOverInfo} authToken={authToken} players={players} onReturnToLobby={handleReturnToLobby} currentUser={currentUser} roomCode={roomCode} isLocalGame={isLocalGame} />;
      default: return <LoginScreen onLogin={handleLogin} />;
    }
  };

  return <div className="min-h-screen">{renderContent()}</div>;
};

export default App;

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}