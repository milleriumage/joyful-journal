// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId, userId } = await req.json();

    console.log(`[CHECK-PAYMENT] Verificando pagamento ${paymentId} para user ${userId}`);

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Mercado Pago não configurado');
    }

    // Verificar status no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const mpResult = await mpResponse.json();
    console.log('[CHECK-PAYMENT] Status MP:', mpResult.status);

    if (mpResult.status === 'approved') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verificar se já foi processado
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('external_id', paymentId.toString())
        .single();

      if (payment && payment.status !== 'approved') {
        // Atualizar pagamento
        await supabase
          .from('payments')
          .update({ status: 'approved' })
          .eq('external_id', paymentId.toString());

        // Adicionar créditos ao usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single();

        const newCredits = (profile?.credits || 0) + payment.credits_earned;
        
        await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', userId);

        console.log(`[CHECK-PAYMENT] Créditos atualizados: ${newCredits}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: mpResult.status,
      status_detail: mpResult.status_detail
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CHECK-PAYMENT] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
