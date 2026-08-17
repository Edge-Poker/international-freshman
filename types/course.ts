export type ChapterStatus = "nao_iniciado" | "em_andamento" | "concluido";

export interface Chapter {
  slug: string;
  title: string;
  summary: string;
  estMinutes: number;
  isFree?: boolean;
  /** Conteudo em markdown simplificado. Vazio = pendente de ingestao. */
  body?: string;
}

export interface Part {
  slug: string;
  title: string;
  subtitle: string;
  chapters: Chapter[];
}
