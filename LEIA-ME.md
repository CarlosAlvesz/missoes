# Missões — app de estudos do 1º ano

App para crianças de 6 a 8 anos praticarem leitura, matemática, raciocínio, inglês e ciências.
A criança faz as atividades sozinha; o adulto avalia no fim e acompanha o desempenho num painel.

São 70 habilidades, cada uma em 3 níveis que se ajustam sozinhos ao ritmo da criança, com revisão
espaçada do que ela errou e explicação em toda resposta errada.

Funciona no computador e no celular, instala como aplicativo e roda offline. Não tem anúncio,
não tem compra, não manda dado nenhum para lugar nenhum — a não ser que você ligue a sincronização
no seu próprio banco.

---

## 1. Publicar no GitHub Pages

O app é feito só de arquivos estáticos — não precisa de servidor.

### Se você usa o GitHub pelo terminal

```bash
cd missoes-app
git init
git add -A
git commit -m "Missoes: app de estudos do 1o ano"
gh repo create missoes --public --source=. --push
gh api -X POST repos/:owner/missoes/pages -f "source[branch]=main" -f "source[path]=/"
```

Em um ou dois minutos o app estará em `https://SEU-USUARIO.github.io/missoes/`.

### Se você prefere pelo site

1. Crie um repositório novo em [github.com/new](https://github.com/new), público, chamado `missoes`.
2. Na tela do repositório, clique em **uploading an existing file** e arraste **todo o conteúdo** desta pasta (inclusive as pastas `js`, `icones` e `fontes`).
3. Vá em **Settings → Pages**, em *Source* escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Aguarde o endereço aparecer no topo dessa mesma página.

> O arquivo `.nojekyll` já está incluído e é necessário: sem ele o GitHub ignora algumas pastas.

---

## 2. Instalar como aplicativo

Depois que o endereço estiver no ar, abra-o em cada aparelho.

- **Android (Chrome):** menu ⋮ → **Instalar aplicativo** (ou *Adicionar à tela inicial*).
- **iPhone / iPad (Safari):** botão de compartilhar → **Adicionar à Tela de Início**. No iPhone só funciona pelo Safari.
- **Windows / Mac (Chrome ou Edge):** ícone de instalar na barra de endereço, ou menu ⋮ → **Instalar Missões**.

Depois de instalado, ele abre em tela cheia, com o ícone do foguete, sem barra de navegador — e continua funcionando sem internet.

---

## 3. Ligar a sincronização entre aparelhos

Sem este passo o app já funciona: cada aparelho guarda o seu próprio histórico.
Ative a sincronização para que as quatro crianças e os pais vejam tudo em qualquer aparelho.

### 3.1 Criar o banco

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e clique em **New project**.
   Escolha a região *South America (São Paulo)* e guarde a senha do banco.
2. Com o projeto criado, abra **SQL Editor → New query**, cole o conteúdo inteiro do arquivo
   `schema.sql` desta pasta e clique em **Run**. Deve aparecer *Success*.
3. Vá em **Project Settings → API** e copie os dois valores:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** (uma chave longa)

### 3.2 Apontar o app para o banco

Abra o arquivo `config.js` e preencha:

```js
window.CONFIG = {
  supabaseUrl: "https://abcdefgh.supabase.co",
  supabaseAnonKey: "cole-aqui-a-chave-anon"
};
```

Salve e publique de novo (`git add -A && git commit -m "config" && git push`).

Estes dois valores podem ficar públicos no GitHub. Quem controla o acesso são as regras
de segurança que o `schema.sql` criou: cada pessoa só enxerga os dados da própria família.

### 3.3 Liberar o endereço do app no Supabase

Em **Authentication → URL Configuration**:

- **Site URL**: `https://SEU-USUARIO.github.io/missoes/`
- **Redirect URLs**: adicione a mesma URL.

Sem isso o link de acesso enviado por e-mail volta para o lugar errado.

### 3.4 Criar a família e convidar os outros pais

1. No app, entre em **Adultos** (PIN inicial `1234`) → **Sincronizar entre aparelhos**.
2. Digite seu e-mail e clique em **Receber link de acesso**. Abra o e-mail **no mesmo aparelho** e clique no link.
3. Clique em **Criar minha família** e dê um nome.
4. Vai aparecer um **código** tipo `A1B2-C3D4`. Passe esse código para seus irmãos.
5. Cada um deles abre o app, entra com o próprio e-mail e usa **Entrar na família** com o código.

Pronto: todos os aparelhos passam a ver as mesmas crianças e o mesmo histórico.
As avaliações registram quem avaliou.

> O plano gratuito do Supabase pausa projetos sem uso por uma semana. Se isso acontecer,
> basta entrar no painel e reativar — nenhum dado é perdido.

---

## 4. Como funciona no dia a dia

**Para a criança**

1. Abre o app e toca no próprio avatar.
2. Escolhe uma missão. Cada uma tem 8 perguntas com botão de ouvir o enunciado.
3. Erra sem punição: a resposta certa acende, o app explica o porquê e ela segue.
4. No fim ganha estrelas, e o veículo evolui de patinete até nave espacial.

**Para o adulto**

1. Ao terminar, a criança clica em **Chamar o adulto**.
2. Você marca três coisas: se fez sozinho, como ficou a concentração e uma observação livre.
3. Se não estiver por perto, a atividade fica na fila de *esperando avaliação*.
4. Em **Adultos** você acompanha acerto por área, **o que reforçar**, a fila de revisão e o **relatório da semana**.

**Dificuldade que se ajusta sozinha**

Cada uma das 70 habilidades — sílaba inicial, subtração, memória, cores em inglês, espaço, Brasil
e assim por diante — tem três níveis. Acima de 85% de acerto nas últimas tentativas o nível sobe;
abaixo de 50% ele desce. Isso acontece por habilidade, não por matéria: dá para estar no nível 3 de
soma e no 1 de subtração.

**Revisão espaçada: o erro volta até virar aprendizado**

Errar uma vez e nunca mais ver aquilo não ensina. Por isso o app usa o mesmo princípio do Anki e das
caixinhas de Leitner: quando a criança erra uma habilidade, ela entra numa fila e reaparece já na
próxima missão daquela matéria, marcada com 🔁. A cada acerto o intervalo aumenta — 1 dia, 3 dias,
7 dias, 16 dias — e depois de acertar várias vezes seguidas ela sai da fila.

Cada missão traz no máximo 3 perguntas de revisão, para não virar só correção de erro. A tela inicial
mostra quantas coisas estão na fila, e o painel dos adultos também.

**Quatro jeitos de responder, não só múltipla escolha**

Com 3 alternativas a criança acerta 1 em 3 chutando, sem ler. Por isso o app tem outros formatos:

| Formato | Onde aparece |
|---|---|
| **Escolher** entre alternativas | a maioria das habilidades |
| **Digitar** a resposta num tecladinho | Soma, Subtração, Tabuada e Quanto falta, no nível 3 |
| **Montar** tocando nas peças em ordem | Montar a palavra, Montar a frase, Colocar em ordem |
| **Ligar** os pares | Ligar os pares, Ligar em inglês, Ligar as contas |

Repare no pulo: no nível 3 de Soma ela não escolhe mais entre três números, ela **calcula e digita**.
É outra tarefa mental — e é exatamente a diferença entre reconhecer e saber.

**Explicação quando erra**

Toda pergunta tem um "por quê". Quando a criança erra, além de acender a resposta certa o app mostra
e lê a explicação — `9 − 7 = 2`, `BORBOLETA se separa assim: bor - bo - le - ta` — antes de liberar
o botão de continuar.

**Meta do dia e escudo**

Cada criança tem uma meta de missões por dia (padrão: 2, dá para mudar em Adultos → Crianças).
A cada 5 dias seguidos ela ganha um escudo 🛡️; se um dia ficar em branco, o escudo cobre aquele dia
e a sequência não quebra. Guarda no máximo 2. A ideia é a mesma do *streak freeze* do Duolingo:
perder a sequência por causa de um imprevisto desanima mais do que ensina.

**Sons**

O app faz os próprios sons (não tem nenhum arquivo de áudio: é tudo gerado pelo navegador, então
continua leve e funcionando offline) e vibra no celular. O botão 🔊 no topo liga e desliga tudo,
inclusive a voz — útil em sala de espera, ônibus ou na hora de dormir.

---

## 5. Ajustes que você provavelmente vai querer fazer

| O quê | Onde |
|---|---|
| Trocar o PIN dos adultos | dentro do app, em Adultos → Ajustes |
| Mudar entre LETRA BASTÃO e letra escolar | botão no topo, por criança |
| Adicionar ou remover crianças | Adultos → Crianças |
| Mudar a meta de missões por dia | dentro do app, em Adultos → Crianças |
| Ligar e desligar os sons | botão 🔊 no topo |
| Acrescentar palavras, contas ou perguntas | `js/questoes.js` |
| Mudar cores e tamanhos | `estilo.css` |
| Mudar quantas perguntas tem cada missão | `js/app.js`, constante `NQ` |
| Mudar quantas revisões cabem numa missão | `js/app.js`, constante `MAX_REVISAO` |
| Mudar os intervalos da revisão espaçada | `js/app.js`, constante `ESPERA` |
| Mudar quantas estrelas sobem de nível | `js/app.js`, constante `POR_NIVEL` |
| Mudar os sons | `js/som.js` |

**Esqueceu o PIN dos adultos?** Ele fica guardado no próprio navegador. Abra o app, pressione F12
(ou, no celular, abra num computador), vá em *Application → Local Storage*, procure a chave
`missoes.dados.v2` e leia o campo `cfg.pin`. Se preferir começar do zero, apagar essa chave zera o
app inteiro — inclusive o histórico, então salve o arquivo antes.

Depois de qualquer alteração, aumente o número em `var CACHE = "missoes-v2"` no arquivo `sw.js`
(por exemplo para `missoes-v3`) e publique. Isso força os aparelhos já instalados a pegarem a versão nova.

---

## 6. Arquivos

```
index.html                 telas do app
estilo.css                 aparência, tema claro e escuro
config.js                  onde vão as chaves do banco (opcional)
manifest.webmanifest       faz o navegador tratar como aplicativo
sw.js                      cache offline
schema.sql                 banco de dados, para colar no Supabase
js/questoes.js             o banco de questões, por habilidade e nível
js/app.js                  telas, perfis, níveis, revisão, recompensas, painel
js/som.js                  sons do jogo, gerados pelo navegador
js/sync.js                 sincronização entre aparelhos
testes/testar.js           confere o banco de questões inteiro
testes/interface.js        joga o app num navegador de verdade
icones/                    ícones do app
fontes/                    fonte escolar Andika (SIL Open Font License)
```

Sem sincronização, tudo fica no navegador do aparelho. Em Adultos → Ajustes há
**Salvar histórico em arquivo** e **Abrir arquivo de histórico** para levar os dados na mão.

## 7. Mexer no banco de questões sem quebrar nada

O arquivo `js/questoes.js` tem 70 habilidades. Cada uma é uma função que recebe o nível (1, 2 ou 3)
e devolve uma questão. Depois de mexer nele, rode:

```bash
node testes/testar.js
```

O teste sorteia 2.000 questões de cada habilidade em cada nível e confere que todas têm enunciado,
resposta possível no formato certo, nenhuma alternativa repetida ou vazia, explicação de erro, e
variedade suficiente para a criança não decorar.

Existe um segundo teste, que abre o app num navegador de verdade e **joga**: digita no tecladinho,
monta palavras, liga pares, faz uma missão inteira e entra na área dos adultos. São 32 verificações.

```bash
npm install --no-save playwright
npx playwright install chromium
node testes/interface.js
```

Os dois rodam sozinhos a cada `push`, pelo GitHub Actions. Se algo quebrar, aparece um ✗ vermelho
no GitHub antes de chegar na criança. **Você não precisa rodar nada disso à mão** — é a rede de
proteção para quando alguém (você, eu, ou outra pessoa) mexer no código.

> Se acrescentar uma habilidade nova, o `tag` dela precisa ser único — é a chave do histórico de
> nível de cada criança. O teste reclama se houver repetição.


---

## De onde vieram as ideias

Este app é caseiro, mas as mecânicas não foram inventadas do zero:

- **Revisão espaçada** — caixas de [Leitner](https://pt.wikipedia.org/wiki/Sistema_Leitner) e o
  agendador [FSRS](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)
  usado no Anki. Aqui numa versão bem simplificada, adequada a criança de 6 anos.
- **Níveis por habilidade e progressão suave** — o [GCompris](https://github.com/gcompris/GCompris-qt),
  suíte educativa livre do KDE, com mais de 180 atividades para crianças de 2 a 10 anos.
- **Meta diária, sequência e escudo** — o modelo de hábito do Duolingo (*daily goal* e *streak freeze*).
- **Domínio por habilidade, não por matéria** — o jeito da Khan Academy de mostrar progresso.

## Créditos

Fonte [Andika](https://software.sil.org/andika/), da SIL International, distribuída sob a
SIL Open Font License 1.1 — desenhada para alfabetização, com o `a` e o `g` de uma perna só,
iguais aos do caderno.
