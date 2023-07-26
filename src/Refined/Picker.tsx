/* eslint-disable @typescript-eslint/no-misused-promises */
import { useEffect } from "react";
import { supabase } from "./supabase";
import { useSocket } from "./useSocket";

/**
 * A component that allows the user to pick a FILE from the local filesystem.
 */
export default function Picker() {
  const socket = useSocket("http://localhost:3333", {
    path: "/socket/",
    retries: 3,
    reconnection: false,
  });

  useEffect(() => {
    socket.init();
    socket.instance?.on("connect", () => {
      console.log("connected");
    });

    socket.instance?.on("disconnect", () => {
      console.log("disconnect");
    });

    socket.instance?.on("transcript", (data: string) => {
      console.log("transcript", data);
      console.log("connected");
    });

    socket.instance?.on("pcmChunk", (data: string) => {
      console.log("pcmChunk", data);
    });

    socket.instance?.on("welcome", (data: string) => {
      console.log("welcome", data);
    });

    return () => {
      socket.instance?.off("connect");
      socket.instance?.off("disconnect");
      socket.instance?.off("transcript");
    };
  }, [socket.instance]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    if (!file) {
      return;
    }

    const auth = await supabase.auth.getSession();
    const storage = await supabase.storage
      .from("recording")
      .upload(`${auth.data.session!.user.id}/${file.name}`, file);
    console.log("auth", auth);
    console.log("storage", storage);
  };

  return (
    <>
      <input type="file" onChange={handleFile} />
    </>
  );
}
