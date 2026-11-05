import { useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CircleHelp,
  Lightbulb,
  Menu,
  MessageCircle,
  Newspaper,
  X,
} from "lucide-react";
import "./_group.css";

const items = [
  { label: "Início", icon: BarChart3 },
  { label: "Conteúdos", icon: BookOpen },
  { label: "Comunidade", icon: MessageCircle },
  { label: "Novidades", icon: Newspaper },
  { label: "Central de Ajuda", icon: CircleHelp },
  { label: "Sugestões", icon: Lightbulb },
];

function Flag({ country }: { country: "BR" | "US" }) {
  return (
    <svg aria-hidden="true" className="country-flag" viewBox="0 0 24 16">
      {country === "BR" ? (
        <>
          <rect width="24" height="16" fill="#009739" />
          <path d="M12 1.7 22 8 12 14.3 2 8 12 1.7Z" fill="#FFDF00" />
          <circle cx="12" cy="8" r="3.55" fill="#002776" />
          <path d="M8.65 7.45c2.3-.55 4.55-.22 6.65.9" fill="none" stroke="#fff" strokeWidth=".45" />
          <circle cx="10.25" cy="7.05" r=".23" fill="#fff" />
          <circle cx="13.5" cy="8.75" r=".2" fill="#fff" />
        </>
      ) : (
        <>
          <rect width="24" height="16" fill="#B22234" />
          <path d="M0 1.23h24v1.23H0zm0 2.46h24v1.23H0zm0 2.46h24v1.23H0zm0 2.46h24v1.23H0zm0 2.46h24v1.23H0zm0 2.46h24v1.23H0z" fill="#fff" />
          <rect width="10.2" height="8.62" fill="#3C3B6E" />
          <g fill="#fff">
            {[1.15, 2.55, 3.95, 5.35, 6.75].map((y, row) =>
              [1.2, 3, 4.8, 6.6, 8.4].map((x, col) => (
                <circle cx={x + ((row + col) % 2) * 0.9} cy={y} r=".28" key={`${row}-${col}`} />
              )),
            )}
          </g>
        </>
      )}
      <rect x=".25" y=".25" width="23.5" height="15.5" rx=".8" fill="none" stroke="#d7e0e8" strokeWidth=".5" />
    </svg>
  );
}

export function Current() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-header-current">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand-lockup" href="#" onClick={(event) => event.preventDefault()}>
            <img alt="PFVL — Planeje. Acompanhe. Realize." className="brand-logo" src="/__mockup/images/pfvl-logo-negativa.png" />
          </a>
          <button aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"} className="menu-button" onClick={() => setOpen((value) => !value)} type="button">
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
          <nav aria-label="Navegação principal" className={`primary-navigation ${open ? "primary-navigation-open" : ""}`}>
            {items.map(({ label, icon: Icon }) => (
              <a className="primary-nav-link" href="#" key={label} onClick={(event) => event.preventDefault()}>
                <Icon className="nav-item-icon" size={15} strokeWidth={1.9} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div aria-label="Idioma" className="language-switch" role="group">
            <button aria-label="Português (Brasil)" aria-pressed="true" className="language-option language-option-active" type="button"><Flag country="BR" /></button>
            <button aria-label="English (United States)" aria-pressed="false" className="language-option" type="button"><Flag country="US" /></button>
          </div>
          <div className="header-auth-actions">
            <a className="auth-header-link" href="#" onClick={(event) => event.preventDefault()}>Painel</a>
            <a aria-label="Notificações" className="header-bell" href="#" onClick={(event) => event.preventDefault()}><Bell aria-hidden="true" size={19} /><span className="header-bell-dot" /></a>
            <button className="auth-header-link" type="button">Sair</button>
          </div>
        </div>
      </header>
    </div>
  );
}
