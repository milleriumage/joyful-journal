import React from 'react';

export interface AIModel {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  personalityEmoji: string;
  furyLevel: number; // 1-5
  catchPhrase: string;
  durationSeconds: number;
  creditsCost: number;
  theme: string;
  tone: string;
  gradientFrom: string;
  gradientTo: string;
}

interface AICardProps {
  model: AIModel;
  onPlay: (model: AIModel) => void;
  disabled?: boolean;
  userCredits: number;
}

export const AICard: React.FC<AICardProps> = ({ model, onPlay, disabled, userCredits }) => {
  const canAfford = userCredits >= model.creditsCost;

  return (
    <div 
      className={`relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        !canAfford ? 'opacity-60' : ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${model.gradientFrom}, ${model.gradientTo})`,
        minHeight: '340px'
      }}
    >
      {/* Hearts decoration */}
      <div className="absolute top-2 left-2 flex gap-1">
        {[...Array(3)].map((_, i) => (
          <span key={i} className="text-white/40 text-xs">♥</span>
        ))}
      </div>

      {/* Logo */}
      <div className="text-center pt-3">
        <h3 
          className="text-lg sm:text-xl font-black text-white/90 drop-shadow-md" 
          style={{ fontFamily: 'cursive' }}
        >
          DR.ia
        </h3>
        <p className="text-white/60 text-[8px] uppercase">- Seu Simulado de Treta -</p>
      </div>

      {/* Fury and Personality Row */}
      <div className="flex justify-between items-center px-3 sm:px-4 mt-2">
        <div className="text-left">
          <p className="text-white/70 text-[8px] sm:text-[9px] font-bold uppercase">Fúria</p>
          <p className="text-white font-black text-xs sm:text-sm uppercase">{model.personality}</p>
          <div className="flex gap-0.5 mt-1">
            {[...Array(5)].map((_, i) => (
              <span 
                key={i} 
                className={`text-[10px] sm:text-xs ${i < model.furyLevel ? 'text-red-400' : 'text-white/30'}`}
              >
                ♥
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/70 text-[8px] sm:text-[9px] font-bold uppercase">Personalidade:</p>
          <p className="text-white font-bold text-[10px] sm:text-xs flex items-center gap-1 justify-end">
            <span>{model.personality}</span>
            <span>{model.personalityEmoji}</span>
          </p>
        </div>
      </div>

      {/* Avatar */}
      <div className="relative flex justify-center my-2 sm:my-3">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-xl bg-gradient-to-b from-white/20 to-transparent">
          <img 
            src={model.avatar} 
            alt={model.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ff69b4"/><circle cx="35" cy="40" r="6" fill="white"/><circle cx="65" cy="40" r="6" fill="white"/><path d="M35 65 Q50 80 65 65" stroke="white" stroke-width="4" fill="none"/></svg>';
            }}
          />
        </div>
        <span className="absolute -bottom-1 text-2xl sm:text-3xl">{model.personalityEmoji}</span>
      </div>

      {/* Name */}
      <p 
        className="text-center text-white text-xl sm:text-2xl font-black italic drop-shadow-md"
        style={{ fontFamily: 'cursive' }}
      >
        {model.name}
      </p>

      {/* Catch Phrase */}
      <div className="mx-3 sm:mx-4 mt-2 sm:mt-3 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-3">
        <p className="text-white text-center text-[10px] sm:text-[11px] font-bold leading-tight">
          "{model.catchPhrase}"
        </p>
      </div>

      {/* Duration and Credits */}
      <div className="flex justify-between items-center px-3 sm:px-4 mt-2 sm:mt-3">
        <div>
          <p className="text-white/60 text-[7px] sm:text-[8px] font-bold uppercase">Duração:</p>
          <p className="text-white font-black text-[10px] sm:text-xs">{model.durationSeconds} SEGUNDOS</p>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-[7px] sm:text-[8px] font-bold uppercase">Créditos</p>
          <div className="flex items-center gap-1 justify-end">
            <span className="text-white text-sm">💎</span>
            <span className="text-white font-black text-base sm:text-lg">{model.creditsCost}</span>
          </div>
        </div>
      </div>

      {/* Play Button */}
      <div className="flex justify-center mt-3 sm:mt-4 pb-3 sm:pb-4">
        <button
          onClick={() => onPlay(model)}
          disabled={disabled || !canAfford}
          className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-black uppercase text-xs sm:text-sm shadow-lg transition-all active:scale-95 ${
            canAfford 
              ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:shadow-xl hover:from-pink-400 hover:to-pink-500'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          {canAfford ? 'PLAY' : 'SEM CRÉDITOS'}
        </button>
      </div>

      {/* Insufficient Credits Warning */}
      {!canAfford && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white/90 px-3 sm:px-4 py-2 rounded-full">
            <p className="text-pink-600 font-black text-[10px] sm:text-xs">Precisa de {model.creditsCost} créditos</p>
          </div>
        </div>
      )}
    </div>
  );
};
