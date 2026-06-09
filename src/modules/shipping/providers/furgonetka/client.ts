import { randomUUID } from "node:crypto"

import type {
  FurgonetkaLabel,
  FurgonetkaOptions,
  FurgonetkaRegulation,
  FurgonetkaService,
  FurgonetkaTokenResponse,
} from "./types"

/** Command summary returned while polling order/document commands. */
interface CommandSummary {
  status?: string
  url?: string | null
  errors?: unknown[]
  uuid?: string
}

const PROD_BASE = "https://api.furgonetka.pl"
const SANDBOX_BASE = "https://api.sandbox.furgonetka.pl"

/**
 * Thin HTTP client around the Furgonetka REST API.
 *
 * Handles OAuth2 (`password` grant) with in-memory token caching and
 * transparent refresh. One instance is created per provider service.
 */
export class FurgonetkaClient {
  private readonly baseUrl: string
  private readonly options: FurgonetkaOptions

  private accessToken?: string
  private refreshToken?: string
  /** Epoch ms at which the current access token expires. */
  private expiresAt = 0

  constructor(options: FurgonetkaOptions) {
    this.options = options
    this.baseUrl = options.sandbox ? SANDBOX_BASE : PROD_BASE
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  private basicAuthHeader(): string {
    const raw = `${this.options.clientId}:${this.options.clientSecret}`
    return `Basic ${Buffer.from(raw).toString("base64")}`
  }

  private async fetchToken(params: Record<string, string>): Promise<void> {
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: this.basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `Furgonetka OAuth failed (${res.status}): ${text.slice(0, 500)}`
      )
    }

    const data = (await res.json()) as FurgonetkaTokenResponse
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token ?? this.refreshToken
    // Refresh a minute before the real expiry to avoid edge races.
    this.expiresAt = Date.now() + (data.expires_in - 60) * 1000
  }

  private async ensureToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken
    }

    if (this.refreshToken) {
      try {
        await this.fetchToken({
          grant_type: "refresh_token",
          refresh_token: this.refreshToken,
          scope: "api",
        })
        return this.accessToken!
      } catch {
        // Fall through to a fresh password-grant login.
      }
    }

    await this.fetchToken({
      grant_type: "password",
      scope: "api",
      username: this.options.username,
      password: this.options.password,
    })
    return this.accessToken!
  }

  // ---------------------------------------------------------------------------
  // Core request helper
  // ---------------------------------------------------------------------------

  private async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    accept = "application/json"
  ): Promise<T> {
    const token = await this.ensureToken()

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `Furgonetka ${method} ${path} failed (${res.status}): ${text.slice(0, 800)}`
      )
    }

    // Binary documents (labels) are handled by requestBinary instead.
    if (res.status === 204) {
      return undefined as T
    }
    return (await res.json()) as T
  }

  private async requestBinary(
    method: "GET" | "POST",
    path: string,
    accept: string,
    body?: unknown
  ): Promise<Buffer> {
    const token = await this.ensureToken()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `Furgonetka ${method} ${path} failed (${res.status}): ${text.slice(0, 800)}`
      )
    }
    return Buffer.from(await res.arrayBuffer())
  }

  // ---------------------------------------------------------------------------
  // API resources
  // ---------------------------------------------------------------------------

  /** GET /account/services — services available on the account. */
  async getServices(): Promise<FurgonetkaService[]> {
    const data = await this.request<{
      services?: FurgonetkaService[]
      data?: { services?: FurgonetkaService[] }
    }>("GET", "/account/services")
    return data.services ?? data.data?.services ?? []
  }

  /** POST /packages/calculate-price — dynamic pricing for a package. */
  async calculatePrice(payload: unknown): Promise<unknown> {
    return this.request("POST", "/packages/calculate-price", payload)
  }

  /** POST /packages/validate — validate a package before creating it. */
  async validatePackage(payload: unknown): Promise<unknown> {
    return this.request("POST", "/packages/validate", payload)
  }

  /** POST /packages — create a shipment. */
  async createPackage(payload: unknown): Promise<{ package_id?: number } & Record<string, unknown>> {
    return this.request("POST", "/packages", payload)
  }

  /** GET /packages/{id} — package details. */
  async getPackage(packageId: number | string): Promise<unknown> {
    return this.request("GET", `/packages/${packageId}`)
  }

  /** GET /packages/{id}/tracking — tracking history/status. */
  async getTracking(packageId: number | string): Promise<unknown> {
    return this.request("GET", `/packages/${packageId}/tracking`)
  }

  /** DELETE /packages/{id} — cancel a shipment. */
  async deletePackage(packageId: number | string): Promise<unknown> {
    return this.request("DELETE", `/packages/${packageId}`)
  }

  /**
   * POST /points/map — search pickup points / parcel lockers.
   * `location` carries coordinates / search_phrase / address; `filters`
   * narrows by services and point_types.
   */
  async getPoints(location: unknown, filters: unknown = {}): Promise<unknown[]> {
    const data = await this.request<{
      points?: unknown[]
      data?: { points?: unknown[] }
    }>("POST", "/points/map", { location, filters })
    return data.points ?? data.data?.points ?? []
  }

  /** GET /packages/{id}/label — label as PDF bytes (only once it's ready). */
  async getLabel(
    packageId: number | string,
    accept = "application/pdf"
  ): Promise<Buffer> {
    return this.requestBinary("GET", `/packages/${packageId}/label`, accept)
  }

  // ---------------------------------------------------------------------------
  // Carrier regulations
  // ---------------------------------------------------------------------------

  /** GET /regulations — carrier regulations and their acceptance state. */
  async getRegulations(): Promise<FurgonetkaRegulation[]> {
    const data = await this.request<{
      regulations?: FurgonetkaRegulation[]
      data?: { regulations?: FurgonetkaRegulation[] }
    }>("GET", "/regulations")
    return data.regulations ?? data.data?.regulations ?? []
  }

  /**
   * POST /regulations — accept the given regulations. Only the canonical
   * fields are sent; the extra fields GET returns (content, documents,
   * datetime_accepted: null …) trip the API's "isEmpty" validation.
   */
  async acceptRegulations(
    regulations: FurgonetkaRegulation[]
  ): Promise<unknown> {
    const payload = regulations.map((r) => ({
      service: r.service,
      version: r.version,
      datetime: r.datetime,
      name: r.name,
      accepted: true,
    }))
    return this.request("POST", "/regulations", { regulations: payload })
  }

  /**
   * Accepts not-yet-accepted regulations. Pass `services` to limit acceptance
   * to specific carriers (recommended — avoids touching unrelated statements
   * like self-billing). Returns the number of regulations accepted.
   */
  async acceptPendingRegulations(services?: string[]): Promise<number> {
    let pending = (await this.getRegulations()).filter((r) => !r.accepted)
    if (services?.length) {
      pending = pending.filter((r) => services.includes(r.service))
    }
    if (!pending.length) {
      return 0
    }
    await this.acceptRegulations(pending)
    return pending.length
  }

  // ---------------------------------------------------------------------------
  // Command flows: order shipments (nadanie) + documents (labels)
  // ---------------------------------------------------------------------------

  private static packagesArg(
    packageIds: (number | string)[]
  ): { id: number | string }[] {
    return packageIds.map((id) => ({ id }))
  }

  private static isDone(status?: string): boolean {
    return [
      "done",
      "success",
      "successful",
      "finished",
      "complete",
      "completed",
    ].includes((status ?? "").toLowerCase())
  }

  private static isError(status?: string): boolean {
    return ["error", "failed", "failure", "unsuccessful"].includes(
      (status ?? "").toLowerCase()
    )
  }

  private async poll(
    summaryFn: (uuid: string) => Promise<CommandSummary>,
    uuid: string,
    { attempts = 15, delayMs = 1000 } = {}
  ): Promise<CommandSummary> {
    let last: CommandSummary = {}
    for (let i = 0; i < attempts; i++) {
      last = await summaryFn(uuid)
      if (last.url || FurgonetkaClient.isDone(last.status)) {
        return last
      }
      if (FurgonetkaClient.isError(last.status)) {
        throw new Error(
          `Furgonetka command ${uuid} failed: ${JSON.stringify(
            last.errors ?? last
          ).slice(0, 500)}`
        )
      }
      await new Promise((r) => setTimeout(r, delayMs))
    }
    throw new Error(
      `Furgonetka command ${uuid} did not finish in time (last status: ${last.status})`
    )
  }

  /** PUT /order-commands/{uuid} — submit shipments for dispatch. */
  private async submitOrder(
    uuid: string,
    packageIds: (number | string)[],
    label?: FurgonetkaLabel
  ): Promise<void> {
    await this.request("PUT", `/order-commands/${uuid}`, {
      packages: FurgonetkaClient.packagesArg(packageIds),
      label: label ?? null,
    })
  }

  /** GET /order-commands/{uuid} — order command status. */
  private getOrderSummary(uuid: string): Promise<CommandSummary> {
    return this.request<CommandSummary & { data?: CommandSummary }>(
      "GET",
      `/order-commands/${uuid}`
    ).then((r) => r.data ?? r)
  }

  /** Orders the given packages and waits until the command completes. */
  async orderAndWait(
    packageIds: (number | string)[],
    label?: FurgonetkaLabel
  ): Promise<CommandSummary> {
    const uuid = randomUUID()
    await this.submitOrder(uuid, packageIds, label)
    return this.poll((u) => this.getOrderSummary(u), uuid)
  }

  /** PUT /documents-command/{uuid} — request document generation. */
  private async submitDocuments(
    uuid: string,
    packageIds: (number | string)[],
    documentsTypes: string[],
    label?: FurgonetkaLabel
  ): Promise<void> {
    await this.request("PUT", `/documents-command/${uuid}`, {
      packages: FurgonetkaClient.packagesArg(packageIds),
      documents_types: documentsTypes,
      label: label ?? null,
    })
  }

  /** GET /documents-command/{uuid} — document command status (+ url). */
  private getDocumentsSummary(uuid: string): Promise<CommandSummary> {
    return this.request<CommandSummary & { data?: CommandSummary }>(
      "GET",
      `/documents-command/${uuid}`
    ).then((r) => r.data ?? r)
  }

  /**
   * Generates documents (labels by default) for the packages and returns the
   * download URL plus the fetched PDF bytes once ready.
   */
  async generateDocuments(
    packageIds: (number | string)[],
    documentsTypes: string[] = ["labels"],
    label?: FurgonetkaLabel
  ): Promise<{ url: string; pdf: Buffer }> {
    const uuid = randomUUID()
    await this.submitDocuments(uuid, packageIds, documentsTypes, label)
    const summary = await this.poll((u) => this.getDocumentsSummary(u), uuid)
    if (!summary.url) {
      throw new Error(
        `Furgonetka document command ${uuid} finished without a url`
      )
    }
    const pdf = await this.fetchDocument(summary.url)
    return { url: summary.url, pdf }
  }

  /**
   * Downloads a document. The document command returns a storage (S3) URL that
   * must be fetched WITHOUT an Authorization header; we retry with a bearer
   * token only if the plain request is rejected with 401/403.
   */
  async fetchDocument(url: string): Promise<Buffer> {
    let res = await fetch(url, { headers: { Accept: "application/pdf" } })
    if (res.status === 401 || res.status === 403) {
      const token = await this.ensureToken()
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
      })
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `Furgonetka document download failed (${res.status}): ${text.slice(0, 300)}`
      )
    }
    return Buffer.from(await res.arrayBuffer())
  }
}
