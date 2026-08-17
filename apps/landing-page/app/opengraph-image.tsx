import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

// Generated from the copy at build time (no hand-made PNG to keep in sync) and
// prerendered to a static asset, so crawlers and unfurlers get it off the CDN
// with no cold start. Deliberately NOT the edge runtime — that would opt this
// route out of static generation.
export const alt =
  "Perfext — AI writing assistant and Grammarly alternative for Chrome";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), transparent 60%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#a3a3a3",
          }}
        >
          {SITE_NAME}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 82,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          Make Perfect Texts.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 36,
            lineHeight: 1.4,
            color: "#a3a3a3",
            maxWidth: 900,
          }}
        >
          The Grammarly alternative for Chrome — inline AI writing suggestions,
          powered by the model you choose.
        </div>

        <div style={{ display: "flex", marginTop: 56, gap: 16 }}>
          {["Free with your own API key", "Private by default", "Any text field"].map(
            (chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  border: "1px solid #262626",
                  borderRadius: 999,
                  padding: "12px 24px",
                  fontSize: 24,
                  color: "#d4d4d4",
                }}
              >
                {chip}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    size,
  );
}
