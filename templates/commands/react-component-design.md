---
description: Enforce Atomic Design System principles for creating scalable, reusable, and dynamic React components (Atoms, Molecules, Organisms)
---

## User Input

```text
$ARGUMENTS
```

# Atomic Design System Implementation

You are an expert Frontend Architect enforcing the **Atomic Design System**.
When asked to create components or designs, you **MUST** strictly follow these rules to ensure reusability, scalability, and maintainability.

## 1. ⚛️ atomic Design Hierarchy

Decompose every UI request into the following components:

### 🟢 Atoms (`src/custom-components/atoms`)
- **Definition**: Basic building blocks. Cannot be broken down further.
- **Scope**: Abstract, domain-agnostic.
- **Responsibility**: Pure styling and basic interaction (stateless).
- **Examples**: `Button`, `Input`, `Label`, `Icon`, `Avatar`.
- **Rules**:
    - **NO** business logic.
    - **NO** external dependencies (except UI libraries).
    - **MUST** accept all content via `props` (labels, placeholders, values).

### 🔵 Molecules (`src/custom-components/molecules`)
- **Definition**: Groups of atoms functioning together as a unit.
- **Scope**: Abstract, domain-agnostic.
- **Responsibility**: "Do one thing" (e.g., a search form).
- **Examples**: `SearchBar` (Input + Button), `FormField` (Label + Input + Error), `UserCard`.
- **Rules**:
    - Build primarily from **Atoms**.
    - **NO** complex business logic (keep them "dumb").
    - **Dynamic Content**: All labels, text, and placeholders **MUST** be props.
        - *Bad*: `<label>Search Users</label>`
        - *Good*: `<label>{label}</label>` (passed as `label="Search Users"`)

### 🟠 Organisms (`src/custom-components/organisms`)
- **Definition**: Complex UI sections composed of Molecules and/or Atoms.
- **Scope**: Concrete, domain-specific.
- **Responsibility**: distinct section of an interface.
- **Examples**: `Header`, `Footer`, `ProductList`, `Sidebar`, `DashboardWidget`.
- **Rules**:
    - Can contain business logic and state.
    - Determine how data is fetched or passed down to molecules.

### 🟣 Templates (`src/custom-components/templates`)
- **Definition**: Page-level layout structure without specific content.
- **Scope**: Abstract layout.
- **Responsibility**: Grid structure, positioning of organisms.
- **Examples**: `DashboardLayout`, `AuthLayout`, `BlogPostTemplate`.

### 🔴 Pages (`src/pages`)
- **Definition**: Specific instances of templates with real data.
- **Scope**: Concrete implementation.
- **Responsibility**: Routing, data fetching, passing specific props to organisms/templates.

---

## 2. 🏗️ Implementation Guidelines

### Dynamic Component Fields (Crucial)
**ALL** Atoms and Molecules must be **context-agnostic**.
Never hardcode text that limits reuse.

**Example: Creating a Reusable Input Module**

DO NOT create `EmailInput.tsx`.
DO create `LabeledInput.tsx` (Molecule) composed of `Label.tsx` (Atom) and `Input.tsx` (Atom).

```tsx
// src/custom-components/molecules/LabeledInput.tsx
interface LabeledInputProps {
  id: string;
  label: string;          // DYNAMIC: Passed from parent (Page/Organism)
  placeholder?: string;   // DYNAMIC
  value: string;
  onChange: (e: any) => void;
  error?: string;
}

export const LabeledInput = ({ id, label, placeholder, ...props }: LabeledInputProps) => (
  <div className="flex flex-col gap-1">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} placeholder={placeholder} {...props} />
  </div>
);
```

### Usage in Pages
When implementing the page, you verify the reuse:

```tsx
// src/pages/LoginPage.tsx
<LabeledInput label="Email Address" placeholder="user@example.com" ... />
<LabeledInput label="Password" type="password" ... />
```

---

## 3. 📂 Folder Structure Enforcement

Always place files in their correct atomic directory:

```text
src/
└── custom-components/
    ├── atoms/         # Icons, Buttons, Inputs, Typography
    ├── molecules/     # FormFields, SearchBars, Cards
    ├── organisms/     # Navbars, Sidebars, DataTables
    └── templates/     # Layouts (Grid, Flex structures)
```

## 4. 📝 Process for New Features

1.  **Analyze**: Break the UI down into atoms, molecules, and organisms.
2.  **Check Existing**: Do we already have an atom/molecule for this?
    - If yes -> **Reuse it**.
    - If no -> **Create it** in the correct folder.
3.  **Implement**:
    - Start with **Atoms** (Styling).
    - Build **Molecules** (Structure + Dynamic Props).
    - Build **Organisms** (Layout + Logic).
    - Assemble in **Page** (Content injection).
