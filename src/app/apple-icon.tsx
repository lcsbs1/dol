import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0C0F",
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "9999px",
            border: "20px solid #F5F6FA",
            borderTopColor: "#EEF49B",
            borderRightColor: "#D5C2FA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "9999px",
              background: "#EEF49B",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
