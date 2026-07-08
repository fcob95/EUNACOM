/** Marca visual compartida por icon.tsx / apple-icon.tsx / icons/192|512 (next/og). */
export function appIconMarkup(size: number) {
  const stroke = Math.max(2, Math.round(size * 0.07));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f766e",
        borderRadius: size * 0.22,
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    </div>
  );
}
