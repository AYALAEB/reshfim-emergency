import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Home, Users } from "lucide-react";

export default function MobileNav() {
  const [location] = useHashLocation();

  const tabs = [
    { href: "/", label: "ראשי", icon: Home },
    { href: "/contacts", label: "אנשי קשר", icon: Users },
  ];

  return (
    <nav className="mobile-nav">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href !== "/" && location.startsWith(href));
        return (
          <Link key={href} href={href} className={`
            flex-1 flex flex-col items-center justify-center py-2 gap-1 touch-target
            transition-colors
            ${active
              ? "text-primary font-semibold"
              : "text-muted-foreground"
            }
          `}>
            <Icon size={22} />
            <span className="text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
