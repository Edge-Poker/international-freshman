/** Grade de fotos anexadas a um tópico ou resposta. */
export function Attachments({ images }: { images: string[] }) {
  if (!images || images.length === 0) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {images.map((src) => (
        <a key={src} href={src} target="_blank" rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="anexo" className="h-28 w-full object-cover transition-transform hover:scale-105" />
        </a>
      ))}
    </div>
  );
}
