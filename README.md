# Bilheteria concorrente

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo | Passo do enunciado |
| :--- | :--- |
| `src/tipos.ts` (pronto) | 1: os tipos |
| `src/regras.ts` | 2: meia-entrada |
| `src/preco.ts` | 3: preço (funcional) |
| `src/dominio.ts` | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts` | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:** <!-- PREENCHER: link do YouTube (não listado) ou Google Drive com acesso "qualquer pessoa com o link" -->

### Integrantes

| Nome | RGM | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- | :--- |
| <!-- PREENCHER: nome completo --> | <!-- PREENCHER: RGM --> | <!-- PREENCHER: @usuario --> | <!-- PREENCHER: ex. domínio/erros --> |
| <!-- PREENCHER: nome completo --> | <!-- PREENCHER: RGM --> | <!-- PREENCHER: @usuario --> | <!-- PREENCHER: ex. preço funcional --> |
| <!-- PREENCHER: nome completo --> | <!-- PREENCHER: RGM --> | <!-- PREENCHER: @usuario --> | <!-- PREENCHER: ex. bilheteria/concorrência --> |
| <!-- PREENCHER: nome completo --> | <!-- PREENCHER: RGM --> | <!-- PREENCHER: @usuario --> | <!-- PREENCHER: ex. servidor/README --> |

### Decisões

1. **Concorrência.** Como vocês garantem que duas pessoas não ficam com a mesma poltrona? Onde estava o
   `await` perigoso?

   A garantia vem da **ordem**: em `src/bilheteria.ts`, o `reservar(pedido)` valida o pedido, acha o
   evento e chama `evento.reservar(poltronas)` **antes** de qualquer `await`. O `Evento.reservar` é
   síncrono: ele confere a lista inteira (vazia, repetida, fora da capacidade, já vendida) e só depois
   marca todas as poltronas, no mesmo bloco de código. Como o Node executa JavaScript em uma linha só,
   não existe outro pedido rodando no meio desse bloco: quando o segundo pedido da mesma poltrona chega,
   ela já está marcada e ele recebe `PoltronaOcupadaErro` (HTTP 409). Não é preciso fila nem trava.

   O `await` perigoso é o do pagamento: `await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs)`.
   Ele é perigoso porque **suspende a função no meio da venda** e deixa o Node atender os outros pedidos.
   Se as poltronas fossem marcadas depois desse `await`, dois pedidos poderiam passar pela conferência
   antes de qualquer um marcar, e os dois seriam cobrados pela mesma poltrona (é exatamente a
   demonstração do item 6 do vídeo). Por isso a marcação vem antes, e o preço (`montarIngressos` /
   `calcularTotal`) também é calculado antes de cobrar.

2. **OO.** O que o `Evento` esconde e por quê? Por que o `reservar` é tudo ou nada? Por que os erros são uma hierarquia de classes?

   O `Evento` esconde as poltronas vendidas no campo privado `#vendidas`. De fora só se lê
   `evento.disponivel` (um `get` calculado: `capacidade - vendidas.length`); não há setter, então
   `evento.disponivel = 999` lança `TypeError`, e ninguém consegue inserir ou remover poltronas sem
   passar pelos métodos. Isso protege o **invariante** do domínio (nunca vender a mesma poltrona duas
   vezes) e deixa a regra em um lugar só.

   O `reservar` é tudo ou nada porque um pedido é uma família comprando junta: se a poltrona 3 já tem
   dono, o pedido inteiro é recusado. Sem isso, a conferência parcial marcaria as poltronas 1 e 2 de um
   pedido que vai falhar na 3, e essas poltronas ficariam presas com um cliente que não comprou nada. A
   implementação confere todas as poltronas primeiro e só depois empurra para `#vendidas`, o que dispensa
   desfazer no meio do caminho.

   Os erros formam uma hierarquia porque todos compartilham o mesmo conceito — falha de negócio com um
   status HTTP — e diferem só no status: `DadosInvalidosErro` (400), `NaoEncontradoErro` (404),
   `PoltronaOcupadaErro` (409) e `PagamentoErro` (502). A base `ErroDeNegocio` guarda o `status`, cada
   filha chama `super(mensagem, <status>)` e nem precisa repetir a lógica. O ganho aparece no
   `servidor.ts`: o tratador de erro testa `erro instanceof ErroDeNegocio` e responde com `erro.status`;
   ele não conhece classe por classe. Criar um erro novo não exige mexer no servidor.

3. **Funcional.** O que ganhamos com `preco.ts` puro? Como vocês testariam ele sem subir o servidor?

   `preco.ts` só tem funções puras: mesma entrada, mesma saída, sem estado interno e sem efeito
   colateral. `valorDoIngresso(precoBase)` e `aplicarTaxa(percentual)` são **fábricas** que devolvem
   funções (como o `criarMultiplicador` da Aula 7), `montarIngressos` usa `map` e `calcularTotal` usa
   `reduce`. Também não mutamos a entrada: o teste congela os objetos com `Object.freeze` e o resultado
   continua correto. O arredondamento `Math.round(valor * 100) / 100` aparece no valor da meia e dentro
   da função devolvida por `aplicarTaxa`, senão `aplicarTaxa(0.1)(100)` viraria
   `110.00000000000001`.

   Com funções puras o teste é direto: importar o módulo e chamar. Em `testes/projeto.ts` os casos de
   preço nem tocam no servidor nem na operadora — `valorDoIngresso(45.5)("meia")` tem que dar `22.75`,
   `calcularTotal` de 50 + 100 tem que dar `165`. Sem rede, sem porta, sem `await`, sem operadora falsa:
   é rápido e o erro aparece na função exata. O mesmo vale para a regra de meia (`regras.ts`), que é
   passada como parâmetro para `montarIngressos` — trocar a política de desconto não exige mexer no
   cálculo.

4. **Se fosse em outro paradigma.** Escolham uma das partes e expliquem como ficaria em outro
   paradigma, e se ficaria melhor ou pior.

   Escolhemos o preço (`preco.ts`) em orientação a objetos. Viraria uma classe `TabelaDePrecos` com
   estado (`precoBase`, `percentualDaTaxa`) e métodos `valor(tipo)`, `montar(pessoas, regra)` e
   `total(ingressos)`. Funcionaria, mas ficaria **pior** para este problema: o cálculo não tem estado
   nem identidade — é transformação de dados —, então a classe só embrulharia funções, criaria um
   objeto a mais para carregar e obrigaria a instanciar/configurar antes de testar. As fábricas atuais
   já dão a configuração (`valorDoIngresso(80)` é "a tabela de preços do evento 1") sem boilerplate, e a
   composição `map`/`reduce` deixa o código declarativo. OO brilha no `Evento`, que tem estado real e
   invariantes a proteger; no preço, o funcional é mais simples de ler e de testar. (O caminho inverso
   também vale: reescrever o `Evento` só com funções e um array solto perderia a proteção do `#vendidas`
   e o tudo ou nada ficaria espalhado por quem chama.)

5. **Concorrente × paralelo.** O Node roda o JavaScript numa linha só: os pedidos de vocês são
   concorrentes, não paralelos. O que mudaria se a venda rodasse em vários núcleos ao mesmo tempo?

   Concorrência aqui é **intercalação**: centenas de pedidos avançam alternando nos pontos de `await`
   (o pagamento), mas um de cada vez. É por isso que o trecho síncrono "confere e marca" do `Evento` é
   atômico de graça e o teste de 200 pedidos passa sem trava. Em paralelo real (vários núcleos, memória
   compartilhada), esse mesmo trecho viraria uma condição de corrida clássica (TOCTOU): duas threads
   poderiam ler `#vendidas` antes de qualquer uma escrever, e as duas venderiam a poltrona 7. O contador
   `#reservaId` também poderia gerar ids repetidos se dois pedidos o incrementassem ao mesmo tempo.

   Para rodar em vários núcleos seria preciso sincronizar de verdade: um `mutex` por evento (ou um
   `Atomics`/compare-and-swap sobre uma estrutura compartilhada), ou serializar as reservas numa fila
   com um único dono da escrita, ou tirar o estado da memória e usar o banco com transação e
   `UNIQUE (evento_id, poltrona)` — nesse caso o banco é quem garante a atomicidade. Também haveria
   ganho de throughput no pagamento (I/O) e custo de coordenação em cada reserva; o tempo limite
   continuaria necessário, mas o cancelamento precisaria lidar com a cobrança que termina depois do
   prazo (hoje o `Promise.race` só devolve o controle; a operadora segue rodando em segundo plano).

### Resultados do bench

Números reais desta entrega (`npm start` + `npm run bench`, máquina do grupo):

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | 386 | 90 | 100 | 10 |
| Extra: evento 2, 60 poltronas (`npm run bench -- 400 2`) | 400 | 701 | 57 | 337 | 6 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram: no cenário padrão são 200 pedidos para as 100 poltronas do evento 1, dois
pedidos por poltrona. Saíram **90 vendas (201)**, **100 recusas por poltrona ocupada (409)** e **10
falhas de pagamento (502)** — 90 + 10 fecham as 100 primeiras tentativas, e as 100 segundas tentativas
levaram 409 porque a poltrona já estava marcada. O evento terminou com `disponivel: 10`: são justamente
as 10 poltronas cujo pagamento falhou, que voltaram para a venda por causa do `liberar` da parte B.
Nenhuma poltrona foi vendida duas vezes e ninguém ficou sem poltrona pagando por ela.

O tempo total foi **386 ms** para 200 pedidos (**~519 pedidos/s**). Em série, com a operadora levando
80 ms por cobrança, 100 cobranças levariam ~8 s; os 386 ms mostram que os pedidos esperam o pagamento
**ao mesmo tempo**, sem um bloquear o outro. No cenário extra (400 pedidos em 60 poltronas) a proporção
se repete: 57 vendas, 337 conflitos de poltrona e 6 falhas de pagamento em 701 ms (~570 pedidos/s) — o
número de vendas nunca passa da capacidade, mesmo com quase 7 pedidos por poltrona.

### Como o projeto está organizado

| Camada | Arquivo | Papel |
| :--- | :--- | :--- |
| Funcional | `src/preco.ts`, `src/regras.ts` | fábricas de preço, `map`/`reduce`, regra de meia sem estado |
| Orientado a objetos | `src/dominio.ts` | hierarquia de erros com `status` e `Evento` com `#vendidas` |
| Concorrente | `src/bilheteria.ts` | marca → calcula → cobra com tempo limite → libera se falhar |
| HTTP | `src/servidor.ts` | `GET /eventos` e `POST /reservas`; `ErroDeNegocio.status` vira o status da resposta |
| Entrada | `src/main.ts` | 3 eventos (id 1 com 100 poltronas), operadora falsa (80 ms, 10% de falha), limite de 500 ms |
