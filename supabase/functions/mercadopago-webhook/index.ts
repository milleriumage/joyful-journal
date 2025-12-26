// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const data = JSON.parse(body);
    
    console.log('[WEBHOOK] Received:', JSON.stringify(data));

    // Verificar se é uma notificação de pagamento
    if (data.type === 'payment' && data.action === 'payment.updated') {
      const paymentId = data.data?.id;
      
      if (!paymentId) {
        console.log('[WEBHOOK] No payment ID found');
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[WEBHOOK] Processing payment ${paymentId}`);

      const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!accessToken) {
        throw new Error('Mercado Pago não configurado');
      }

      // Buscar detalhes do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const payment = await mpResponse.json();
      console.log('[WEBHOOK] Payment status:', payment.status);

      if (payment.status === 'approved') {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar pagamento no banco
        const { data: dbPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('external_id', paymentId.toString())
          .single();

        if (dbPayment && dbPayment.status !== 'approved') {
          console.log(`[WEBHOOK] Updating payment and credits for user ${dbPayment.user_id}`);
          
          // Atualizar status do pagamento
          await supabase
            .from('payments')
            .update({ status: 'approved' })
            .eq('external_id', paymentId.toString());

          // Adicionar créditos ao usuário
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', dbPayment.user_id)
            .single();

          const newCredits = (profile?.credits || 0) + dbPayment.credits_earned;
          
          await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', dbPayment.user_id);

          console.log(`[WEBHOOK] Credits updated: ${profile?.credits || 0} -> ${newCredits}`);
        } else if (dbPayment?.status === 'approved') {
          console.log('[WEBHOOK] Payment already processed');
        } else {
          console.log('[WEBHOOK] Payment not found in database');
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Sempre retornar 200 para o Mercado Pago não reenviar
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
