/* =========================================================
   Configuração da sincronização entre aparelhos.

   Deixe os dois campos vazios e o app funciona normalmente,
   guardando tudo só no aparelho onde foi usado.

   Para sincronizar celular e computador, siga o LEIA-ME.md
   e cole aqui os dois valores do seu projeto no Supabase.

   Estes dois valores podem ficar públicos: quem manda no acesso
   são as regras do banco (schema.sql), não estes campos. A chave
   aqui é a PUBLICÁVEL (sb_publishable_...). A chave secreta
   (sb_secret_...) nunca pode vir para cá: este arquivo é público.
   ========================================================= */
window.CONFIG = {
  supabaseUrl: "https://ewppmgwyinybksmoshtd.supabase.co",
  supabaseAnonKey: "sb_publishable_yH47OHZaiN-xVTMFoX_Pyg_68mo9xL2"
};
