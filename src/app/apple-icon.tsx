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
          background: "#090A0D",
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "9999px",
            border: "20px solid #F5F6F8",
            borderTopColor: "#10B981",
            borderRightColor: "#3B82F6",
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
              background: "#10B981",
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
