import React, { useState, useEffect } from 'react';
import { Team, Player } from '../types/index';
import { socket } from '../types/socket';

interface GameOverScreenProps {
  winningTeam: Team;
  reason: string;
  players: Player[];
  onReturnToLobby: () => void;
  currentUser: Player;
  roomCode: string;
  isLocalGame?: boolean;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ winningTeam, reason, players, onReturnToLobby, currentUser, roomCode, isLocalGame }) => {
  const [confirmedEmails, setConfirmedEmails] = useState<string[]>([]);
  const isRed = winningTeam === Team.Red;

  useEffect(() => {
    const handleVoteUpdate = (event: any) => {
      const data = JSON.parse(event.data);
      if (data.type === "play_again_vote") {
        setConfirmedEmails(data.payload);
      }
    };

    socket.addEventListener("message", handleVoteUpdate);

    return () => {
      socket.removeEventListener("message", handleVoteUpdate);
    };
  }, []);

  const handleConfirmRematch = () => {
    socket.send(JSON.stringify({
      type: "play_again",
      payload: [roomCode, currentUser.email]
    }));
  };
  
  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center p-2 sm:p-4 box-border">
      
      <div className="w-full max-w-6xl xl:max-w-7xl space-y-4 md:space-y-6 text-center flex flex-col h-full justify-center">
        
        {/* HEADER SECTION */}
        <div className="space-y-1 md:space-y-2 shrink-0">
          <h1 className="text-4xl md:text-5xl font-title text-white leading-tight drop-shadow-md">המשחק הסתיים</h1>
          <div className={`text-3xl md:text-4xl font-main font-black italic tracking-tight drop-shadow-lg ${isRed ? 'text-red-500' : 'text-blue-400'}`}>
            ★ המוסד ה{winningTeam} ניצח ★
          </div>
        </div>
        
        {/* MAIN CARD */}
        <div className="game-card-bg p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col gap-4 relative mx-auto w-full max-h-[75vh]">
          
          <p className="text-lg md:text-2xl font-main font-bold text-white leading-snug border-b-2 border-slate-600/50 pb-3 md:pb-4 shrink-0">
            {reason}
          </p>

          <div className="flex flex-col gap-3 md:gap-4 flex-grow justify-center">
            <h3 className="text-lg md:text-2xl font-main font-black text-slate-200">
              משחק חוזר? ({confirmedEmails.length}/{players.length})
            </h3>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
              {players.map(player => (
                <div
                  key={player.email}
                  className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                    confirmedEmails.includes(player.email) 
                      ? 'bg-green-500/20 border-green-500 text-green-400 shadow-inner' 
                      : 'bg-slate-800/50 border-slate-600 text-slate-400'
                  }`}
                >
                  <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-sm md:text-base font-black ${confirmedEmails.includes(player.email) ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                     {confirmedEmails.includes(player.email) ? '✓' : '?'}
                  </div>
                  <span className="text-xs md:text-sm font-main font-bold truncate w-full text-center">{player.name}</span>
                </div>
              ))}
            </div>
            
            {/* ACTION AREA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2 shrink-0">
              {!confirmedEmails.includes(currentUser.email) ? (
                <button
                  onClick={handleConfirmRematch}
                  className="w-full sm:w-auto px-6 md:px-10 py-2.5 md:py-3 bg-green-600 hover:bg-green-500 text-white text-lg md:text-xl font-main font-bold rounded-xl shadow-lg transition-all active:scale-95 border-b-4 border-green-800"
                >
                  אני מוכן למשחק חוזר!
                </button>
              ) : (
                confirmedEmails.length === players.length && players.length > 0 && (
                   <p className="text-green-500 font-main font-black text-xl md:text-2xl animate-pulse">כולם בפנים! מתחילים מחדש...</p>
                )
              )}

              <button
                onClick={onReturnToLobby}
                className="w-full sm:w-auto px-6 md:px-10 py-2.5 md:py-3 bg-slate-700 hover:bg-slate-600 text-white text-lg md:text-xl font-main font-bold rounded-xl border-b-4 border-slate-900 active:scale-95 transition-all"
              >
                חזרה ללובי הראשי
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;