import React, { useState } from 'react';

interface ConfigSectionProps {
  onStartSession: (config: { duration: number; theme: string; personality: string }) => void;
}

const personalities = [
  { id: 'sarcastico', label: 'SARCÁSTICO', emoji: '🙄', color: 'bg-yellow-400' },
  { id: 'furioso', label: 'FURIOSO', emoji: '🤬', color: 'bg-pink-200' },
  { id: 'engracado', label: 'ENGRAÇADO', emoji: '🤣', color: 'bg-pink-200' },
  { id: 'dramatico', label: 'DRAMÁTICO', emoji: '🥺', color: 'bg-pink-200' },
];

export const ConfigSection: React.FC<ConfigSectionProps> = ({ onStartSession }) => {
  const [duration, setDuration] = useState(3);
  const [theme, setTheme] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState('sarcastico');

  const handleStart = () => {
    if (!theme.trim()) {
      alert('Por favor, insira o motivo do barraco!');
      return;
    }
    onStartSession({
      duration,
      theme,
      personality: selectedPersonality,
    });
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-pink-50 via-pink-100 to-pink-200 p-8 overflow-y-auto">
      <h1 
        className="text-4xl font-black text-pink-500 italic mb-8"
        style={{ fontFamily: 'cursive' }}
      >
        CONFIGURAÇÃO
      </h1>

      {/* Duration Slider */}
      <div className="mb-8">
        <label className="text-pink-500 text-xs font-bold uppercase tracking-wider mb-2 block">
          Duração (Minutos)
        </label>
        <div className="relative">
          <input
            type="range"
            min="1"
            max="10"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full h-2 bg-pink-300 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <span className="absolute right-0 -top-1 text-pink-500 text-xs font-bold">
            {duration} MIN
          </span>
        </div>
      </div>

      {/* Theme Input */}
      <div className="mb-8">
        <label className="text-pink-500 text-xs font-bold uppercase tracking-wider mb-2 block">
          O Motivo do Barraco
        </label>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Ex: Ele esqueceu nosso aniversário..."
          className="w-full p-4 rounded-xl bg-white border-2 border-pink-200 text-pink-600 placeholder-pink-300 focus:outline-none focus:border-pink-400 font-medium"
        />
      </div>

      {/* Personality Selection */}
      <div className="space-y-3 mb-8">
        {personalities.map((personality) => (
          <button
            key={personality.id}
            onClick={() => setSelectedPersonality(personality.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
              selectedPersonality === personality.id
                ? 'bg-yellow-400 shadow-lg scale-[1.02]'
                : 'bg-pink-200/60 hover:bg-pink-200'
            }`}
          >
            <span className="w-12 h-12 flex items-center justify-center bg-pink-100 rounded-full text-2xl">
              {personality.emoji}
            </span>
            <span className="font-black text-pink-700 tracking-wider">
              {personality.label}
            </span>
          </button>
        ))}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="w-full py-5 rounded-2xl bg-gradient-to-r from-pink-400 to-pink-500 text-white font-black text-lg tracking-widest uppercase shadow-lg shadow-pink-300/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
      >
        ENTRAR NO RINGUE
      </button>
    </div>
  );
};
