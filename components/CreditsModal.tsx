import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  currentCredits: number;
  onCreditsUpdate: (newCredits: number) => void;
}

const CREDIT_PACKAGES = [
  { credits: 100, price: 5 },
  { credits: 250, price: 10 },
  { credits: 500, price: 18 },
  { credits: 1000, price: 30 }
];

export const CreditsModal: React.FC<CreditsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentCredits,
  onCreditsUpdate
}) => {
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[0]);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code: string | null;
    qr_code_base64: string | null;
    payment_id: string | null;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let interval: number;
    if (pixData?.payment_id) {
      interval = window.setInterval(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('check-payment-status', {
            body: { paymentId: pixData.payment_id, userId }
          });
          
          if (data?.status === 'approved') {
            setPaymentStatus('approved');
            const { data: profile } = await supabase
              .from('profiles')
              .select('credits')
              .eq('id', userId)
              .single();
            
            if (profile) {
              onCreditsUpdate(profile.credits || 0);
            }
            clearInterval(interval);
          }
        } catch (e) {
          console.error('Erro ao verificar pagamento:', e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [pixData?.payment_id, userId, onCreditsUpdate]);

  const handleGeneratePix = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          credits: selectedPackage.credits,
          amount: selectedPackage.price,
          userEmail,
          userId
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        setPixData({
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          payment_id: data.payment_id
        });
      } else {
        alert(data?.error || 'Erro ao gerar PIX');
      }
    } catch (e: any) {
      console.error('Erro:', e);
      alert('Erro ao gerar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setPixData(null);
    setPaymentStatus('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-blue-500 uppercase">Créditos</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase mt-1">
              Saldo atual: {currentCredits} créditos
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {paymentStatus === 'approved' ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-black text-green-500 uppercase">Pagamento Aprovado!</h3>
              <p className="text-slate-400 text-sm mt-2">Seus créditos foram adicionados</p>
              <button 
                onClick={handleClose}
                className="mt-6 bg-green-600 px-8 py-3 rounded-2xl font-black uppercase text-sm"
              >
                Fechar
              </button>
            </div>
          ) : pixData ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-4">
                  Escaneie o QR Code ou copie o código
                </p>
                {pixData.qr_code_base64 && (
                  <div className="bg-white p-4 rounded-2xl inline-block mb-4">
                    <img 
                      src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                      alt="QR Code PIX" 
                      className="w-48 h-48"
                    />
                  </div>
                )}
              </div>
              
              <button
                onClick={handleCopyPix}
                className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all"
              >
                {copied ? '✓ COPIADO!' : 'COPIAR CÓDIGO PIX'}
              </button>

              <p className="text-center text-[9px] text-slate-500 font-black uppercase animate-pulse">
                Aguardando pagamento...
              </p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase text-slate-500">
                Selecione um pacote
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CREDIT_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.credits}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-4 rounded-2xl border transition-all ${
                      selectedPackage.credits === pkg.credits
                        ? 'bg-blue-600 border-blue-400 scale-105'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className="text-2xl block mb-1">💎</span>
                    <span className="text-lg font-black block">{pkg.credits}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase">
                      R$ {pkg.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleGeneratePix}
                disabled={loading}
                className="w-full bg-green-600 py-5 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'GERANDO...' : `PAGAR R$ ${selectedPackage.price.toFixed(2)} COM PIX`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
