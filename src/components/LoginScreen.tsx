import React, { useState } from 'react';
import logoImg from '../assets/icon.png';

interface LoginScreenProps {
  onLogin: (email: string, name: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('שם הסוכן חייב להכיל לפחות 2 אותיות.');
      return;
    }
    setError('');
    onLogin(email || `${name}@local.game`, name);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6" dir="rtl">
      {/* Added mx-auto here to ensure the max-width container stays centered */}
      <div className="w-full max-w-lg flex flex-col items-center mx-auto">

        <h1 className="text-5xl md:text-6xl font-title text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] leading-tight text-center mb-6">
          שם קוד בעברית
        </h1>

        <div className="w-full relative flex flex-col items-center">
          <div className="relative z-10 -mb-12 md:-mb-14">
            <img
              src={logoImg}
              alt="CodeNames Logo"
              className="w-20 md:w-24 h-auto rounded-full drop-shadow-[0_0_15px_rgb(0,0,0)] mx-auto"
            />
          </div>

          <div className="w-full game-card-bg pt-16 md:pt-18 pb-6 md:pb-8 px-6 md:px-8 rounded-2xl md:rounded-3xl relative border-t-4 border-t-red-500 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4 md:space-y-5">
                {error && (
                  <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-3 md:p-4 rounded-xl text-center font-main font-bold text-lg md:text-xl animate-pulse">
                    {error}
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <label className="block text-sm md:text-base font-main font-bold text-gray-400 mb-1.5 md:mb-2 uppercase tracking-wide text-center">זיהוי סוכן</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full input-standard text-center text-xl md:text-2xl py-2 md:py-3 font-main rounded-xl transition-all"
                    placeholder="הכניסו שם..."
                    required
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="block text-xs md:text-sm font-main font-bold text-gray-500 mb-1.5 md:mb-2 uppercase tracking-wide text-center">כתובת תקשורת (אופציונלי)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full input-standard text-center text-base md:text-lg py-2 md:py-3 font-placeholder rounded-xl"
                    placeholder="agent@network.io"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 md:py-4 btn-primary text-2xl md:text-3xl font-main tracking-widest rounded-xl shadow-lg hover:shadow-red-500/20 active:scale-[0.98]">
                כניסה למערכת
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;