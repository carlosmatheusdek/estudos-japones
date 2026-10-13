# Marugoto A2 · Vocabulário e Kanji

Sistema de memorização do vocabulário e dos kanji do **Marugoto Elementary 2 (A2)**, livros *Katsudō* e *Rikai*, organizado por lição e com repetição espaçada. É HTML, CSS e JavaScript puros, sem build: basta publicar no GitHub Pages.

## Como usar

1. Marque uma ou mais lições e escolha **Vocabulário**, **Kanji** ou **Ambos**.
2. **Aprender**: as palavras novas vêm em lotes. Primeiro cada uma aparece num cartão; depois vem um teste rápido, e os erros voltam para a fila até você acertar.
3. **Revisar**: mostra os itens com revisão vencida. Depois de cada acerto você avalia **Difícil / Bom / Fácil**, e o intervalo até a próxima revisão cresce (1 dia → 3 → 7 → …). Se errar, o item volta na mesma sessão.

O exercício fica mais difícil conforme você domina a palavra:

| Estágio | Vocabulário | Kanji |
|---|---|---|
| Aprendendo | japonês → significado (múltipla escolha) | significado ou leitura (múltipla escolha) |
| Em revisão (1–6 dias) | português → japonês, áudio → significado | leitura, escolher o kanji certo |
| Madura (7+ dias) | **digitar** a palavra em kana | **digitar** a leitura |

Na digitação, dá para escrever em romaji (`kaimono` vira かいもの automaticamente) ou usar o teclado japonês.

O progresso fica no `localStorage` do navegador. Em ⚙️ Configurações é possível exportar e importar um backup em JSON, que também serve para passar o progresso para outro aparelho.

## Estrutura

```
index.html
css/style.css
js/app.js        interface e sessões de estudo
js/srs.js        algoritmo de repetição espaçada (SM-2 simplificado)
js/kana.js       conversão romaji → kana e normalização de respostas
data/lessons.js  vocabulário e kanji por lição
data/kanji.js    leituras on/kun e significado de cada kanji
```

Para acrescentar palavras, edite `data/lessons.js`. O formato está descrito no topo do arquivo.

## Rodar localmente

```bash
python -m http.server 8765
```

Depois é só abrir http://localhost:8765.

## Publicar no GitHub Pages

Em *Settings → Pages* do repositório, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.

> Os PDFs em `livros/` estão no `.gitignore`: são material com direitos autorais e não devem ir para o repositório.
