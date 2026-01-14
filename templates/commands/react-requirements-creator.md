---
description: Analyze requirements and create detailed React component implementation specifications
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## PREREQUISITE

**Before running this command**, you should have already created an HTML prototype using `/react-prototype-creator`. 
If you haven't done this yet, run `/react-prototype-creator` first to create the prototype in the `prototypes/` folder.

## PURPOSE

This command's sole purpose is to analyze user input, HTML prototypes, or written requirements and create a comprehensive requirements specification file. It does not switch to any other mode, perform implementation, or execute any code. It only generates detailed specifications for future implementation by other processes.

## WORKFLOW: ANALYZING HTML PROTOTYPES OR REQUIREMENTS

### Option 1: When HTML Prototype is Provided
1. READ the HTML prototype file from prototypes/ folder
2. ANALYZE the HTML structure, forms, interactions, and data needs
3. IDENTIFY all UI components needed
4. EXTRACT form fields and validation requirements
5. DETERMINE data fetching and state management needs
6. DOCUMENT styling patterns (layout, spacing) to preserve from prototype
7. OUTPUT complete implementation requirements based on prototype analysis

### Option 2: When Only Requirements are Provided
1. ANALYZE the written requirements
2. DESIGN the component structure needed
3. DEFINE data models and interactions
4. OUTPUT complete implementation requirements based on requirements

## REQUIREMENTS FILE STORAGE

**CRITICAL**: All requirements MUST be saved to a file in the `requirements/` folder for other agents to use.

**File naming convention**:
- For features: `requirements/feature-[feature-name].md`
- For pages: `requirements/page-[page-name].md`
- For components: `requirements/component-[component-name].md`

Example: `requirements/page-dashboard.md`, `requirements/feature-search.md`

## WORKFLOW: ANALYZING HTML PROTOTYPES OR REQUIREMENTS

### Option 1: When HTML Prototype is Provided
1. READ the HTML prototype file from prototypes/ folder
2. ANALYZE the HTML structure, forms, interactions, and data needs
3. IDENTIFY all UI components needed
4. EXTRACT form fields and validation requirements
5. DETERMINE data fetching and state management needs
6. DOCUMENT styling patterns (layout, spacing) to preserve from prototype
7. OUTPUT complete implementation requirements based on prototype analysis

### Option 2: When Only Requirements are Provided
1. ANALYZE the written requirements
2. DESIGN the component structure needed
3. DEFINE data models and interactions
4. OUTPUT complete implementation requirements based on requirements

## REQUIREMENTS FILE STORAGE

**CRITICAL**: All requirements MUST be saved to a file in the `requirements/` folder for other agents to use.

**File naming convention**:
- For features: `requirements/feature-[feature-name].md`
- For pages: `requirements/page-[page-name].md`
- For components: `requirements/component-[component-name].md`

Example: `requirements/page-dashboard.md`, `requirements/feature-search.md`

## IMPLEMENTATION REQUIREMENTS OUTPUT FORMAT

When analyzing HTML prototypes or requirements, CREATE A FILE in the `requirements/` folder with this format:

# IMPLEMENTATION REQUIREMENTS

## SOURCE
- **HTML Prototype**: prototypes/[filename].html (if applicable)
- **Requirements**: [Brief description of what was requested]

## 1. COMPONENT STRUCTURE
- **ComponentName**: Component responsible for [description]
  - Props Interface: 
    ```typescript
    interface ComponentNameProps {
      title: string;
      onSubmit: (data: FormData) => void;
      isLoading?: boolean;
    }
    ```
  - State: [list of state variables with types]
  - Event Handlers: [list of event handlers]
  - Lifecycle: [useEffect dependencies and cleanup needs]

## 2. TYPE DEFINITIONS
- **MainModel**:
  ```typescript
  interface MainModel {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
  }
  ```
  
- **FormData**:
  ```typescript
  type FormData = {
    username: string;
    email: string;
    role: UserRole;
  }
  
  enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    GUEST = 'guest'
  }
  ```

## 3. CUSTOM HOOKS
- **useFormValidation**:
  - Purpose: Manages form state and validation
  - Parameters: `(initialValues: FormData, validationRules: ValidationRules)`
  - Returns: `{ values, errors, handleChange, handleSubmit, isValid }`
  - Side Effects: Validates on change and blur

- **useDataFetching** (Optional - if API interaction needed):
  - Purpose: Fetches and manages async data
  - Parameters: `(endpoint: string, options?: RequestOptions)`
  - Returns: `{ data, loading, error, refetch }`
  - Side Effects: Fetches on mount and when dependencies change

## 4. SERVICES
- **ApiService** (Optional - if backend interaction needed):
  - Purpose: Handles API interactions for [description]
  - Functions:
    ```typescript
    async function getItems(): Promise<Item[]>
    async function getItemById(id: string): Promise<Item>
    async function createItem(item: Partial<Item>): Promise<Item>
    async function updateItem(id: string, updates: Partial<Item>): Promise<Item>
    async function deleteItem(id: string): Promise<void>
    ```

- **MockService** (Optional - if mock data needed for development):
  - Purpose: Provides mock data for development
  - Functions: Same signatures as ApiService
  - Mock Data: Pre-populated array of items with realistic data

## 5. VALIDATION FUNCTIONS
- **Required validators**: email, username, password
- **Custom validators**:
  - `validatePassword`: 
    - Min 8 characters
    - At least one uppercase letter
    - At least one number
    - At least one special character
  - `validateUsername`: 
    - Checks if username is unique (async)
    - Min 3 characters, max 20 characters
    - Only alphanumeric and underscores
  - Other validators as needed...

## 6. EVENT HANDLERS
- **User actions**:
  - `handleSubmit`: Submits form data
    - Validates all fields
    - Calls API service
    - Shows success/error message
    - Resets form on success
  - `handleFilterChange`: Updates filter criteria
    - Updates URL params
    - Triggers data refetch
  - Other handlers...

- **Side effects**:
  - Data fetching on mount
  - Cleanup subscriptions on unmount
  - Event listener setup/teardown

## 7. STATE MANAGEMENT
- **Local State** (useState):
  - `formData: FormData` - Current form values
  - `isSubmitting: boolean` - Form submission state
  - `errors: ValidationErrors` - Form validation errors

- **Global State** (Context/External):
  - User authentication state
  - Theme preferences
  - Other shared state...

## 8. PERFORMANCE OPTIMIZATIONS
- **Memoization**:
  - Memoize expensive filtering/sorting operations
  - Use React.memo for child components that receive stable props
  - useCallback for event handlers passed to children

- **Code Splitting**:
  - Lazy load heavy components
  - Split routes with React.lazy and Suspense

## 9. STYLING REQUIREMENTS
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Implement dark mode support if needed
- Use existing component library (shadcn/ui, etc.)

## 10. IMPLEMENTATION SEQUENCE
1. Create type definitions and interfaces
2. Implement validation functions
3. Develop custom hooks
4. Create services (API and Mock)
5. Implement main component structure
6. Connect component with hooks and services
7. Add event handlers and side effects
8. Implement error boundaries and loading states
9. Add performance optimizations
10. Test with mock data

## Analysis Guidelines

### Analyzing HTML Prototypes

When provided an HTML prototype:

1. **Structure Analysis**:
   - Identify page sections and components
   - Note repeating patterns that suggest components
   - Document the component hierarchy

2. **Form Analysis**:
   - Extract all form fields and their types
   - Identify validation requirements from HTML attributes
   - Note submit handlers and form behavior

3. **Data Analysis**:
   - Identify data being displayed
   - Determine data sources (API, static, user input)
   - Plan data models and types

4. **Interaction Analysis**:
   - Document all user interactions (clicks, typing, etc.)
   - Identify state changes triggered by interactions
   - Note async operations (API calls, etc.)

5. **Styling Analysis**:
   - Extract Tailwind classes for layout and spacing
   - Note responsive breakpoints
   - Document visual patterns to preserve

### Analyzing Written Requirements

When provided written requirements:

1. **Feature Analysis**:
   - Break down features into components
   - Identify data models needed
   - Determine component relationships

2. **Validation Analysis**:
   - Extract validation rules from requirements
   - Define error messages
   - Plan validation timing (on change, on blur, on submit)

3. **Flow Analysis**:
   - Map user flows through the interface
   - Identify state transitions
   - Document success and error paths

4. **Integration Analysis**:
   - Identify external dependencies (APIs, services)
   - Plan mock data for development
   - Define service contracts

## Remember

This command only analyzes input and generates a complete, detailed specification saved to a file in the `requirements/` folder. It does not perform any implementation, coding, or execution. The specifications are for reference by other processes or developers.

**WORKFLOW**:
1. Analyze user input and/or HTML prototype
2. Create comprehensive requirements document
3. **Save to `requirements/[feature-name].md`**
4. Confirm file path to user so other agents can reference it
