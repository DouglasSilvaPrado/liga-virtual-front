export function BracketLines() {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width="100%"
      height="100%"
    >
      {/* Exemplo de linha */}
      <line
        x1="300"
        y1="150"
        x2="380"
        y2="150"
        stroke="#999"
        strokeWidth="2"
      />
      <line
        x1="380"
        y1="150"
        x2="380"
        y2="300"
        stroke="#999"
        strokeWidth="2"
      />
    </svg>
  );
}
