// A venda: aqui a concorrência aparece.
// O ponto central é que as poltronas são marcadas ANTES do await do pagamento.
import type { Comprovante, ConfigBilheteria, EventoInfo, Pedido } from "./tipos.ts";
import type { Evento } from "./dominio.ts";
import type { Pagamento } from "./pagamento.ts";
import { DadosInvalidosErro, NaoEncontradoErro, PagamentoErro } from "./dominio.ts";
import { direitoAMeia } from "./regras.ts";
import { calcularTotal, montarIngressos } from "./preco.ts";

// Corre a cobrança contra o relógio: quem terminar primeiro decide o resultado.
// O finally desliga o timer quando a cobrança termina antes do limite.
function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("tempo esgotado")), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export class Bilheteria {
  // Tudo em campos privados: ninguém de fora troca a operadora, o limite
  // ou os eventos por baixo dos panos (como no Evento da Aula 4).
  #eventos: Evento[];
  #pagar: Pagamento;
  #limitePagamentoMs: number;
  #reservaId = 0;

  constructor(config: ConfigBilheteria) {
    this.#eventos = config.eventos;
    this.#pagar = config.pagar;
    this.#limitePagamentoMs = config.limitePagamentoMs;
  }

  listarEventos(): EventoInfo[] {
    return this.#eventos.map((evento) => evento.info());
  }

  async reservar(pedido: Pedido): Promise<Comprovante> {
    // 1. Confere o pedido antes de qualquer cobrança.
    if (!pedido || !Array.isArray(pedido.ingressos) || pedido.ingressos.length === 0) {
      throw new DadosInvalidosErro("o pedido não tem ingressos");
    }

    const evento = this.#eventos.find((e) => e.id === pedido.eventoId);
    if (!evento) {
      throw new NaoEncontradoErro(`evento ${pedido.eventoId} não encontrado`);
    }

    // 2. Marca as poltronas ANTES do await. Enquanto este pedido espera a
    //    operadora, outro pedido que queira a mesma poltrona já leva 409:
    //    ninguém fica com a poltrona de outro. Os erros de poltrona
    //    (DadosInvalidosErro/PoltronaOcupadaErro) saem daqui, sem cobrar.
    const poltronas = pedido.ingressos.map((pessoa) => pessoa.poltrona);
    evento.reservar(poltronas);

    // 3. Preço é funcional: monta os ingressos e soma com a taxa.
    const ingressos = montarIngressos(evento.preco, pedido.ingressos, direitoAMeia);
    const total = calcularTotal(ingressos);

    // 4. Cobra, mas não para sempre: o relógio devolve o controle.
    try {
      await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs);
    } catch (erro) {
      // 5. Deu erro ou estourou o tempo: devolve as poltronas e avisa o cliente.
      evento.liberar(poltronas);
      const motivo = erro instanceof Error ? erro.message : "erro na operadora";
      throw new PagamentoErro(`pagamento não aprovado: ${motivo}`);
    }

    // 6. Aprovado: comprovante com um reservaId diferente a cada venda.
    this.#reservaId += 1;
    return {
      reservaId: this.#reservaId,
      eventoId: evento.id,
      ingressos,
      total,
    };
  }
}

export function criarBilheteria(config: ConfigBilheteria): Bilheteria {
  return new Bilheteria(config);
}
