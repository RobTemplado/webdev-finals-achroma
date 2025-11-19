"use client";

import React, { useEffect, useState } from "react";

type MsgType = "log" | "info" | "warn" | "error";

type ConsoleMsg = {
  id: number;
  type: MsgType;
  message: string;
  time: string;
};

export function GlobalDebugConsoleOverlay() {
  const [messages, setMessages] = useState<ConsoleMsg[]>([]);

  useEffect(() => {
    let nextId = 1;

    const append = (type: MsgType, message: string) => {
      const time = new Date().toLocaleTimeString();
      setMessages((prev) => [
        { id: nextId++, type, message, time },
        ...prev.slice(0, 99),
      ]);
    };

    const original = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    } as const;

    const wrap = (type: MsgType) =>
      (...args: any[]) => {
        try {
          const msg = args
            .map((a) =>
              typeof a === "string" ? a : JSON.stringify(a, undefined, 2)
            )
            .join(" ");
          append(type, msg);
        } catch {
          append(type, "[debug-overlay] failed to stringify console args");
        }
        // Call through to original
        // @ts-ignore
        original[type](...args);
      };

    console.log = wrap("log");
    console.info = wrap("info");
    console.warn = wrap("warn");
    console.error = wrap("error");

    const onError = (
      event: ErrorEvent | Event,
    ) => {
      if (event instanceof ErrorEvent) {
        append(
          "error",
          `[window.onerror] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        );
      } else {
        append("error", "[window.onerror] Unknown error event");
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = (event as any).reason;
      let msg = "[unhandledrejection]";
      if (reason instanceof Error) {
        msg += ` ${reason.name}: ${reason.message}`;
      } else if (reason != null) {
        try {
          msg += ` ${JSON.stringify(reason)}`;
        } catch {
          msg += " <unstringifiable reason>";
        }
      }
      append("error", msg);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection as any);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection as any);

      console.log = original.log;
      console.info = original.info;
      console.warn = original.warn;
      console.error = original.error;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-2 pb-2">
      <div className="pointer-events-auto max-h-64 w-full max-w-2xl overflow-y-auto rounded-md border border-red-500/60 bg-black/80 p-2 text-xs font-mono text-red-100 shadow-lg">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-red-300/80">
          <span>Debug Console</span>
          <span>latest {messages.length} msg</span>
        </div>
        {messages.length === 0 && (
          <div className="text-[11px] text-gray-400">No debug messages yet.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="whitespace-pre-wrap">
            <span className="mr-1 text-gray-500">[{m.time}]</span>
            <span
              className={
                m.type === "error"
                  ? "text-red-300"
                  : m.type === "warn"
                  ? "text-yellow-300"
                  : "text-gray-200"
              }
            >
              {m.type.toUpperCase()}:
            </span>{" "}
            <span>{m.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
