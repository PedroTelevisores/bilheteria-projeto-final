// Paradigma orientado a objetos: erros com herança e o Evento com estado privado.
import type { EventoInfo } from "./tipos.ts";

// Base de todos os erros de negócio: cada um carrega o status HTTP da resposta.
export abstract class ErroDeNegocio extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
    this.name = new.target.name;
  }
}

export class DadosInvalidosErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

export class NaoEncontradoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 404);
  }
}

export class PoltronaOcupadaErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 409);
  }
}

export class PagamentoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 502);
  }
}

export class Evento {
  readonly id: number;
  readonly nome: string;
  readonly preco: number;
  readonly capacidade: number;
  // Lista privada: ninguém de fora lê nem altera as poltronas vendidas.
  #vendidas: number[] = [];

  constructor(id: number, nome: string, preco: number, capacidade: number) {
    this.id = id;
    this.nome = nome;
    this.preco = preco;
    this.capacidade = capacidade;
  }

  get disponivel(): number {
    return this.capacidade - this.#vendidas.length;
  }

  // Tudo ou nada: confere a lista inteira antes de marcar qualquer poltrona.
  reservar(poltronas: number[]): void {
    if (poltronas.length === 0) {
      throw new DadosInvalidosErro("o pedido não tem poltronas");
    }

    const repetida = poltronas.some(
      (poltrona, indice) => poltronas.indexOf(poltrona) !== indice,
    );
    if (repetida) {
      throw new DadosInvalidosErro("poltrona repetida no mesmo pedido");
    }

    const invalida = poltronas.some(
      (poltrona) =>
        !Number.isInteger(poltrona) || poltrona < 1 || poltrona > this.capacidade,
    );
    if (invalida) {
      throw new DadosInvalidosErro("poltrona fora de 1 até a capacidade");
    }

    const ocupada = poltronas.some((poltrona) => this.#vendidas.includes(poltrona));
    if (ocupada) {
      throw new PoltronaOcupadaErro("a poltrona já foi vendida");
    }

    poltronas.forEach((poltrona) => this.#vendidas.push(poltrona));
  }

  // Devolve as poltronas para a venda; todas precisam estar vendidas.
  liberar(poltronas: number[]): void {
    const repetida = poltronas.some(
      (poltrona, indice) => poltronas.indexOf(poltrona) !== indice,
    );
    if (repetida) {
      throw new DadosInvalidosErro("poltrona repetida ao liberar");
    }

    const invalida = poltronas.some(
      (poltrona) => !Number.isInteger(poltrona) || !this.#vendidas.includes(poltrona),
    );
    if (invalida) {
      throw new DadosInvalidosErro("a poltrona não estava vendida");
    }

    this.#vendidas = this.#vendidas.filter((poltrona) => !poltronas.includes(poltrona));
  }

  info(): EventoInfo {
    return {
      id: this.id,
      nome: this.nome,
      preco: this.preco,
      capacidade: this.capacidade,
      disponivel: this.disponivel,
    };
  }
}
