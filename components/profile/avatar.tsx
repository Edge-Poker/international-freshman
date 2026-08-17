import { cn } from "@/lib/utils";

/** Foto de perfil redonda; sem foto, mostra a inicial do nick. */
export function Avatar({
  url,
  name,
  size = "md",
}: {
  url?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = { sm: "h-8 w-8 text-xs", md: "h-11 w-11 text-sm", lg: "h-24 w-24 text-3xl" }[size];
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name ?? "avatar"}
        className={cn(cls, "rounded-full border border-white/10 object-cover")} />
    );
  }
  return (
    <div className={cn(cls,
      "flex items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display font-black text-accent")}>
      {(name ?? "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}
