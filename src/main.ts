// Liga as peças: eventos + operadora falsa + bilheteria + servidor HTTP.
import { Evento } from "./dominio.ts";
import { criarBilheteria } from "./bilheteria.ts";
import { criarPagamentoFalso } from "./pagamento.ts";
import { criarServidor } from "./servidor.ts";

// O evento 1 tem 100 poltronas porque é o que o bench usa por padrão.
const eventos = [
  new Evento(1, "Show da Virada", 120, 100),
  new Evento(2, "Festival de Inverno", 80, 60),
  new Evento(3, "Noite do Jazz", 150, 40),
];

// Operadora de outra empresa: demora 80 ms por cobrança e falha 10% das vezes.
const pagar = criarPagamentoFalso({ latenciaMs: 80, taxaDeFalha: 0.1 });

// 500 ms é o tempo máximo que a venda espera a operadora antes de desistir.
const bilheteria = criarBilheteria({ eventos, pagar, limitePagamentoMs: 500 });

const porta = 3000;
criarServidor(bilheteria).listen(porta, () => {
  console.log(`servidor iniciado em http://localhost:${porta}`);
  console.log(`eventos: ${eventos.map((evento) => evento.nome).join(", ")}`);
});
