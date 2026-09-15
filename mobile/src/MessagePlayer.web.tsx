import React from "react";
export default function MessagePlayer({ id }: { id: string }) {
  return (
    <iframe
      title="Message video player"
      src={`https://www.youtube-nocookie.com/embed/${id}?playsinline=1`}
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        border: 0,
        borderRadius: 16,
        background: "#191b19",
      }}
    />
  );
}
