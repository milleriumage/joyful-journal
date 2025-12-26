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
    const { userId, amount = 1 } = await req.json();

    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    console.log(`[CONSUME-CREDIT] Consumindo ${amount} crédito(s) do usuário ${userId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar créditos atuais
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('[CONSUME-CREDIT] Erro ao buscar perfil:', fetchError);
      throw new Error('Perfil não encontrado');
    }

    const currentCredits = profile?.credits || 0;

    if (currentCredits < amount) {
      console.log(`[CONSUME-CREDIT] Créditos insuficientes: ${currentCredits} < ${amount}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Créditos insuficientes',
        currentCredits,
        required: amount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newCredits = currentCredits - amount;

    // Atualizar créditos no banco
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('[CONSUME-CREDIT] Erro ao atualizar créditos:', updateError);
      throw new Error('Erro ao atualizar créditos');
    }

    console.log(`[CONSUME-CREDIT] Créditos atualizados: ${currentCredits} -> ${newCredits}`);

    return new Response(JSON.stringify({
      success: true,
      previousCredits: currentCredits,
      newCredits,
      consumed: amount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CONSUME-CREDIT] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
