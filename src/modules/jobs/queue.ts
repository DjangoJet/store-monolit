// Kontrakt kolejki zadań w tle. Patrz docs/04-adapters.md.
// Domyślnie tryb "inline"; na Coolify wymienny na BullMQ + Redis bez zmian wołających.
export interface JobQueue {
  enqueue(
    name: string,
    payload: unknown,
    opts?: { delayMs?: number },
  ): Promise<void>;
}
