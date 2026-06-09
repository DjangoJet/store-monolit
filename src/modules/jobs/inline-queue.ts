import type { JobHandler, JobQueue } from "./queue";

/**
 * Kolejka „inline" — uruchamia zadania w tym samym procesie przez setTimeout.
 * Wystarcza dla monolitu na długo żyjącym serwerze (Coolify). Ograniczenia:
 * zadania nie przeżywają restartu procesu i nie działają w środowisku serverless.
 * Produkcyjnie wymienna na BullMQ + Redis bez zmian po stronie wołających.
 */
export class InlineJobQueue implements JobQueue {
  constructor(private readonly handlers: Record<string, JobHandler>) {}

  async enqueue(name: string, payload: unknown, opts?: { delayMs?: number }): Promise<void> {
    const handler = this.handlers[name];
    if (!handler) throw new Error(`Brak handlera zadania w kolejce: ${name}`);
    const run = () => {
      void handler(payload).catch((err) => console.error(`[job ${name}]`, err));
    };
    const timer = setTimeout(run, opts?.delayMs ?? 0);
    // nie blokuj zakończenia procesu (np. w testach/CLI)
    if (typeof timer.unref === "function") timer.unref();
  }
}
