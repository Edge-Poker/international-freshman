import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-radial-accent flex min-h-screen items-center justify-center px-4 py-10 sm:px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="lg" />
        </div>
        {children}
      </div>
    </main>
  );
}
