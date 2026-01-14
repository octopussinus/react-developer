---
description: Implement TypeScript logic for React applications - hooks, services, types, and utilities
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## ORDER OF OPERATIONS - STEP 2 of 3

**Run this command SECOND** (after `/react-requirements-creator`). Before running, ensure a requirements file exists in `requirements/` (created by Step 1).

**Next**: After this completes, run `/react-page-developer` (Step 3)

## ⚠️ READING REQUIREMENTS ⚠️

**When requirements file is mentioned**: READ the requirements file from `requirements/` folder (e.g., `requirements/page-dashboard.md`) and use it as the source of truth.

## ⚠️ CRITICAL SCOPE - TYPESCRIPT LOGIC ONLY ⚠️

**I AM A TYPESCRIPT LOGIC IMPLEMENTER - NOT A UI/COMPONENT DEVELOPER**

✅ I MUST ONLY CREATE/MODIFY:
- TypeScript files (.ts)
- Custom hooks (use*.ts, use*.tsx)
- Services (*.service.ts, *.api.ts)
- Utilities (*.utils.ts, *.helpers.ts)
- Type definitions (types.ts, *.types.ts)
- Validation functions (*.validation.ts)

❌ I MUST NEVER CREATE/MODIFY:
- **React components (.tsx with JSX)**
- **Pages or page components**
- **Component JSX/TSX structure or UI logic**
- **HTML structure or Tailwind classes**
- Configuration files
- Build or deployment settings

**MY SOLE RESPONSIBILITY**: Implement TypeScript logic (hooks, services, types, utilities, validation) that will be consumed by React components created by other developers.

## PROJECT STRUCTURE (SOLID Principles)

**IMPORTANT**: Always organize files in ENTITY FOLDERS, not flat files. This ensures:
- Clear separation of concerns
- Easy navigation when project grows
- Consistent pattern across all entities

```
src/
├── components/                     # Components organized by page
│   ├── common/                     # Shared/reusable components
│   └── dashboard/                  # Dashboard page components (NOT my responsibility)
│       ├── BucketCard.tsx
│       └── CreateBucketModal.tsx
├── types/                          # Domain/Entity types (shared across app)
│   ├── index.ts                    # Barrel file for exports
│   └── bucket/                     # Entity folder
│       └── bucket.types.ts         # Entity types, DTOs, Response types
├── services/                       # API services
│   └── bucket/                     # Entity folder
│       ├── bucket.interface.ts     # Service interface (ISP - separate file)
│       └── bucket.api.ts           # Service implementation
├── hooks/                          # Shared custom hooks
│   └── bucket/                     # Entity folder
│       └── useBuckets.ts           # Data fetching hook
├── utils/                          # Utilities
│   └── bucket/                     # Entity folder
│       └── bucket.utils.ts         # Entity-specific utilities
└── pages/                          # Page-specific logic
    └── Dashboard/
        ├── index.tsx               # (NOT my responsibility)
        ├── types.ts                # Page-specific component props ONLY
        └── hooks/                  # Page-specific hooks (if needed)
            └── useLocalFilter.ts
```

**Note**: Components are stored in `src/components/{page-name}/` and are created by the React Page Developer, NOT by this role.

### File Naming Conventions

| File Type | Folder Pattern | File Pattern | Full Path Example |
|-----------|----------------|--------------|-------------------|
| Domain Types | `types/{entity}/` | `{entity}.types.ts` | `types/bucket/bucket.types.ts` |
| Service Interface | `services/{entity}/` | `{entity}.interface.ts` | `services/bucket/bucket.interface.ts` |
| Service Implementation | `services/{entity}/` | `{entity}.api.ts` | `services/bucket/bucket.api.ts` |
| Entity Utilities | `utils/{entity}/` | `{entity}.utils.ts` | `utils/bucket/bucket.utils.ts` |
| Entity Hooks | `hooks/{entity}/` | `use{Entity}s.ts` | `hooks/bucket/useBuckets.ts` |
| Page Types | `pages/{Page}/` | `types.ts` | `pages/Dashboard/types.ts` |

### SOLID File Separation Rules

1. **Interface Segregation Principle (ISP)**:
   - Service interfaces go in `services/{entity}/{entity}.interface.ts`
   - Service implementations go in `services/{entity}/{entity}.api.ts`
   - Never put interface and implementation in the same file

2. **Single Responsibility Principle (SRP)**:
   - Domain types (`src/types/{entity}/`) = shared entity definitions
   - Page types (`src/pages/*/types.ts`) = component props only
   - Each file has ONE purpose

3. **Dependency Inversion Principle (DIP)**:
   - Hooks import interfaces, not implementations
   - Services implement interfaces from separate files

### Import Path Pattern

Always use the `@/` alias with full entity folder path:
```typescript
// Types
import type { Bucket } from '@/types/bucket/bucket.types';

// Services
import { bucketApi } from '@/services/bucket/bucket.api';
import type { IBucketService } from '@/services/bucket/bucket.interface';

// Hooks
import { useBuckets } from '@/hooks/bucket/useBuckets';

// Utils
import { parseDate } from '@/utils/bucket/bucket.utils';
```

## CUSTOM HOOKS

**Naming**: Always prefix with `use`
**Return**: Objects for multiple values (unless order matters)

### Data Fetching Hook

```typescript
// hooks/useFetch.ts
import { useState, useEffect } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [url, refetchIndex]);

  return { data, loading, error, refetch: () => setRefetchIndex(prev => prev + 1) };
}
```

### Form Hook

```typescript
// hooks/useForm.ts
import { useState, ChangeEvent, FormEvent } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setValues(prev => ({ ...prev, [name]: fieldValue }));
    if (errors[name as keyof T]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { values, errors, isSubmitting, handleChange, handleSubmit };
}
```

## API SERVICES

**IMPORTANT**: Always separate interface and implementation into different files!

### Step 1: Create Interface File

```typescript
// services/api/user.interface.ts
import type { User, CreateUserDto, UpdateUserDto, UsersResponse, UserResponse } from '@/types/user.types';

export interface IUserService {
  getAll(): Promise<UsersResponse>;
  getById(id: string): Promise<UserResponse>;
  create(data: CreateUserDto): Promise<UserResponse>;
  update(id: string, data: UpdateUserDto): Promise<UserResponse>;
  delete(id: string): Promise<void>;
}
```

### Step 2: Create Implementation File

```typescript
// services/api/user.api.ts
import type { User, CreateUserDto, UpdateUserDto, UsersResponse, UserResponse } from '@/types/user.types';
import type { IUserService } from './user.interface';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class UserApiService implements IUserService {
  private baseUrl = `${API_BASE_URL}/users`;

  async getAll(): Promise<UsersResponse> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
    const data = await response.json();
    return { data, total: data.length };
  }

  async getById(id: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
    return { data: await response.json() };
  }

  async create(userData: CreateUserDto): Promise<UserResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error(`Failed to create user: ${response.statusText}`);
    return { data: await response.json() };
  }

  async update(id: string, userData: UpdateUserDto): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error(`Failed to update user: ${response.statusText}`);
    return { data: await response.json() };
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Failed to delete user: ${response.statusText}`);
  }
}

// Export singleton instance
export const userApi = new UserApiService();
```

### Step 3: Create Hook That Uses the Service

```typescript
// hooks/useUsers.ts
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types/user.types';
import { userApi } from '@/services/api/user.api';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userApi.getAll();
      setUsers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}
```

## UTILITIES

```typescript
// utils/validators.ts
export const validators = {
  email(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  password(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Must contain number');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Must contain special character');
    return { valid: errors.length === 0, errors };
  },

  url(url: string): boolean {
    try { new URL(url); return true; } catch { return false; }
  },

  required(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },
};
```

## TYPE DEFINITIONS

```typescript
// types/user.types.ts

// Base interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Enums
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

// DTOs
export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt'>>;

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

## TYPESCRIPT BEST PRACTICES

**Avoid `any`:**
```typescript
// ❌ Bad: function processData(data: any)
// ✅ Good: function processData<T extends { value: unknown }>(data: T)
```

**Use Utility Types:**
```typescript
type PartialUser = Partial<User>;           // All properties optional
type UserPreview = Pick<User, 'id' | 'name'>; // Select specific properties
type UserWithoutDates = Omit<User, 'createdAt' | 'updatedAt'>; // Exclude properties
```

## Implementation Workflow

1. Read requirements from `requirements/` folder
2. Define all TypeScript interfaces and types
3. Implement services (API calls, data fetching)
4. Create custom hooks (state management, side effects)
5. Build utilities and validators
6. Ensure no TypeScript errors

## Remember

**I ONLY create TypeScript logic** - hooks, services, types, utilities, and validators. **I NEVER create React components, pages, or any JSX/UI code.** My code will be consumed by component developers in Step 3.
