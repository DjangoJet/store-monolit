import type { JobQueue } from "./queue";
import { InlineJobQueue } from "./inline-queue";
import { KSEF_POLL_JOB, pollKsefStatusJob } from "@/modules/invoices/efaktura/service";

// Kompozycja kolejki: rejestr handlerów zadań. Dodajesz zadanie = wpis tutaj.
// (efaktura/service woła getJobQueue() dynamicznie, więc nie ma cyklu importów.)
let queue: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!queue) {
    queue = new InlineJobQueue({
      [KSEF_POLL_JOB]: pollKsefStatusJob,
    });
  }
  return queue;
}

export type { JobQueue } from "./queue";
