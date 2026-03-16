import React, { useState } from 'react';
import { Team, Role, Player } from '../types/index';
import { generateCodenamesWordsHe } from '../../services/geminiService';
import { DEFAULT_WORDS_HE } from '../types/constants';
import { socket } from '../types/socket';

interface SetupScreenProps {
  currentUser: Player;
  roomCode: string;
  players: Player[];
  onStartGame: (words: string[]) => void;
  onJoinRole: (team: Team, role: Role) => void;
  onLeaveRoom: () => void;
  isLocalGame?: boolean;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ currentUser, roomCode, players, onStartGame, onJoinRole, onLeaveRoom, isLocalGame }) => {
  const [words, setWords] = useState(DEFAULT_WORDS_HE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<{ team: Team; role: Role } | null>(null);

  const handleGenerateWords = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const generatedWords = await generateCodenamesWordsHe();
      setWords(generatedWords.join('\n'));
    } catch (e: any) {
      setError(e.message || 'שגיאה ביצירת מילים');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = () => {
    const trimmedWords = words.split('\n').map(w => w.trim()).filter(Boolean);
    if (trimmedWords.length !== 25) {
      setError(`חובה להזין בדיוק 25 מילים. כרגע יש ${trimmedWords.length}.`);
      return;
    }
    
    if (!isLocalGame) {
      const rolesFilled = [
        players.some(p => p.team === Team.Red && p.role === Role.Spymaster),
        players.some(p => p.team === Team.Red && p.role === Role.Operative),
        players.some(p => p.team === Team.Blue && p.role === Role.Spymaster),
        players.some(p => p.team === Team.Blue && p.role === Role.Operative),
      ].every(Boolean);

      if (!rolesFilled) {
        setError('חובה למלא את כל התפקידים (4 סוכנים).');
        return;
      }

      // start_game is sent by App (so it can attach auth token)
      onStartGame(trimmedWords);
    } else {
      // For local games, we just call the prop directly
      onStartGame(trimmedWords);
    }
  };

  const handleRoleSelection = (team: Team, role: Role) => {
    setSelectedRole({ team, role });
    if (isLocalGame) {
        onJoinRole(team, role);
        return;
    }

    // join_role is sent by App (so it can attach auth token)
    onJoinRole(team, role);
  };

  const renderRoleSlot = (team: Team, role: Role) => {
    const occupant = players.find(p => p.team === team && p.role === role);
    const isRed = team === Team.Red;
    const isSelected = !!selectedRole && selectedRole.team === team && selectedRole.role === role;
    return (
      <div
        className={`game-card-bg p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
          occupant
            ? (isRed ? 'border-red-600 bg-red-950/20' : 'border-blue-600 bg-blue-950/20')
            : 'border-slate-700 bg-slate-800/50'
        } ${
          isSelected && !occupant
            ? (isRed
                ? 'ring-2 ring-red-400/60 scale-[1.02]'
                : 'ring-2 ring-blue-400/60 scale-[1.02]')
            : ''
        }`}
      >
        <span className="text-sm md:text-base uppercase font-main font-bold text-slate-500 tracking-widest">{role}</span>
        <div className="h-10 md:h-12 flex items-center justify-center">
            {occupant ? (
                <span className={`text-xl md:text-2xl font-main font-black italic tracking-tight ${isRed ? 'text-red-400' : 'text-blue-400'}`}>{occupant.name}</span>
            ) : (
                <button 
                  onClick={() => handleRoleSelection(team, role)} 
                  className={`px-4 py-1.5 border-2 rounded-lg font-main font-bold text-sm md:text-base transition-all active:scale-95 ${
                    isRed
                      ? 'border-red-900 text-red-700 hover:bg-red-700 hover:text-white'
                      : 'border-blue-900 text-blue-700 hover:bg-blue-700 hover:text-white'
                  } ${isSelected ? 'text-white' : ''}`}
                >
                  {isSelected ? 'נבחר' : 'בחירת תפקיד'}
                </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#0f172a]">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-slate-700 pb-4 md:pb-6">
            <div className="text-center md:text-right space-y-1">
                <h1 className="text-4xl md:text-5xl font-title text-white leading-tight">חדר מבצעים: <span className="text-red-500 tracking-widest font-main">{roomCode}</span></h1>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
                <div className="text-center md:text-left">
                    <div className="text-xs md:text-sm font-main text-slate-500 font-bold uppercase">מפקד החדר</div>
                    <div className="text-xl md:text-2xl font-main font-black text-white">{currentUser.name}</div>
                </div>
                <button onClick={onLeaveRoom} className="p-2 md:p-3 rounded-full bg-slate-800 text-slate-400 hover:bg-red-900 hover:text-white transition-all border border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>

        {error && <div className="p-3 bg-red-900/20 border-2 border-red-600 text-red-400 text-center font-main font-bold text-lg rounded-xl animate-shake">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {!isLocalGame && (
              <div className="space-y-6 md:space-y-8">
                  <div className="space-y-4">
                      <h2 className="text-2xl md:text-3xl font-main font-black text-red-500 border-r-4 border-red-600 pr-3 uppercase italic">המוסד האדום</h2>
                      <div className="grid grid-cols-2 gap-4">
                          {renderRoleSlot(Team.Red, Role.Spymaster)}
                          {renderRoleSlot(Team.Red, Role.Operative)}
                      </div>
                  </div>
                  <div className="space-y-4">
                      <h2 className="text-2xl md:text-3xl font-main font-black text-blue-500 border-r-4 border-blue-600 pr-3 uppercase italic">המוסד הכחול</h2>
                      <div className="grid grid-cols-2 gap-4">
                          {renderRoleSlot(Team.Blue, Role.Spymaster)}
                          {renderRoleSlot(Team.Blue, Role.Operative)}
                      </div>
                  </div>
              </div>
            )}

            <div className={`game-card-bg p-6 md:p-8 rounded-2xl md:rounded-3xl space-y-4 border-l-4 border-l-blue-500 ${isLocalGame ? 'lg:col-span-2 max-w-3xl mx-auto w-full' : ''}`}>
                <div className="flex justify-between items-center border-b-2 border-slate-700 pb-3">
                    <h3 className="text-xl md:text-2xl font-main font-black text-white uppercase italic">מילון צפנים</h3>
                    {isGenerating && <span className="text-sm md:text-base font-main text-blue-500 animate-pulse font-bold uppercase">טוען...</span>}
                </div>
                <textarea
                    value={words}
                    onChange={(e) => setWords(e.target.value)}
                    disabled={!currentUser.isRoomCreator}
                    className="w-full h-48 md:h-64 bg-black/40 border-2 border-slate-700 text-slate-300 text-lg md:text-xl font-main leading-relaxed resize-none p-4 rounded-xl focus:border-blue-500 outline-none transition-all"
                />
                {currentUser.isRoomCreator && (
                    <button 
                      onClick={handleGenerateWords} 
                      disabled={isGenerating}
                      className="w-full py-3 md:py-4 btn-primary bg-slate-800 text-white hover:bg-slate-700 border-2 border-slate-600 text-lg md:text-xl font-main rounded-xl active:scale-95 transition-all"
                    >
                      טען מילים חדשות
                    </button>
                )}
            </div>
        </div>

        {currentUser.isRoomCreator && (
            <div className="text-center pt-6">
                <button onClick={handleStart} className="w-full md:w-auto md:px-24 py-4 btn-primary text-3xl md:text-4xl font-main rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(239,68,68,0.2)] active:scale-95 uppercase italic">התחל משימה</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SetupScreen;