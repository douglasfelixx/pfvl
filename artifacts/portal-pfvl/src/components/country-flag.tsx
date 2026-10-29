type CountryCode = "BR" | "US";

export function CountryFlag({ country, className = "" }: { country: CountryCode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`country-flag ${className}`.trim()}
      data-testid={`img-country-flag-${country.toLowerCase()}`}
      focusable="false"
      viewBox="0 0 24 16"
    >
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
            <circle cx="1.2" cy="1.15" r=".28" />
            <circle cx="3" cy="1.15" r=".28" />
            <circle cx="4.8" cy="1.15" r=".28" />
            <circle cx="6.6" cy="1.15" r=".28" />
            <circle cx="8.4" cy="1.15" r=".28" />
            <circle cx="2.1" cy="2.55" r=".28" />
            <circle cx="3.9" cy="2.55" r=".28" />
            <circle cx="5.7" cy="2.55" r=".28" />
            <circle cx="7.5" cy="2.55" r=".28" />
            <circle cx="1.2" cy="3.95" r=".28" />
            <circle cx="3" cy="3.95" r=".28" />
            <circle cx="4.8" cy="3.95" r=".28" />
            <circle cx="6.6" cy="3.95" r=".28" />
            <circle cx="8.4" cy="3.95" r=".28" />
            <circle cx="2.1" cy="5.35" r=".28" />
            <circle cx="3.9" cy="5.35" r=".28" />
            <circle cx="5.7" cy="5.35" r=".28" />
            <circle cx="7.5" cy="5.35" r=".28" />
            <circle cx="1.2" cy="6.75" r=".28" />
            <circle cx="3" cy="6.75" r=".28" />
            <circle cx="4.8" cy="6.75" r=".28" />
            <circle cx="6.6" cy="6.75" r=".28" />
            <circle cx="8.4" cy="6.75" r=".28" />
          </g>
        </>
      )}
      <rect x=".25" y=".25" width="23.5" height="15.5" rx=".8" fill="none" stroke="#d7e0e8" strokeWidth=".5" />
    </svg>
  );
}
