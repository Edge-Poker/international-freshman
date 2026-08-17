import {
  LayoutDashboard, BookOpen, Star, MessagesSquare, Send, Bell,
  Users, CreditCard, Settings, LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Itens de navegação da área logada — fonte única, consumida pela
 * barra lateral (desktop) e pelo menu mobile, para os dois nunca
 * saírem de sincronia.
 *
 * `premium: true` marca as áreas exclusivas de assinantes: para conta
 * sem acesso elas aparecem com cadeado e abrem o popup de assinatura,
 * em vez de navegar.
 */
export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** exige assinatura ativa (ou admin) */
  premium?: boolean;
  /** contador exibido ao lado do rótulo */
  badge?: "unread" | "notif";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/course", label: "Course", Icon: BookOpen, premium: true },
  { href: "/saved", label: "Saved", Icon: Star, premium: true },
  { href: "/forum", label: "Forum", Icon: MessagesSquare, premium: true },
  { href: "/messages", label: "Messages", Icon: Send, premium: true, badge: "unread" },
  { href: "/notifications", label: "Notifications", Icon: Bell, premium: true, badge: "notif" },
  { href: "/students", label: "Students", Icon: Users, premium: true },
  { href: "/subscription", label: "Subscription", Icon: CreditCard },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/support", label: "Support", Icon: LifeBuoy },
];
