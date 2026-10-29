# Store contracts dan contoh application store

Gunakan bersama [baseline](../../../../docs/frontend-foundation-patterns.md). Ini snippet persiapan, bukan modul runtime yang sudah tersedia. Blok TypeScript di dokumen ini dapat dibaca berurutan sebagai satu contoh; saat implementasi, pisahkan shared contracts, interface domain, implementation store, dan container sesuai architecture. Data API di contoh adalah projection minimal; definisi DTO lengkap tetap mengikuti OpenAPI.

## Kontrak shared

`StoreError` adalah plain UI model dari presenter exception, bukan error Axios. Presenter `presentError` berada di `shared/helpers` dan dapat diinjeksi seperti pada contoh agar store tidak bergantung pada transport; implementasinya mengikuti [HTTP dan exceptions](http-and-exceptions.md).

```ts
import { makeAutoObservable, runInAction } from 'mobx';
import { Container } from 'inversify';

export interface StoreError {
  message: string;
  code: number | string | null;
  traceId: string | null;
  fieldErrors: readonly { field: string; message: string }[];
}

export type PresentError = (error: unknown) => StoreError;
export type FormErrors<T extends object> = Partial<Record<keyof T, string>>;

export interface IDefaultFormStore<TForm extends object, TResult> {
  readonly formData: Readonly<TForm>;
  readonly formErrors: FormErrors<TForm>;
  readonly isSubmitting: boolean;
  readonly error: StoreError | null;
  readonly result: TResult | null;
  setFormData(patch: Partial<TForm>): void;
  validateFormData(): boolean;
  submit(): Promise<void>;
}

export interface IDefaultListStore<TItem> {
  readonly items: readonly TItem[];
  readonly totalCount: number;
  readonly currentPage: number;
  readonly rowsPerPage: number;
  readonly isLoading: boolean;
  readonly error: StoreError | null;
  load(): Promise<void>;
  setCurrentPage(page: number): Promise<void>;
  setRowsPerPage(size: number): Promise<void>;
}

export interface IDefaultModalStore<TPayload> {
  readonly isOpen: boolean;
  readonly payload: TPayload | null;
  open(payload: TPayload): void;
  close(): void;
}

export interface IHydratableStore<TSnapshot> {
  hydrate(snapshot: TSnapshot): void;
}

export interface IDisposableStore {
  dispose(): void;
}
```

Read-only interface tidak membuat nested value immutable saat runtime. Komponen harus memanggil action, bukan memutasi array/form secara langsung. Untuk nested form lebih kompleks, definisikan readonly model dan action field domain yang sesuai.

## Form: assessment draft

`AssessmentFormStore` menyimpan form dan hasil assessment sementara. `submit()` memanggil assessment, bukan konfirmasi profil. Pemilik wizard menambahkan aksi konfirmasi dan state review pada kontrak domain; jangan menandai onboarding selesai dari hasil draft. `validateInput` adalah validator FE yang mengikuti schema endpoint dan pilihan katalog published, tanpa menyalin business rule backend.

```ts
export interface AssessmentFormData {
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: string;
  weakSkillFocuses: string[];
  note: string;
}

export interface AssessmentDraft {
  aiNormalizationUsed: boolean;
}

function cloneAssessmentData(data: AssessmentFormData): AssessmentFormData {
  return { ...data, weakSkillFocuses: [...data.weakSkillFocuses] };
}

export interface IAssessmentService {
  assess(input: AssessmentFormData, signal: AbortSignal): Promise<AssessmentDraft>;
}

export interface IAssessmentFormStore
  extends
    IDefaultFormStore<AssessmentFormData, AssessmentDraft>,
    IHydratableStore<AssessmentFormData>,
    IDisposableStore {}

export class AssessmentFormStore implements IAssessmentFormStore {
  formData: AssessmentFormData;
  formErrors: FormErrors<AssessmentFormData> = {};
  isSubmitting = false;
  error: StoreError | null = null;
  result: AssessmentDraft | null = null;
  private controller: AbortController | null = null;

  constructor(
    private readonly api: IAssessmentService,
    initial: AssessmentFormData,
    private readonly validateInput: (input: AssessmentFormData) => FormErrors<AssessmentFormData>,
    private readonly presentError: PresentError,
  ) {
    this.formData = cloneAssessmentData(initial);
    makeAutoObservable<this, 'api' | 'validateInput' | 'presentError' | 'controller'>(
      this,
      {
        api: false,
        validateInput: false,
        presentError: false,
        controller: false,
      },
      { autoBind: true },
    );
  }

  hydrate(snapshot: AssessmentFormData): void {
    this.dispose();
    this.formData = cloneAssessmentData(snapshot);
    this.formErrors = {};
    this.error = null;
    this.result = null;
  }

  setFormData(patch: Partial<AssessmentFormData>): void {
    if (this.isSubmitting) return;
    this.formData = cloneAssessmentData({ ...this.formData, ...patch });
    this.formErrors = {};
    this.error = null;
    this.result = null;
  }

  validateFormData(): boolean {
    this.formErrors = this.validateInput(this.formData);
    return Object.keys(this.formErrors).length === 0;
  }

  async submit(): Promise<void> {
    if (this.isSubmitting || !this.validateFormData()) return;
    const controller = new AbortController();
    const input = cloneAssessmentData(this.formData);
    this.controller = controller;
    this.isSubmitting = true;
    this.error = null;
    this.result = null;
    try {
      const result = await this.api.assess(input, controller.signal);
      runInAction(() => {
        if (this.controller === controller && !controller.signal.aborted) this.result = result;
      });
    } catch (error: unknown) {
      runInAction(() => {
        if (this.controller !== controller || controller.signal.aborted) return;
        this.error = this.presentError(error);
        for (const detail of this.error.fieldErrors) {
          if (Object.hasOwn(this.formData, detail.field)) {
            this.formErrors[detail.field as keyof AssessmentFormData] = detail.message;
          }
        }
      });
    } finally {
      runInAction(() => {
        if (this.controller !== controller) return;
        this.controller = null;
        this.isSubmitting = false;
      });
    }
  }

  dispose(): void {
    this.controller?.abort();
    this.controller = null;
    this.isSubmitting = false;
  }
}
```

Saat submit aktif, input dinonaktifkan mengikuti `isSubmitting`; kegagalan mempertahankan form untuk koreksi/retry. `hydrate` adalah penggantian snapshot secara eksplisit, bukan action mount yang dipanggil setiap render. Clone eksplisit menyalin array form menjadi plain data; jangan memanggil `structuredClone` langsung terhadap observable proxy. Nested model lain memerlukan serializer/clone yang sesuai bentuk domain.

## List: progress timeline

External service memetakan `data.progressEvents` menjadi `items` dan mempertahankan pagination. Store tidak melakukan fetch semua data lalu memotongnya di client. Contoh mengosongkan hasil ketika query dimulai agar data halaman sebelumnya tidak tampil sebagai hasil halaman baru; UI memprioritaskan loading/error sebelum empty state.

```ts
export interface ProgressEventItem {
  id: string;
  answeredAt: string;
  skillTitle: string;
  numericScore: number;
}

export interface Pagination {
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

export interface IProgressService {
  timeline(
    query: { offset: number; limit: number },
    signal: AbortSignal,
  ): Promise<{ items: ProgressEventItem[]; pagination: Pagination }>;
}

export interface IProgressTimelineStore
  extends IDefaultListStore<ProgressEventItem>, IDisposableStore {}

export class ProgressTimelineStore implements IProgressTimelineStore {
  items: ProgressEventItem[] = [];
  totalCount = 0;
  currentPage = 1;
  rowsPerPage = 10;
  isLoading = false;
  error: StoreError | null = null;
  private controller: AbortController | null = null;

  constructor(
    private readonly api: IProgressService,
    private readonly presentError: PresentError,
  ) {
    makeAutoObservable<this, 'api' | 'presentError' | 'controller'>(
      this,
      { api: false, presentError: false, controller: false },
      { autoBind: true },
    );
  }

  async load(): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const query = {
      offset: (this.currentPage - 1) * this.rowsPerPage,
      limit: this.rowsPerPage,
    };
    this.isLoading = true;
    this.error = null;
    this.items = [];
    this.totalCount = 0;
    try {
      const response = await this.api.timeline(query, controller.signal);
      runInAction(() => {
        if (this.controller !== controller || controller.signal.aborted) return;
        this.items = response.items;
        this.totalCount = response.pagination.totalRecords;
      });
    } catch (error: unknown) {
      runInAction(() => {
        if (this.controller === controller && !controller.signal.aborted) {
          this.error = this.presentError(error);
        }
      });
    } finally {
      runInAction(() => {
        if (this.controller !== controller) return;
        this.controller = null;
        this.isLoading = false;
      });
    }
  }

  async setCurrentPage(page: number): Promise<void> {
    const offset = (page - 1) * this.rowsPerPage;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(offset)) return;
    this.currentPage = page;
    await this.load();
  }

  async setRowsPerPage(size: number): Promise<void> {
    if (!Number.isInteger(size) || size < 1 || size > 100) return;
    this.rowsPerPage = size;
    this.currentPage = 1;
    await this.load();
  }

  dispose(): void {
    this.controller?.abort();
    this.controller = null;
    this.isLoading = false;
  }
}
```

Pemeriksaan identity controller tetap diperlukan walaupun request dibatalkan: response mungkin sudah selesai atau service consumer tidak menghentikan promise. Interface dapat ditambah filter pada domain; reset halaman ke `1` ketika filter berubah. Timeline bukan stream websocket: setelah aktivitas berhasil, pemilik progress view memuat snapshot terbaru sesuai write-through backend.

## Modal: konfirmasi keluar sesi

Dialog lokal sederhana sebaiknya memakai React state. Store berikut berguna bila trigger dan dialog berada di komponen berbeda dalam satu scope session. Navigasi dan penyimpanan jawaban tetap milik flow session; `open`/`close` tidak menyiratkan backend memiliki pause endpoint.

```ts
export interface ExitSessionPayload {
  sessionId: string;
  returnPath: '/flashcards' | '/practice';
}

export interface IExitSessionModalStore extends IDefaultModalStore<ExitSessionPayload> {}

export class ExitSessionModalStore implements IExitSessionModalStore {
  payload: ExitSessionPayload | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isOpen(): boolean {
    return this.payload !== null;
  }

  open(payload: ExitSessionPayload): void {
    this.payload = { ...payload };
  }

  close(): void {
    this.payload = null;
  }
}
```

Dialog terkontrol menerima `open={store.isOpen}` dan menutup melalui `store.close()` pada dismiss. Form modal baru mengomposisikan kontrak form jika ada kebutuhan input/submit nyata; jangan membebankan form pada semua overlay.

## Container options dan constructor injection

`RootContainerParams` adalah konsep root build options, bukan store yang di-`implements`. KotobaHub memakai `FrontendContainerOptions` sesuai architecture. Projection bootstrap di bawah hanya mengambil field session yang dibutuhkan contoh; endpoint session lengkap tetap punya DTO sendiri, dan keadaan belum diketahui ditandai tidak adanya `session`.

```ts
export interface FrontendBootstrapData {
  session?: {
    isAuthenticated: boolean;
    user: { id: string; displayName: string } | null;
    authorization: {
      appAccess: 'ANONYMOUS' | 'ONBOARDING_REQUIRED' | 'APP_READY';
      onboardingCompleted: boolean;
    };
  };
}

export interface FrontendContainerOptions {
  apiBasePath: '/api/v1';
  requestTimeoutMs: number;
  bootstrap?: FrontendBootstrapData;
}

export interface FeatureContainerOptions {
  parentContainer: Container;
}

export const PROGRESS_TYPES = {
  Service: Symbol('ProgressService'),
  TimelineStore: Symbol('ProgressTimelineStore'),
};
export const SHARED_TYPES = { PresentError: Symbol('PresentError') };

export function createProgressContainer(
  { parentContainer }: FeatureContainerOptions,
  api: IProgressService,
): Container {
  const container = new Container({ parent: parentContainer });
  container.bind<IProgressService>(PROGRESS_TYPES.Service).toConstantValue(api);
  container
    .bind<IProgressTimelineStore>(PROGRESS_TYPES.TimelineStore)
    .toDynamicValue(
      (context) =>
        new ProgressTimelineStore(
          context.get<IProgressService>(PROGRESS_TYPES.Service),
          context.get<PresentError>(SHARED_TYPES.PresentError),
        ),
    )
    .inSingletonScope();
  return container;
}
```

Pada implementasi, token berada di `services/types.ts`; root mengikat `PresentError`, HTTP adapter, dan app-session store. Domain factory merangkai real API service dari HTTP adapter lalu mengikatnya seperti `api` pada contoh. Factory root menerima `FrontendContainerOptions`, memvalidasi timeout positif, membuat Axios instance, dan meneruskan bootstrap ke store tanpa HTTP. Tidak perlu alias root params kedua atau env map bebas.

Provider feature membuat child container sekali untuk identitas scope, hook resolve `TimelineStore`, dan lifecycle client memanggil `load` setelah mock siap. Untuk container yang masih dipakai pada effect setup berikutnya, `dispose()` contoh membatalkan request tanpa menandai store mati permanen; hasil request lama tetap ditolak. Identity session/user berubah berarti instance/container baru, bukan hydrate state user baru ke request user lama.
