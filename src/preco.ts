// Paradigma funcional: só funções puras, sem estado mutável e sem laços.
import type { Ingresso, Pessoa, TipoIngresso } from "./tipos.ts";

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

// Fábrica: recebe o preço base e devolve uma função que calcula o valor pelo tipo.
export function valorDoIngresso(precoBase: number) {
  return (tipo: TipoIngresso): number => {
    const valor = tipo === "meia" ? precoBase / 2 : precoBase;
    return arredondar(valor);
  };
}

// Fábrica: recebe o percentual e devolve uma função que soma a taxa ao valor.
export function aplicarTaxa(percentual: number) {
  return (valor: number): number => arredondar(valor * (1 + percentual));
}

// Cria um ingresso por pessoa, na mesma ordem, usando a regra de meia recebida.
export function montarIngressos(
  precoBase: number,
  pessoas: Pessoa[],
  temDireitoAMeia: (pessoa: Pessoa) => boolean,
): Ingresso[] {
  return pessoas.map((pessoa) => {
    const tipo: TipoIngresso = temDireitoAMeia(pessoa) ? "meia" : "inteira";
    return {
      nome: pessoa.nome,
      poltrona: pessoa.poltrona,
      tipo,
      valor: valorDoIngresso(precoBase)(tipo),
    };
  });
}

// Soma os ingressos e aplica a taxa de serviço de 10%.
export function calcularTotal(ingressos: Ingresso[]): number {
  const soma = ingressos.reduce((total, ingresso) => total + ingresso.valor, 0);
  return aplicarTaxa(0.1)(soma);
}
