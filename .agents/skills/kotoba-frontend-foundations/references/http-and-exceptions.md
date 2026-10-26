# Axios, envelope, dan exception FE

Ikuti [API base](../../../../docs/api-contract/README.md) serta OpenAPI endpoint. Target penempatan: `shared/adapters/http-client`, `shared/exceptions`, dan domain `services/external`. Snippet adalah contoh persiapan implementasi; tambahkan dependency Axios dengan Bun pada task adapter. Tidak ada perubahan backend contract yang diperlukan untuk pola ini.

## Contract transport

Axios hanya muncul dalam implementation adapter. Method `request` mengembalikan body `unknown`, bukan cast generic yang menyatakan JSON sudah valid. `params` mengikuti query API, termasuk comma-separated values yang dibentuk external service. Path relatif terhadap `/api/v1`, misalnya `/progress/timeline`; endpoint OAuth tidak dilewatkan adapter JSON.

```ts
export interface HttpRequest<TBody = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Readonly<Record<string, string | number | boolean | undefined>>;
  body?: TBody;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}

export interface HttpResponse {
  httpStatus: number;
  body: unknown;
}

export interface HttpClient {
  request<TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse>;
}
```

Headers dipakai hanya bila kontrak memerlukannya, misalnya `Idempotency-Key` direct quiz. Service menjaga key yang sama untuk retry attempt yang sama. Jangan otomatis retry semua POST. Sign-out sukses memakai envelope tanpa `data`; `204`/response kosong hanya diterima bila endpoint memang menjanjikannya.

## Exception classes dan normalisasi

Blok berikut dapat digabung berurutan dengan contract transport. Saat dipecah menjadi file runtime, gunakan import/export entry point FE yang sesuai. `StoreError` di akhir sama dengan kontrak pada [store patterns](store-patterns.md); hanya ada satu definisi shared saat implementasi.

```ts
import axios from 'axios';
import { z } from 'zod';

export class BaseException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
  }
}

interface ApiFailure {
  httpStatus: number;
  code: number | null;
  traceId: string | null;
  errorDetails: readonly { field: string; message: string }[];
}

export class ApiException extends BaseException {
  constructor(
    message: string,
    readonly failure: ApiFailure,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export class ServerException extends ApiException {}

export type ClientFailureKind = 'network' | 'timeout' | 'cancelled' | 'contract' | 'unexpected';

export class ClientException extends BaseException {
  constructor(
    readonly kind: ClientFailureKind,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

const apiStatusSchema = z.object({
  traceId: z.string().min(1),
  code: z.number().int().min(100000000).max(999999999),
  message: z.string().min(1),
  errorDetails: z.array(z.object({ field: z.string(), message: z.string() })),
});
const errorEnvelopeSchema = z.object({ status: apiStatusSchema });

export function normalizeHttpError(error: unknown): BaseException {
  if (error instanceof BaseException) return error;
  if (axios.isCancel(error)) {
    return new ClientException('cancelled', 'Request cancelled.', error);
  }
  if (!axios.isAxiosError(error)) {
    return new ClientException('unexpected', 'Could not complete the request.', error);
  }
  if (error.response) {
    const parsed = errorEnvelopeSchema.safeParse(error.response.data);
    const status = parsed.success ? parsed.data.status : null;
    const failure: ApiFailure = {
      httpStatus: error.response.status,
      code: status?.code ?? null,
      traceId: status?.traceId ?? null,
      errorDetails: status?.errorDetails ?? [],
    };
    const message = status?.message ?? 'Could not complete the request. Please try again.';
    return failure.httpStatus >= 500
      ? new ServerException(message, failure, error)
      : new ApiException(message, failure, error);
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ClientException('timeout', 'The request timed out. Please try again.', error);
  }
  if (error.code === 'ERR_NETWORK' || error.request) {
    return new ClientException(
      'network',
      'Could not connect. Check your connection and try again.',
      error,
    );
  }
  return new ClientException('unexpected', 'Could not complete the request.', error);
}

export interface StoreError {
  message: string;
  code: number | string | null;
  traceId: string | null;
  fieldErrors: readonly { field: string; message: string }[];
}

export function presentError(error: unknown): StoreError {
  if (error instanceof ApiException) {
    return {
      message: error.message,
      code: error.failure.code,
      traceId: error.failure.traceId,
      fieldErrors: error.failure.httpStatus === 422 ? error.failure.errorDetails : [],
    };
  }
  return {
    message: error instanceof BaseException ? error.message : 'Could not complete the request.',
    code: error instanceof ClientException ? error.kind : null,
    traceId: null,
    fieldErrors: [],
  };
}
```

`cause` hanya untuk diagnosis lokal; jangan serialize/log seluruh cause karena Axios config dapat berisi body atau header. Semua pesan pada `BaseException` harus aman untuk learner. Generic `Error.message` tidak langsung diteruskan presenter. Field errors yang tidak punya input padanan ditampilkan sebagai inline summary, bukan dibuang. Pada flow yang membedakan `401`/`403`, service/session coordinator memeriksa `ApiException.failure.httpStatus` dan code sebelum presenter menghasilkan UI model; adapter tidak mengubah session atau router.

## Adapter implementation

Satu Axios instance dimiliki root container; tidak ada mutable last-request/last-response pada class. Konfigurasi timeout positif divalidasi sebelum instance dibuat. Browser mengirim cookie aplikasi sesuai same-origin policy; cookie HttpOnly tidak dibaca oleh adapter. `Origin` POST disediakan browser, bukan header buatan client.

```ts
export class AxiosHttpClient implements HttpClient {
  private readonly client;

  constructor(options: { apiBasePath: '/api/v1'; requestTimeoutMs: number }) {
    if (!Number.isFinite(options.requestTimeoutMs) || options.requestTimeoutMs <= 0) {
      throw new ClientException('unexpected', 'Request configuration is invalid.');
    }
    this.client = axios.create({
      baseURL: options.apiBasePath,
      timeout: options.requestTimeoutMs,
      withCredentials: true,
      headers: { Accept: 'application/json' },
    });
  }

  async request<TBody = unknown>(request: HttpRequest<TBody>): Promise<HttpResponse> {
    try {
      const response = await this.client.request<unknown>({
        url: request.path,
        method: request.method,
        params: request.query,
        data: request.body,
        headers: request.headers,
        signal: request.signal,
      });
      return { httpStatus: response.status, body: response.data };
    } catch (error: unknown) {
      throw normalizeHttpError(error);
    }
  }
}
```

Konfigurasi di atas menggunakan perilaku default Axios untuk menolak response non-2xx. Referensi: [instance](https://axios-http.com/docs/instance), [error handling](https://axios-http.com/docs/handling_errors), dan [cancellation dengan AbortController](https://axios-http.com/docs/cancellation). Jangan menambahkan interceptor global berulang saat render. Jika interceptor diperlukan kemudian, instance pemilik juga memiliki cleanup/eject-nya.

## External service dan MSW

External service domain melakukan urutan berikut:

1. Bentuk request typed dari kontrak, termasuk offset/limit dan filter yang didukung.
2. Panggil `HttpClient.request`; kegagalan sudah berupa exception FE, jangan dibungkus ulang.
3. Parse `body` dengan schema envelope sukses + DTO endpoint. Validasi success code yang dijanjikan endpoint dan HTTP status; jangan hard-code shared success code untuk semua domain.
4. Jika parse gagal, lempar `ClientException('contract', 'The response could not be read. Please try again.')`; jangan menganggap response `200` berisi HTML sebagai daftar kosong.
5. Kembalikan data DTO/projection yang dibutuhkan store. Untuk timeline, map `data.progressEvents` ke `items` sambil mempertahankan `metadata.pagination`; untuk endpoint tanpa data, return `void` setelah validasi status.

Root/domain mengikat API implementation yang sama di mode nyata dan mock. MSW meniru envelope, error code, metadata, serta response kosong yang benar di layer HTTP. Browser feature menunggu startup `MockProvider`; tests memakai `setupServer` dan reset state skenario. RSC yang memanggil query backend langsung tidak melewati adapter browser atau MSW browser.

Pada implementasi adapter, verifikasi request paralel tidak saling menukar data/trace ID, response `422` mempertahankan detail, `401`/`403` dibedakan, `5xx` non-JSON mendapat fallback, timeout/network dipetakan, dan cancellation tidak membuat inline error saat unmount. Simpan pengujian sesuai task FE/test yang relevan, bukan menambah suite aplikasi pada tahap dokumentasi ini.
