import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 112,
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: "9999px",
            border: "54px solid #F5F6FA",
            borderTopColor: "#EEF49B",
            borderRightColor: "#D5C2FA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
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
