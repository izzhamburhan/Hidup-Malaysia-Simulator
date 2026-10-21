// Lightweight inline SVG illustration: a generic city skyline, kampung house
// and hibiscus. No external images.
export function Skyline() {
  return (
    <svg viewBox="0 0 360 120" className="relative mt-4 block w-full" aria-hidden>
      <circle cx="290" cy="34" r="18" fill="#e7b432" opacity="0.9" />
      <g fill="#0b2d2e">
        <rect x="20" y="58" width="22" height="62" />
        <rect x="46" y="40" width="16" height="80" />
        <rect x="66" y="66" width="26" height="54" />
        <rect x="140" y="30" width="12" height="90" />
        <rect x="156" y="22" width="12" height="98" />
        <polygon points="146,30 146,12 148,30" />
        <polygon points="162,22 162,4 164,22" />
        <rect x="174" y="62" width="30" height="58" />
        <rect x="210" y="48" width="18" height="72" />
        <rect x="232" y="70" width="24" height="50" />
      </g>
      <g fill="#155e5f">
        <rect x="96" y="80" width="40" height="40" />
        <polygon points="92,82 116,62 140,82" />
        <rect x="110" y="94" width="10" height="26" fill="#e7b432" />
      </g>
      <g transform="translate(300 92)">
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} rx="7" ry="14" cy="-12" fill="#c2410c" transform={`rotate(${r})`} />
        ))}
        <circle r="4" fill="#e7b432" />
      </g>
      <rect x="0" y="116" width="360" height="4" fill="#e7b432" />
    </svg>
  );
}
