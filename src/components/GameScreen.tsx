import React, { useState } from 'react';
import { GameState, Team, Role, CardData, CardType, Player } from '../types/index';
// import { TEAM_COLORS_UI } from '../types/constants';
import { SpyIcon } from './icons';
import Card from './Card';
import { socket } from '../types/socket';

interface GameScreenProps {
  gameState: GameState;
  currentUser: Player;
  roomCode: string;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
  isLocalGame?: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState, currentUser, roomCode, onPlayAgain, onLeaveRoom, isLocalGame }) => {
  const [isSpymasterView, setIsSpymasterView] = useState(isLocalGame ? false : currentUser.role === Role.Spymaster);
  const [clueWord, setClueWord] = useState('');
  const [clueCount, setClueCount] = useState(1);
  const [error, setError] = useState('');

  const { players, board, currentTurn, clue, redRemaining, blueRemaining, guessesMade, log } = gameState;

  const redLeft = typeof redRemaining === 'number' ? redRemaining : Math.max(9 - (gameState.redScore ?? 0), 0);
  const blueLeft = typeof blueRemaining === 'number' ? blueRemaining : Math.max(8 - (gameState.blueScore ?? 0), 0);
  const guessesLeft = clue ? Math.max(clue.count - guessesMade, 0) : 0;

  const currentSpymaster = players.find(p => p.team === currentTurn && p.role === Role.Spymaster);
  const currentOperative = players.find(p => p.team === currentTurn && p.role === Role.Operative);

  const isMyTurn = isLocalGame || currentUser.team === currentTurn;
  const amIOperative = isLocalGame || currentUser.role === Role.Operative;
  const amISpymaster = isLocalGame || currentUser.role === Role.Spymaster;

  const getLogEntryClasses = (entry: string) => {
    if (entry.includes('(אדום)')) return 'border-red-700/70 text-red-200';
    if (entry.includes('(כחול)')) return 'border-blue-700/70 text-blue-200';
    return 'border-slate-700 text-slate-300';
  };

  const handleCardClick = (cardIndex: number) => {
    if (!clue || !isMyTurn || !amIOperative) return;
    const clickedCard = board[cardIndex];
    if (clickedCard.isRevealed) return;

    socket.send(JSON.stringify({
      type: "make_guess",
      payload: [roomCode, clickedCard.word, currentUser.email]
    }));
  };
  
  const handleEndTurn = () => {
    if (!clue || !isMyTurn || !amIOperative) return;
    
    socket.send(JSON.stringify({
      type: "end_turn",
      payload: [roomCode]
    }));
  }

  const handleGiveClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !amISpymaster) return;

    const normalizedClue = clueWord.trim().toLowerCase();
    if (normalizedClue === '' || clueCount < 1) return;

    const isWordOnBoard = board.some(card => 
        !card.isRevealed && card.word.toLowerCase() === normalizedClue
    );

    if (isWordOnBoard) {
        setError(`המילה "${clueWord}" מופיעה על הלוח! אסור להשתמש בה כרמז.`);
        return;
    }

    setError('');
    
    socket.send(JSON.stringify({
      type: "give_clue",
      payload: [roomCode, clueWord.trim().toUpperCase(), clueCount]
    }));
    
    setClueWord('');
    setClueCount(1);
  };
  
  const ScorePanel = ({ team, remaining }: { team: Team, remaining: number }) => {
    const max = team === Team.Red ? 9 : 8;
    const percentage = Math.min((remaining / max) * 100, 100);
    return (
      <div className={`p-4 md:p-5 rounded-2xl shadow-xl border-b-4 border-black/30 flex flex-col items-center justify-center transition-all ${team === Team.Red ? 'bg-red-700' : 'bg-blue-700'} border-white/10 w-full`}>
        {/* Team Name and Score*/}
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="text-xl md:text-2xl font-main font-black uppercase tracking-[0.1em] italic drop-shadow-md">{team}</h2>
          <p className="text-4xl md:text-5xl font-main font-black leading-none drop-shadow-xl">{remaining}</p>
        </div>
        
        <p className="text-[10px] md:text-xs font-main text-white/50 uppercase font-black tracking-widest mb-2 md:mb-3">נותרו לגילוי</p>
        
        <div className="w-full bg-black/40 h-1.5 md:h-2 rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${team === Team.Red ? 'bg-red-400' : 'bg-blue-400'}`} 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-6 flex flex-col lg:flex-row gap-4 md:gap-6 paper-texture">
      {/* Sidebar */}
      <div className="w-full lg:w-64 xl:w-72 flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
            <ScorePanel team={Team.Red} remaining={redLeft} />
            <ScorePanel team={Team.Blue} remaining={blueLeft} />
        </div>
        
        {/* MISSION LOG*/}
        <div className="game-card-bg p-4 md:p-5 rounded-2xl flex-1 flex flex-col min-h-[200px] lg:max-h-[40vh] overflow-hidden border-t-4 border-slate-500">
            <h3 className="text-lg md:text-xl font-main font-black text-white uppercase mb-2 border-b border-slate-700 pb-2 italic shrink-0">לוח שידורים</h3>
            <div className="flex-1 min-h-0 overflow-y-auto text-xs md:text-sm space-y-2 font-main text-slate-300 pr-3 
              [&::-webkit-scrollbar]:w-1.5 md:[&::-webkit-scrollbar]:w-2 
              [&::-webkit-scrollbar-track]:bg-slate-800/50 
              [&::-webkit-scrollbar-track]:rounded-full 
              [&::-webkit-scrollbar-thumb]:bg-slate-500 
              hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 
              [&::-webkit-scrollbar-thumb]:rounded-full 
              transition-colors"
            >
                {log.slice().reverse().map((entry, i) => (
                    <p key={i} className={`border-r-4 pr-3 leading-tight ${getLogEntryClasses(entry)}`}>
                        <span className="text-slate-600 font-bold">[{log.length - i}]</span> {entry}
                    </p>
                ))}
            </div>
        </div>

        <div className="flex gap-3 shrink-0">
            {currentUser.isRoomCreator && (
              <button onClick={onPlayAgain} className="flex-grow bg-slate-800 hover:bg-slate-700 text-white font-main font-bold py-2 md:py-3 px-4 rounded-xl transition-all border-b-4 border-black text-base md:text-lg uppercase tracking-widest active:scale-95">
                  אתחול
              </button>
            )}
            <button onClick={onLeaveRoom} className="p-2 md:p-3 bg-red-900/50 hover:bg-red-800 text-white rounded-xl border-b-4 border-black transition-all active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
        </div>
      </div>

      {/* Grid & Controls */}
      <div className="flex-grow flex flex-col gap-4 md:gap-6 min-w-0">
        <div className="flex-grow grid grid-cols-5 grid-rows-5 gap-2 md:gap-3 p-3 md:p-4 bg-black/40 rounded-xl md:rounded-2xl border-4 border-slate-800 shadow-2xl overflow-hidden">
          {board.map((card, index) => (
            <Card 
              key={index} 
              card={card} 
              isSpymasterView={isSpymasterView}
              onClick={() => handleCardClick(index)}
              disabled={!clue || !isMyTurn || !amIOperative || isSpymasterView}
            />
          ))}
        </div>
        
        {/* Tactical Link */}
        <div className="game-card-bg rounded-xl md:rounded-2xl p-3 md:p-5 shadow-xl relative border-b-[4px] md:border-b-[6px] border-black/40 overflow-visible shrink-0">
           <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-900 text-blue-400 px-4 py-1 rounded-full text-xs font-main font-bold uppercase tracking-[0.1em] shadow-sm border border-blue-500/30 italic">
             מרכז בקרה
           </div>

           <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 pt-2">
              <div className="text-center md:text-right shrink-0">
                  <p className="text-[10px] md:text-xs text-slate-500 uppercase font-main font-bold mb-0.5 tracking-widest">תור הצוות ה:</p>
                  <p className={`text-2xl md:text-3xl font-main font-black italic ${currentTurn === Team.Red ? 'text-red-500' : 'text-blue-500'}`}>{currentTurn}</p>
              </div>

              {clue && (
                 <div className="flex-grow text-center bg-black/20 p-2 md:p-4 rounded-lg md:rounded-xl border border-slate-700 flex flex-col items-center shadow-inner relative w-full md:w-auto">
                   <p className="text-[10px] md:text-xs text-slate-500 uppercase font-main font-bold mb-1 tracking-[0.1em]">שידור רמז פעיל</p>
                   <div className="flex items-center gap-3">
                        <p className="text-2xl md:text-3xl font-main font-black italic text-white tracking-tight drop-shadow-sm">{clue.word}</p>
                        <span className="bg-white text-slate-900 text-xl md:text-2xl px-3 py-0.5 rounded-lg font-main font-black not-italic shadow-md">{guessesLeft}</span>
                   </div>
                   <div className="mt-2 w-full bg-slate-800 h-2 md:h-2.5 rounded-full overflow-hidden max-w-[200px] border border-slate-700 shadow-inner">
                      <div className={`h-full transition-all duration-1000 ${currentTurn === Team.Red ? 'bg-red-600' : 'bg-blue-600'}`} style={{width: `${clue.count ? (guessesLeft / clue.count) * 100 : 0}%`}}></div>
                   </div>
                 </div>
              )}

               <div className="text-center md:text-left shrink-0">
                  <p className="text-lg md:text-xl font-main font-black text-white italic">{isLocalGame ? 'משחק מקומי' : (clue ? currentOperative?.name : currentSpymaster?.name)}</p>
                  <div className="mt-1 flex items-center gap-1.5 justify-center md:justify-start">
                     <span className={`w-2 h-2 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)] ${clue ? 'bg-green-500 animate-pulse' : 'bg-orange-500 animate-pulse'}`}></span>
                     <span className="text-[10px] md:text-xs text-slate-400 uppercase font-main font-black tracking-wide">{clue ? 'מרגל' :  'מפעיל'}</span>
                  </div>
              </div>
          </div>
          
          <div className="mt-4 md:mt-5 pt-3 md:pt-4 border-t border-slate-700">
            {error && <p className="text-center text-red-400 font-main font-bold text-sm mb-3 bg-red-950/40 py-2 rounded-lg border border-red-500/30 animate-shake uppercase">{error}</p>}
            {!clue ? (
              isMyTurn && amISpymaster ? (
                <form onSubmit={handleGiveClue} className="flex flex-col sm:flex-row gap-2 md:gap-3 items-center justify-center max-w-2xl mx-auto">
                    <input 
                      type="text" 
                      value={clueWord} 
                      onChange={e => setClueWord(e.target.value)} 
                      placeholder="הזן מילת קוד..." 
                      className="w-full sm:flex-grow bg-black/30 border-2 border-slate-700 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg focus:border-blue-500 outline-none font-main font-black text-base md:text-lg italic tracking-tight placeholder:text-slate-700 transition-all shadow-md" 
                    />
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-slate-700 shadow-md">
                      <label className="text-sm md:text-base font-main font-black text-slate-500 uppercase italic">כמות:</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="9" 
                        value={clueCount} 
                        onChange={e => setClueCount(Number(e.target.value))} 
                        className="bg-transparent text-white w-8 text-center text-lg md:text-xl font-main font-black focus:outline-none" 
                      />
                    </div>
                    <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-main font-black py-2 md:py-2.5 px-6 md:px-8 rounded-lg transition-all shadow-[0_5px_15px_rgba(59,130,246,0.3)] active:scale-95 text-xl md:text-1xl italic uppercase">שדר</button>
                </form>
              ) : (
                <div className="text-center text-sm md:text-base font-main font-bold text-slate-400">
                  ממתין למסר מהמפעיל...
                </div>
              )
            ) : (
                <div className="text-center">
                    {isMyTurn && amIOperative ? (
                      <button onClick={handleEndTurn} className="bg-red-800 hover:bg-red-700 text-white font-main font-black py-2.5 md:py-3 px-8 md:px-12 rounded-lg md:rounded-xl border-b-4 border-black/40 transition-all uppercase text-base md:text-lg italic shadow-lg active:scale-95">בטל משימה</button>
                    ) : (
                      <div className="text-sm md:text-base font-main font-bold text-slate-400">
                        ממתין לתשובת המרגל...
                      </div>
                    )}
                </div>
            )}
          </div>
          
          {(isLocalGame || currentUser.role === Role.Spymaster) && (
            <div className="flex justify-center mt-3 md:mt-4">
              <button
                  onClick={() => setIsSpymasterView(prev => !prev)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-main font-black tracking-[0.1em] transition-all border-2 shadow-sm uppercase italic ${isSpymasterView ? 'bg-white border-white text-slate-900' : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
              >
                  <SpyIcon className="w-4 h-4 md:w-5 md:h-5" />
                  {isSpymasterView ? 'מצב גלוי' : 'מצב מוצפן'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;