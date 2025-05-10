Here is a **detailed frontend implementation plan** for the **`web/`** package of D-Attend — structured by file and component directory, aligned with the dashboard and its features. This expands each part of your `packages/web/` structure, with **descriptions, business logic, and code snippets** where necessary.

---

## ✅ `packages/web/` — D-Attend Frontend (Next.js + Tailwind CSS)

---

### 📁 `src/app/`

This uses the **Next.js App Router** with layout support.

---

#### `src/app/page.tsx`

* **Purpose**: Default landing page.
* **Logic**: Redirects logged-in users to `/dashboard`, others to `/login`.

```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();
  return redirect(session ? '/dashboard' : '/login');
}
```

---

#### `src/app/dashboard/page.tsx`

* **Purpose**: Dashboard summary view with metrics.
* **Components Used**: `DashboardStats`, `RecentActivity`
* **APIs Called**: `/api/dashboard/summary`

---

#### `src/app/login/page.tsx`

* **Purpose**: Login screen with wallet/social login
* **Components Used**: `WalletLogin`, `SocialLogin`
* **Logic**:

  * Calls `/api/auth/verify` after wallet connect
  * Stores JWT in cookies/localStorage

---

#### `src/app/org/page.tsx`

* **Purpose**: Show all user’s organizations
* **Components**: `OrganizationTable`, `CreateOrgForm`

---

### 📁 `src/components/`

Organized by domain modules:

---

#### 📁 `auth/`

##### `WalletLogin.tsx`

* **Purpose**: Web3 wallet connect (RainbowKit)
* **Logic**:

  * Connect wallet
  * Sign challenge message
  * POST to `/api/auth/verify`

```tsx
import { useAccount, useSignMessage } from 'wagmi';
const WalletLogin = () => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const login = async () => {
    const challenge = await fetch('/api/auth/challenge').then(res => res.text());
    const signature = await signMessageAsync({ message: challenge });
    const res = await fetch('/api/auth/verify', { method: 'POST', body: JSON.stringify({ address, signature }) });
    if (res.ok) location.href = '/dashboard';
  };
};
```

---

#### 📁 `dashboard/`

##### `Sidebar.tsx`

* **Purpose**: Navigation for dashboard
* **Logic**: Shows links based on user role

---

##### `StatCard.tsx`

* **Purpose**: Visual component to display key metrics

---

##### `DashboardStats.tsx`

* **Logic**: Fetches metrics and renders 3–4 `StatCard` components
* **Metrics**: Total orgs, sessions, credentials, users

---

#### 📁 `organization/`

##### `OrganizationTable.tsx`

* **Purpose**: Table showing all organizations
* **Logic**:

  * Fetches via `GET /api/org`
  * Shows edit/delete actions

---

##### `CreateOrgForm.tsx`

* **Logic**:

  * POSTs to `/api/org`
  * Handles form validation

---

#### 📁 `server/`

##### `ServerList.tsx`

* **Purpose**: Lists servers for selected org
* **Types**: Classroom, Event, Meeting

---

##### `AddServerForm.tsx`

* **Purpose**: Form to add a server
* **Fields**: name, type, verification method, NFT settings
* **API**: `POST /api/server`

---

#### 📁 `attendance/`

##### `AttendanceTable.tsx`

* **Purpose**: Tabular list of attendance sessions
* **Logic**:

  * Filters by server/date
  * Uses `GET /api/attendance/records`

---

##### `SessionVerifier.tsx`

* **Purpose**: Start QR session
* **Logic**:

  * Uses QR Code component
  * Calls `POST /api/attendance/start`
  * Monitors attendance confirmations

---

#### 📁 `credential/`

##### `CredentialList.tsx`

* **Purpose**: Show NFT badges earned
* **API**: `GET /api/credentials`
* **UI**: Image thumbnail, metadata (issuer, date, type)

---

##### `IssueCredentialForm.tsx`

* **Purpose**: Admin form to manually issue badge
* **API**: `POST /api/credentials/issue`

---

#### 📁 `ui/`

Reusable design elements.

##### `Button.tsx`, `Modal.tsx`, `Input.tsx`, `Spinner.tsx`, `Badge.tsx`

* Encapsulate styled inputs, loaders, etc.

---

### 📁 `config/`

##### `env.ts`

* **Reads** values from `.env.local`

```ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
```

---

### 📁 `context/`

##### `authContext.tsx`

* **Manages**: user session context
* **Provides**: `user`, `setUser`, `logout()`

---

### 📁 `hooks/`

##### `useAuth.ts`

* Custom hook to access auth context

##### `useDashboard.ts`

* Fetches dashboard metrics, manages loading state

---

### 📁 `lib/`

##### `formatDate.ts`

* Utility for displaying human-readable timestamps

##### `session.ts`

* Reads user session (JWT)

---

### 📁 `services/`

##### `authApi.ts`

```ts
export const loginWithSignature = async (address: string, signature: string) => {
  return fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature }),
  }).then(res => res.json());
};
```

##### `dashboardApi.ts`

* Handles fetch for `/dashboard/summary`

##### `orgApi.ts`, `attendanceApi.ts`, `credentialApi.ts`

* Encapsulate REST calls with `fetch()` or `axios`

---

### 📁 `store/`

##### `useUserStore.ts`

* Zustand or Context store for global user state
* Used for token/session persistence

---

### 📁 `types/`

##### `index.ts`

```ts
export type Organization = { id: string; name: string; description?: string };
export type Server = { id: string; name: string; type: 'CLASSROOM' | 'EVENT' };
export type Credential = { id: string; title: string; metadataUrl: string };
```

---

### 📁 `styles/`

##### `globals.css`

* Tailwind base and global resets

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## ✅ Final Suggestions

To finish this off:

* Use **Zod** or **Yup** for form validation
* Add **Playwright** or **Cypress** for E2E testing
* Integrate **Chart.js** in `DashboardStats` for visual trend analysis

---

Would you like a **visual diagram of component hierarchy** or **generate code for a full page like `/dashboard`** next?
