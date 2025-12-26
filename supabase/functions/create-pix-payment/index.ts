// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { credits, amount, userEmail, userId } = await req.json();

    console.log(`[CREATE-PIX] Iniciando pagamento: ${credits} créditos, R$${amount}, user: ${userEmail}`);

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('[CREATE-PIX] MERCADOPAGO_ACCESS_TOKEN não configurado');
      throw new Error('Mercado Pago não configurado');
    }

    // Criar pagamento PIX no Mercado Pago
    const paymentData = {
      transaction_amount: amount,
      description: `${credits} créditos DR ARENA`,
      payment_method_id: 'pix',
      payer: {
        email: userEmail,
        first_name: 'Usuario',
        last_name: 'DrArena',
        identification: {
          type: 'CPF',
          number: '00000000000'
        }
      },
      metadata: {
        user_id: userId,
        credits: credits
      }
    };

    console.log('[CREATE-PIX] Enviando request para Mercado Pago...');

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': `${userId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    const mpResult = await mpResponse.json();
    console.log('[CREATE-PIX] Resposta do Mercado Pago:', JSON.stringify(mpResult, null, 2));

    if (!mpResponse.ok) {
      console.error('[CREATE-PIX] Erro na API do Mercado Pago:', mpResult);
      throw new Error(mpResult.message || 'Erro ao criar pagamento');
    }

    // Salvar pagamento pendente no banco
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase.from('payments').insert({
      user_id: userId,
      amount: amount,
      credits_earned: credits,
      status: 'pending',
      external_id: mpResult.id.toString(),
      payment_method: 'pix'
    });

    if (dbError) {
      console.error('[CREATE-PIX] Erro ao salvar pagamento:', dbError);
    }

    const pixData = mpResult.point_of_interaction?.transaction_data;

    console.log('[CREATE-PIX] Pagamento criado com sucesso. ID:', mpResult.id);

    return new Response(JSON.stringify({
      success: true,
      payment_id: mpResult.id,
      qr_code: pixData?.qr_code || null,
      qr_code_base64: pixData?.qr_code_base64 || null,
      ticket_url: pixData?.ticket_url || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CREATE-PIX] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
