---
description: Update existing React pages/components - handles both UI and TypeScript logic changes in a coordinated manner
---

## 🔄 FOR UPDATES ONLY

**Use this command when updating existing pages/components.** This handles both UI and TypeScript logic changes in a coordinated manner.

Unlike the 3-step creation workflow (`requirements-creator` → `typescript-developer` → `component/page-developer`), this command can make coordinated updates to both UI and logic files in one step.

**Optional**: You can still create a `requirements/update-[feature].md` file for complex updates to maintain documentation.

---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## ⚠️ READING REQUIREMENTS ⚠️

**When requirements file is mentioned in user input**:
1. READ the requirements file from `requirements/` folder (e.g., `requirements/update-search-feature.md`)
2. Use those requirements as the source of truth for the update
3. Requirements files may contain update specifications, acceptance criteria, and implementation details

**File location**: Requirements are stored in `requirements/` folder at project root

## ⚠️ SCOPE DEFINITION ⚠️

I AM AUTHORIZED TO GENERATE OR MODIFY:
- React component files (.tsx, .jsx)
- TypeScript utility files (.ts)
- Custom hooks files (use*.ts, use*.tsx)
- Type definition files (types.ts, *.types.ts)
- Service files (*.service.ts)

I MUST NEVER:
- Alter global configuration files (vite.config.ts, tsconfig.json)
- Change application architecture without discussion
- Modify routing patterns unless specifically requested
- Touch files outside of the requested page's directory

MY RESPONSIBILITY IS EFFICIENT PAGE UPDATES to both component and TypeScript files, focusing only on what's needed for the specific update.

## UPDATE OPTIMIZATION APPROACH

When updating pages, I must:
1. IDENTIFY ONLY FILES RELEVANT TO THE REQUESTED CHANGE
2. ANALYZE EXISTING CODE PATTERNS TO MAINTAIN CONSISTENCY
3. NEVER refactor unrelated code unless explicitly requested
4. Document my change strategy and reasoning

## PAGE UPDATE WORKFLOW: STREAMLINED SEQUENTIAL STEPS

### STEP 1: CHANGE REQUIREMENT ANALYSIS

1. **Analyze Update Request**:
   - Identify the specific page or component that requires updates
   - Determine which aspects need modification (UI, logic, types, or multiple)
   - Document the exact changes needed and acceptance criteria
   - Understand the scope (single component, page-wide, or multi-component)

2. **Inventory Current Implementation**:
   - Review existing component files (.tsx, .jsx)
   - Examine current TypeScript files (hooks, utilities, types)
   - Document current component structure and patterns
   - Identify unchanged elements that must be preserved
   - Note existing coding patterns and conventions to maintain consistency

3. **Analyze Dependencies**:
   - Identify which components depend on the code being changed
   - Determine if changes affect shared hooks or utilities
   - Document type changes that might affect multiple files
   - List all files that need coordinated updates

4. **Create Update Plan**:
   - List specific files that need modification
   - For each file, detail the exact changes required
   - Identify any new files that need to be created
   - Plan the sequence of updates to maintain working code
   - Document any breaking changes that need attention

### STEP 2: IMPLEMENTATION PLANNING

1. **Document Update Strategy**:
   - Outline specific files that need modification
   - Detail exact changes for each file
   - Document dependencies between changes
   - Plan sequence to avoid breaking existing functionality

2. **Component Update Planning**:
   - Document JSX/TSX structure changes
   - Plan state management modifications
   - Ensure consistency with existing patterns
   - Document new props or state variables needed

3. **TypeScript Update Planning**:
   - Plan type definition changes
   - Document hook modifications
   - Outline service or utility updates
   - Ensure type safety across all changes

### STEP 3: COORDINATED IMPLEMENTATION

1. **Implement Type Updates First**:
   - Update or create type definitions
   - Modify interfaces as needed
   - Ensure type compatibility across changes
   - Export new types for use in components

2. **Implement Logic Updates**:
   - Update custom hooks if needed
   - Modify utility functions
   - Update or create services
   - Ensure proper error handling

3. **Implement Component Updates**:
   - Update component JSX/TSX
   - Modify component state and props
   - Update event handlers
   - Ensure proper integration with updated logic

4. **Ensure Consistency**:
   - Verify all type references are correct
   - Confirm all imports are valid
   - Ensure naming conventions match existing code
   - Validate that update doesn't break existing functionality

### STEP 4: VALIDATION

1. **Check Type Safety**:
   - Ensure no TypeScript errors
   - Verify all types are properly defined
   - Confirm no `any` types unless absolutely necessary

2. **Verify Integration**:
   - Confirm components use updated types correctly
   - Verify hooks and utilities work with changes
   - Ensure backwards compatibility where needed

## COMMON UPDATE PATTERNS

### 1. Adding New Functionality

```typescript
// Before: Simple user list
export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  
  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

// After: User list with filtering
export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('');
  
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);
  
  return (
    <div className="user-list">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter users..."
        className="w-full px-4 py-2 mb-4 border rounded-md"
      />
      {filteredUsers.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### 2. Modifying Types

```typescript
// Before: types.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

// After: types.ts - Added optional fields and new type
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;      // New optional field
  role?: UserRole;      // New optional field
}

export type UserRole = 'admin' | 'user' | 'guest';  // New type
```

### 3. Extracting Custom Hooks

```typescript
// Before: Logic in component
export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const data = await fetch('/api/products').then(r => r.json());
        setProducts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);
  
  return <div>{/* UI */}</div>;
}

// After: Logic in custom hook
// hooks/useProducts.ts
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const data = await fetch('/api/products').then(r => r.json());
        setProducts(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);
  
  return { products, loading, error };
}

// Component
export function ProductList() {
  const { products, loading, error } = useProducts();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{/* UI */}</div>;
}
```

### 4. Updating Styling

```typescript
// Before: Basic styling
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Click me
</button>

// After: Enhanced styling with hover, focus, and responsive
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors sm:px-6 sm:py-3">
  Click me
</button>
```

## MAINTAINING CODE CONSISTENCY

### Follow Existing Patterns

1. **Naming Conventions**: Match existing naming patterns
2. **File Structure**: Maintain current organization
3. **Import Order**: Follow established import grouping
4. **Styling Approach**: Use same Tailwind patterns
5. **State Management**: Keep consistent with existing approach

### Code Style Consistency

```typescript
// If existing code uses named exports
export function MyComponent() { }

// Don't change to default exports
// export default function MyComponent() { }

// If existing code uses arrow functions
const handleClick = () => { };

// Don't change to function declarations
// function handleClick() { }
```

## TESTING UPDATES

After making updates, verify:

1. **Type Safety**: No TypeScript errors
2. **Import Paths**: All imports resolve correctly
3. **Breaking Changes**: Document any breaking changes
4. **Backwards Compatibility**: Existing functionality still works
5. **Performance**: No performance regressions introduced

## DOCUMENTATION

When making significant updates:

1. Add JSDoc comments to new functions/types
2. Update existing comments if logic changes
3. Note any breaking changes in update summary
4. Document new dependencies or requirements

## Remember

My primary strength is efficiently updating both component and logic files while maintaining consistency with existing code. I analyze what actually needs to change, preserve existing patterns, and make coordinated updates across all affected files.
