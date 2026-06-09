import { describe, expect, it, vi } from "vitest";
import { InlineJobQueue } from "./inline-queue";

describe("InlineJobQueue", () => {
  it("uruchamia handler zarejestrowany pod nazwą zadania", async () => {
    const handler = vi.fn(async () => {});
    const queue = new InlineJobQueue({ "test:job": handler });
    await queue.enqueue("test:job", { x: 1 });
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith({ x: 1 }));
  });

  it("respektuje opóźnienie (delayMs)", async () => {
    vi.useFakeTimers();
    try {
      const handler = vi.fn(async () => {});
      const queue = new InlineJobQueue({ "delayed:job": handler });
      await queue.enqueue("delayed:job", null, { delayMs: 5000 });
      expect(handler).not.toHaveBeenCalled();
      vi.advanceTimersByTime(5000);
      expect(handler).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rzuca błąd dla nieznanej nazwy zadania", async () => {
    const queue = new InlineJobQueue({});
    await expect(queue.enqueue("brak", null)).rejects.toThrow(/Brak handlera/);
  });

  it("błąd w handlerze nie wywraca procesu (jest złapany)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const queue = new InlineJobQueue({ "boom": async () => { throw new Error("x"); } });
      await queue.enqueue("boom", null);
      await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    } finally {
      spy.mockRestore();
    }
  });
});
