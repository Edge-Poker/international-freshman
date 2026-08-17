/**
 * Renderizador minimo de markdown (subset: h2, h3, negrito, citacao,
 * tabelas, listas e paragrafos), suficiente para o conteudo do curso sem
 * dependencias extras. Trocar por MDX quando o volume justificar.
 */
export function Markdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n\s*\n/);
  return (
    <div className="reader-prose">
      {blocks.map((block, i) => {
        const b = block.trim();
        if (b.startsWith("## ")) return <h2 key={i}>{inline(b.slice(3))}</h2>;
        if (b.startsWith("### ")) return <h3 key={i}>{inline(b.slice(4))}</h3>;
        // citacao: as frases de destaque do ebook, uma por bloco
        if (b.startsWith("> "))
          return (
            <blockquote key={i}>
              {inline(b.split("\n").map((l) => l.replace(/^>\s?/, "")).join(" "))}
            </blockquote>
          );
        if (b.startsWith("|")) return <Table key={i} raw={b} />;
        if (/^\d+\.\s/.test(b))
          return (
            <ol key={i} className="list-decimal space-y-1 pl-6">
              {b.split("\n").map((l, j) => <li key={j}>{inline(l.replace(/^\d+\.\s/, ""))}</li>)}
            </ol>
          );
        if (b.startsWith("- "))
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {b.split("\n").map((l, j) => <li key={j}>{inline(l.replace(/^-\s/, ""))}</li>)}
            </ul>
          );
        return <p key={i}>{inline(b)}</p>;
      })}
    </div>
  );
}

function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function Table({ raw }: { raw: string }) {
  const rows = raw.split("\n").filter((r) => !/^\|\s*-/.test(r));
  const cells = (r: string) => r.split("|").slice(1, -1).map((c) => c.trim());
  const [head, ...body] = rows;
  // no celular a tabela rola na horizontal em vez de esticar a página
  return (
    <div className="reader-table-wrap">
    <table>
      <thead>
        <tr>{cells(head).map((c, i) => <th key={i}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {body.map((r, i) => (
          <tr key={i}>{cells(r).map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
