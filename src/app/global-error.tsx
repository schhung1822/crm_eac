"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b0b0c",
          color: "#f5f5f5",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "560px",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "24px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "24px", lineHeight: 1.2 }}>Application Error</h1>
          <p style={{ marginTop: "12px", marginBottom: "8px", color: "rgba(255,255,255,0.8)" }}>
            The application hit an unexpected error while rendering this page.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "8px", color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>Digest: {error.digest}</p>
          ) : null}
          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
