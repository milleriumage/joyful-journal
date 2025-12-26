import React from 'react';
import { AICard, AIModel } from './AICard';

// Modelos de IA pré-configurados
export const AI_MODELS: AIModel[] = [
  {
    id: 'maya',
    name: 'Maya',
    avatar: '/src/assets/ai-avatar.png',
    personality: 'Furiosa',
    personalityEmoji: '😤',
    furyLevel: 5,
    catchPhrase: 'NÃO ADIANTA ME OLHAR ASSIM. SE VOCÊ NÃO SABE QUE FEZ, EU É QUE NÃO VOU FALAR!',
    durationSeconds: 100,
    creditsCost: 50,
    theme: 'Discussão de relacionamento',
    tone: 'furious',
    gradientFrom: '#1e3a5f',
    gradientTo: '#2d5a87'
  },
  {
    id: 'kelly',
    name: 'Kelly',
    avatar: '/src/assets/ai-avatar.png',
    personality: 'Engraçada',
    personalityEmoji: '😜',
    furyLevel: 3,
    catchPhrase: 'VOCÊ COMEU MEU ÚLTIMO COOKIE? AGORA VOU TE EXCLUIR DA FAMÍLIA DO NETFLIX!',
    durationSeconds: 90,
    creditsCost: 35,
    theme: 'Comer o lanche do outro',
    tone: 'funny',
    gradientFrom: '#f8b4c4',
    gradientTo: '#ffd6e0'
  },
  {
    id: 'luna',
    name: 'Luna',
    avatar: '/src/assets/ai-avatar.png',
    personality: 'Dramática',
    personalityEmoji: '🎭',
    furyLevel: 4,
    catchPhrase: 'EU NÃO ACREDITO QUE VOCÊ FEZ ISSO COMIGO! MINHA VIDA ESTÁ ARRUINADA!',
    durationSeconds: 120,
    creditsCost: 60,
    theme: 'Drama intenso',
    tone: 'dramatic',
    gradientFrom: '#6b21a8',
    gradientTo: '#9333ea'
  },
  {
    id: 'nina',
    name: 'Nina',
    avatar: '/src/assets/ai-avatar.png',
    personality: 'Sarcástica',
    personalityEmoji: '🙄',
    furyLevel: 2,
    catchPhrase: 'Ah claro, porque você é perfeito, né? Parabéns pela sua incrível capacidade de errar.',
    durationSeconds: 80,
    creditsCost: 30,
    theme: 'Sarcasmo e ironia',
    tone: 'sarcastic',
    gradientFrom: '#059669',
    gradientTo: '#10b981'
  },
  {
    id: 'zara',
    name: 'Zara',
    avatar: '/src/assets/ai-avatar.png',
    personality: 'Explosiva',
    personalityEmoji: '🔥',
    furyLevel: 5,
    catchPhrase: 'VOCÊ DEIXOU A TAMPA DO VASO LEVANTADA DE NOVO?! É GUERRA!',
    durationSeconds: 60,
    creditsCost: 25,
    theme: 'Brigas domésticas',
    tone: 'furious',
    gradientFrom: '#dc2626',
    gradientTo: '#ef4444'
  },
  {
    id: 'bibi',
    name: 'Bibi',
    avatar: '/src/assets/ai-avatar.png',
    personality: 'Chorona',
    personalityEmoji: '😢',
    furyLevel: 3,
    catchPhrase: 'Tá bom, vai, ignora meus sentimentos mesmo... Eu estou acostumada...',
    durationSeconds: 100,
    creditsCost: 40,
    theme: 'Chantagem emocional',
    tone: 'dramatic',
    gradientFrom: '#3b82f6',
    gradientTo: '#60a5fa'
  }
];

interface CardsSectionProps {
  onPlayCard: (model: AIModel) => void;
  userCredits: number;
  isLoading?: boolean;
}

export const CardsSection: React.FC<CardsSectionProps> = ({ 
  onPlayCard, 
  userCredits, 
  isLoading 
}) => {
  return (
    <div className="h-full overflow-y-auto p-6 pb-20">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 
          className="text-3xl font-black text-pink-500 drop-shadow-md" 
          style={{ fontFamily: 'cursive' }}
        >
          Escolha sua Adversária
        </h2>
        <p className="text-pink-400 text-sm mt-2">
          Cada modelo tem seu estilo único de discussão
        </p>
        <div className="flex justify-center gap-1 mt-3">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="text-pink-300 text-xs animate-pulse">♥</span>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {AI_MODELS.map((model) => (
          <AICard
            key={model.id}
            model={model}
            onPlay={onPlayCard}
            disabled={isLoading}
            userCredits={userCredits}
          />
        ))}
      </div>

      {/* Info Footer */}
      <div className="text-center mt-8 text-pink-400 text-xs">
        <p>💎 Créditos são consumidos ao iniciar a interação</p>
        <p className="mt-1">⏱️ O tempo varia de acordo com cada modelo</p>
      </div>
    </div>
  );
};
