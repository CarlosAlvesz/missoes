# Missões — notas para quem for mexer no código

App estático de estudos do 1º ano. **Sem framework, sem build, sem servidor.**
Publicar = dar push (GitHub Pages serve a raiz). O dono do projeto não é programador.

## Antes de terminar qualquer alteração

```bash
node testes/testar.js      # banco de questões (rápido, sem dependências)
node testes/interface.js   # joga o app num navegador de verdade
```

O segundo precisa de `npm install --no-save playwright && npx playwright install chromium`.
Os dois rodam no GitHub Actions a cada push. **Não considere um trabalho pronto sem os dois verdes.**

## Regras que não podem ser quebradas

- **Nada de framework nem etapa de build.** Tem de continuar sendo possível publicar arrastando
  arquivos. JavaScript simples, compatível com navegador de celular antigo (`var`, sem `=>`
  nos arquivos servidos).
- **O `tag` de cada habilidade é chave de dados.** Renomear um `tag` em `js/questoes.js` apaga o
  histórico de nível e a fila de revisão daquela habilidade em todas as crianças. Só renomeie com
  migração; acrescentar é sempre seguro.
- **Nada de `innerHTML` com texto que veio de pessoa** (nome de criança, e-mail, observação).
  Use `el()` e `frase()/neg()` em `js/app.js`.
- **Toda questão precisa de `porque`** — é a explicação mostrada quando a criança erra. O teste falha
  sem isso.
- **Ao mexer em qualquer arquivo servido, suba o `CACHE` em `sw.js`** (`missoes-v3` → `missoes-v4`),
  senão quem já instalou continua com a versão velha.
- **Sem anúncio, sem rastreamento, sem rede obrigatória.** O app tem de funcionar inteiro offline.

## Onde fica o quê

| Assunto | Arquivo |
|---|---|
| Perguntas, por habilidade e nível | `js/questoes.js` |
| Telas, revisão espaçada, níveis, painel | `js/app.js` |
| Sons (gerados por Web Audio, sem arquivo) | `js/som.js` |
| Sincronização opcional (Supabase) | `js/sync.js` |
| Aparência, tema claro e escuro | `estilo.css` |

## Como uma questão funciona

Cada habilidade é `{tag, area, fn(nivel)}` e devolve um objeto. O campo `formato` decide o desenho:

- ausente → múltipla escolha (`ops: [{t,ok}]`)
- `"digitar"` → tecladinho de números (`resposta: "12"`)
- `"ordenar"` → tocar nas peças em ordem (`certo: [...]`, `pecas: [...]`)
- `"ligar"` → ligar pares (`pares: [[a,b],...]`)

`QUESTOES.jogavel(q)` valida cada formato; `QUESTOES.gerar(tag,nivel)` é o que a revisão e o
modo treinar usam.

## Gancho de teste

`window.__teste(tag,nivel)` e `window.__q()` só existem quando a página abre com `?teste=1`.
Servem para os testes alcançarem um formato específico sem jogar dezenas de missões.
Não use isso em código de produção.

## Sobre o conteúdo

O teste exige no mínimo 10 perguntas distintas por habilidade e nível (`MIN_VARIEDADE`). Abaixo
disso a criança decora a resposta em poucos dias — foi o maior problema da primeira versão.
Ao acrescentar habilidade, escreva conteúdo para os três níveis.
