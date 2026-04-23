"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import AudiomackPlayer from "./AudiomackPlayer";

export default function AudiomackManager() {
  const { audiomackUrl, setAudiomackUrl } = usePlayerStore();

  if (!audiomackUrl) return null;

  return (
    <AudiomackPlayer 
      trackUrl={audiomackUrl} 
      onClose={() => setAudiomackUrl(null)} 
    />
  );
}
