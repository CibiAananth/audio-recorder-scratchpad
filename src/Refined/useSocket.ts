import { useCallback, useRef, useEffect } from "react";
import {
  io,
  type Socket,
  type SocketOptions,
  type ManagerOptions,
} from "socket.io-client";

export function useSocket(
  url: string,
  options: Partial<ManagerOptions & SocketOptions> = {}
) {
  const socket = useRef<Socket | null>(null);

  const init = useCallback(() => {
    socket.current = io(url, {
      ...options,
      query: {
        token: "Z>lFs46=B)$u(742x5(iEH6k&m",
      },
    });
    socket.current?.on("connect", () => {
      console.log("connected");
    });

    socket.current?.on("disconnect", () => {
      console.log("disconnected");
    });
  }, [url, options]);

  const disconnect = () => {
    socket.current?.disconnect();
    socket.current = null;
  };

  useEffect(() => {
    return () => {
      console.log("disconnecting sockets");
      disconnect();
    };
  }, []);

  return { instance: socket.current, init, disconnect };
}
