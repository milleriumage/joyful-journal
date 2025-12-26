import React from 'react';

interface SidebarProps {
  activeTab: 'cards' | 'create' | 'call' | 'credits';
  onTabChange: (tab: 'cards' | 'create' | 'call' | 'credits') => void;
  onLogout: () => void;
  credits: number;
}

const menuItems = [
  { id: 'cards' as const, label: 'Cards', icon: '🎴' },
  { id: 'create' as const, label: 'Config', icon: '⚙️' },
  { id: 'call' as const, label: 'Call', icon: '📞' },
  { id: 'credits' as const, label: 'Créditos', icon: '💰' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onLogout, credits }) => {
  return (
    <div className="w-64 h-full bg-gradient-to-b from-pink-50 via-pink-100 to-pink-200 flex flex-col shadow-xl border-r border-pink-200">
      {/* Logo */}
      <div className="p-6 text-center">
        <h1 
          className="text-4xl font-black text-pink-500 tracking-tight drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]" 
          style={{ fontFamily: 'cursive' }}
        >
          DR.ia
        </h1>
        <p className="text-pink-400 text-[10px] uppercase font-bold tracking-widest mt-1">
          - Seu Simulado de Treta -
        </p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              activeTab === item.id
                ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-lg shadow-pink-300/50 scale-[1.02]'
                : 'bg-white/60 text-pink-600 hover:bg-white hover:shadow-md'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'credits' && (
              <span className="ml-auto bg-pink-200 text-pink-600 text-xs px-2 py-1 rounded-full font-black">
                {credits}
              </span>
            )}
          </button>
        ))}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-lg bg-white/40 text-pink-500 hover:bg-white/70 hover:text-pink-600 transition-all duration-300 mt-4"
        >
          <span className="text-2xl">🚪</span>
          <span>Deslogar</span>
        </button>
      </nav>

      {/* Footer Decoration */}
      <div className="p-4 text-center">
        <div className="flex justify-center gap-1">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="text-pink-300 text-sm">♥</span>
          ))}
        </div>
      </div>
    </div>
  );
};
