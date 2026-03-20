import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types/index';
import { socket } from '../types/socket';

interface RoomManagerProps {
  authToken: string;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onStartLocalGame: () => void;
  isCreating: boolean;
  onLogout: () => void;
}

const RoomManager: React.FC<RoomManagerProps> = ({ authToken, onCreateRoom, onJoinRoom, onStartLocalGame, isCreating, onLogout }) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [stats, setStats] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const handleMessage = (event: any) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        if (type === 'leaderboard') {
          const entries: LeaderboardEntry[] = Object.values(payload || {}).map((u: any) => ({
            email: u.username,
            name: u.username,
            wins: u.wins ?? 0,
            losses: u.losses ?? 0,
            assassinHits: u.assassinHits ?? 0,
            gamesPlayed: u.gamesPlayed ?? 0,
          }));
          entries.sort((a, b) => b.wins - a.wins);
          setStats(entries);
        }
      } catch {
        // ignore parse errors
      }
    };

    socket.addEventListener('message', handleMessage);
    socket.send(JSON.stringify({ type: 'get_leaderboard', payload: [authToken] }));

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [authToken]);

  const handleJoinClick = () => {
    if (roomCodeInput.length === 6) {
      onJoinRoom(roomCodeInput);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#0f172a]">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-end border-b-2 border-slate-700 pb-4 md:pb-6 gap-4">
          <div className="text-right">
            <h1 className="text-4xl md:text-5xl font-title text-white leading-tight">מרכז הבקרה</h1>
          </div>
          <button
            onClick={onLogout}
            className="px-6 py-2 rounded-full border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300 font-main font-bold text-sm uppercase tracking-wide"
          >
            התנתק
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
          
          {/* ACTION AREA */}
          <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="game-card-bg p-6 md:p-8 hover:shadow-2xl transition-all rounded-2xl md:rounded-3xl border-t-4 border-t-red-500 group flex flex-col justify-between">
                  <div className="space-y-3">
                    <h2 className="text-2xl md:text-3xl font-main font-black uppercase italic">משימה מקומית</h2>
                    <p className="text-slate-400 text-sm md:text-base font-main leading-snug">משחק ביתי על אותו מסך. 4 שחקנים, חוויה משפחתית קלאסית.</p>
                  </div>
                  <button onClick={onStartLocalGame} className="mt-6 w-full py-3 btn-primary text-xl md:text-2xl font-main rounded-xl active:scale-95">הפעל משימה מקומית</button>
                </div>

                <div className="game-card-bg p-6 md:p-8 hover:shadow-2xl transition-all rounded-2xl md:rounded-3xl border-t-4 border-t-blue-500 group flex flex-col justify-between">
                  <div className="space-y-3">
                    <h2 className="text-2xl md:text-3xl font-main font-black uppercase italic text-blue-400">משימה בינלאומית</h2>
                    <p className="text-slate-400 text-sm md:text-base font-main leading-snug">צור חדר מרוחק והזמן סוכנים מכל מקום בעולם.</p>
                  </div>
                  <button 
                    onClick={onCreateRoom} 
                    disabled={isCreating}
                    className="mt-6 w-full py-3 btn-primary text-xl md:text-2xl font-main bg-blue-600 hover:bg-blue-500 rounded-xl active:scale-95"
                  >
                    {isCreating ? 'מייצר ערוץ...' : 'פתח חדר חדש'}
                  </button>
                </div>
            </div>

            {/* JOIN ROOM BOX */}
            <div className="game-card-bg p-6 md:p-8 rounded-2xl md:rounded-3xl border-l-4 border-l-yellow-500">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
                <div className="flex-grow space-y-2 w-full">
                  <label className="text-sm md:text-base font-main font-bold text-slate-500 uppercase tracking-widest">קבלת שידור מחדר קיים</label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.replace(/\s/g, '').toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === ' ') e.preventDefault();
                      if (e.key === 'Enter' && roomCodeInput.length === 6) handleJoinClick();
                    }}
                    placeholder="קוד חדר"
                    className="w-full input-standard text-3xl md:text-4xl py-3 text-center font-main placeholder:text-slate-800 rounded-xl"
                    maxLength={6}
                  />
                </div>
                <button 
                  onClick={handleJoinClick}
                  disabled={!roomCodeInput || roomCodeInput.length < 6}
                  className="w-full md:w-48 py-3 md:py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 transition-colors text-2xl md:text-3xl font-main font-bold disabled:opacity-30 rounded-xl shadow-xl hover:shadow-yellow-500/20 active:scale-95 mt-6 md:mt-0"
                >
                  התחבר
                </button>
              </div>
            </div>
          </div>

          {/* LEADERBOARD */}
          <div className="game-card-bg p-6 md:p-8 rounded-2xl md:rounded-3xl border-r-4 border-r-green-500 flex flex-col w-full h-full min-h-[400px] lg:min-h-0 overflow-hidden">
            <h3 className="text-2xl md:text-3xl font-main font-black mb-4 md:mb-6 text-white border-b-2 border-slate-700 pb-3 uppercase italic shrink-0">
              הסוכנים המובילים
            </h3>
            
            <div className="space-y-4 overflow-y-auto pr-2 flex-grow h-0 min-h-0 custom-scrollbar">
              {stats.length > 0 ? stats.map((agent, i) => (
                <div key={agent.email} className="flex justify-between items-center border-b border-slate-800/50 pb-3 hover:bg-slate-800/20 transition-colors p-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-base md:text-lg text-slate-600 font-bold font-main">{i+1}.</span>
                    <div className="flex flex-col">
                      <span className="font-black text-lg md:text-xl leading-none font-main text-white">{agent.name}</span>
                      <span className="text-xs md:text-sm text-slate-500 font-main">ניצחונות: {agent.wins} / התנקשות: {agent.assassinHits}</span>
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-main font-black text-green-500 drop-shadow-sm">{Math.round((agent.wins / (agent.gamesPlayed || 1)) * 100)}%</div>
                </div>
              )) : (
                <div className="text-center py-10 text-slate-600 italic font-main text-lg md:text-xl">המשימה הראשונה ממתינה...</div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default RoomManager;