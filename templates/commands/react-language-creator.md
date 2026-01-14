---
description: Add new languages to the project by creating all required translation files based on existing namespace structure
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The user input will typically specify:
- The language to add (e.g., "Spanish", "German", "Japanese", "French")
- ISO language code (optional - can be inferred from language name)

## ⚠️ CRITICAL SCOPE - TRANSLATION FILES ONLY ⚠️

**I AM A LANGUAGE/TRANSLATION CREATOR - NOT A COMPONENT DEVELOPER**

✅ I MUST ONLY CREATE:
- New language directories in `src/locales/`
- Translation JSON files for all discovered namespaces
- Properly translated content for each namespace

❌ I MUST NEVER CREATE/MODIFY:
- React components
- The i18n configuration (`src/i18n.ts` - it auto-discovers languages)
- The LanguageSelector component (it uses auto-discovered languages)
- Any other files

## I18N SYSTEM ARCHITECTURE

The project uses `i18next` with `react-i18next` for internationalization.

### Key Files

**`src/i18n.ts`** - Main configuration (DO NOT MODIFY):
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Auto-discovers all translation files from locales directory
const modules = import.meta.glob('./locales/*/*.json', { eager: true });

// ... builds resources automatically from discovered files
export const availableLanguages = Object.keys(resources);
```

**Key Points:**
- Languages are **auto-discovered** from `src/locales/{lang}/*.json`
- No need to manually register languages - just add files!
- `availableLanguages` is automatically populated
- `LanguageSelector` component uses `availableLanguages` automatically
- **Namespaces are dynamic** - any JSON files in the language folder become available namespaces

### Directory Structure

```
src/locales/
├── en/                       # English (default/fallback) - REFERENCE
│   ├── common.json           # Example namespace
│   ├── auth.json             # Example namespace
│   ├── dashboard.json        # Example namespace
│   ├── *.json                # Any other namespaces...
│   └── [any-page].json       # Pages can have any names!
├── pl/                       # Polish (or another existing language)
│   └── (same files as en/)
└── {new-lang}/               # ← YOUR NEW LANGUAGE GOES HERE
    └── (MUST have same files as reference language)
```

## ⚠️ CRITICAL: DYNAMIC NAMESPACE DISCOVERY ⚠️

**DO NOT assume fixed namespace names!** The project may have any number of translation files.

### Step 0: ALWAYS DISCOVER EXISTING NAMESPACES FIRST

Before creating any files, you MUST:

1. **List the reference language directory** (usually `en/`):
   ```
   List contents of: src/locales/en/
   ```

2. **Identify ALL JSON files** - these are your namespaces to translate

3. **Read each file** to understand its structure and content

4. **Create matching files** in the new language directory

**Example Discovery:**
```
src/locales/en/
├── common.json        ← Namespace: common
├── auth.json          ← Namespace: auth
├── dashboard.json     ← Namespace: dashboard
├── editor.json        ← Namespace: editor
├── myCustomPage.json  ← Namespace: myCustomPage (custom!)
├── reports.json       ← Namespace: reports (custom!)
└── settings.json      ← Namespace: settings (custom!)
```

You MUST create ALL of these files in the new language folder!

## ADDING A NEW LANGUAGE - STEP BY STEP

### Step 1: Identify the Language Code

Use standard ISO 639-1 language codes:

| Language | Code | | Language | Code |
|----------|------|-|----------|------|
| English | `en` | | German | `de` |
| Polish | `pl` | | French | `fr` |
| Spanish | `es` | | Italian | `it` |
| Portuguese | `pt` | | Japanese | `ja` |
| Chinese (Simplified) | `zh` | | Korean | `ko` |
| Russian | `ru` | | Dutch | `nl` |
| Arabic | `ar` | | Hindi | `hi` |
| Ukrainian | `uk` | | Czech | `cs` |
| Turkish | `tr` | | Swedish | `sv` |

### Step 2: Discover Existing Namespaces

**CRITICAL**: List and read all files in `src/locales/en/` (or the fallback language):

```bash
# List all translation namespaces
ls src/locales/en/
```

Read each file to understand its structure before translating.

### Step 3: Create the Language Directory

Create a new directory: `src/locales/{lang-code}/`

Example for Spanish: `src/locales/es/`

### Step 4: Create ALL Namespace Files

For **EACH** JSON file found in Step 2, create a corresponding file in the new language directory with translated content.

**File Creation Pattern:**
```
For each file in src/locales/en/*.json:
    Create src/locales/{new-lang}/{same-filename}.json
    With translated content
```

### Step 5: Translate All Content

**Translation Rules:**
1. **Preserve all JSON keys exactly** - Only translate values
2. **Preserve interpolation variables** - Keep `{{variable}}` as-is
3. **Translate naturally** - Use proper grammar and idioms for the target language
4. **Keep technical terms** when appropriate (e.g., API, HTML, S3)
5. **Match the tone** - Professional but friendly
6. **Preserve nested structure** - Keep object hierarchy identical

**Interpolation Examples:**
```json
// English
"changes": "{{count}} changes pending"
"greeting": "Hello, {{name}}!"
"items": "{{current}} of {{total}} items"

// Spanish (correct - preserves all {{variables}})
"changes": "{{count}} cambios pendientes"
"greeting": "¡Hola, {{name}}!"
"items": "{{current}} de {{total}} elementos"
```

**Nested Object Example:**
```json
// English
{
    "modal": {
        "title": "Create new item",
        "buttons": {
            "save": "Save",
            "cancel": "Cancel"
        }
    }
}

// Spanish (preserves structure exactly)
{
    "modal": {
        "title": "Crear nuevo elemento",
        "buttons": {
            "save": "Guardar",
            "cancel": "Cancelar"
        }
    }
}
```

### Step 6: Verify the Language Appears

After adding the files:
1. The i18n system will auto-detect the new language
2. `availableLanguages` will include the new language code
3. The LanguageSelector will show the new language option
4. No configuration changes needed!

## TRANSLATION FILE PATTERNS

### Common Patterns You May Encounter

**Simple key-value:**
```json
{
    "title": "Page Title",
    "description": "Some description text"
}
```

**Nested objects:**
```json
{
    "section": {
        "header": "Header Text",
        "content": "Content text"
    }
}
```

**Arrays (translate each item):**
```json
{
    "tips": [
        "First tip",
        "Second tip",
        "Third tip"
    ]
}
```

**With interpolation:**
```json
{
    "welcome": "Welcome, {{username}}!",
    "itemCount": "You have {{count}} items",
    "dateFormat": "Created on {{date}}"
}
```

**Pluralization (i18next format):**
```json
{
    "item": "{{count}} item",
    "item_plural": "{{count}} items"
}
```

## TRANSLATION QUALITY GUIDELINES

### Do's ✅
- Use natural, native-sounding phrases
- Keep button text concise
- Translate UI labels appropriately (they may need to be shorter)
- Preserve technical terms when they're commonly used in that language
- Match the formal/informal tone of the English version
- Read the ENTIRE source file before translating

### Don'ts ❌
- Don't machine-translate without review
- Don't change JSON structure or keys
- Don't translate `{{variables}}` or placeholder names
- Don't add or remove keys (must match source exactly)
- Don't change array indices or object structure
- Don't assume which files exist - ALWAYS discover first!

## RIGHT-TO-LEFT (RTL) LANGUAGES

For RTL languages like Arabic (`ar`) or Hebrew (`he`):
- The translations work the same way
- RTL layout is handled by CSS/tailwind `rtl:` variants
- If RTL support isn't implemented yet, note this to the user

## WORKFLOW SUMMARY

```
1. User requests: "Add Spanish language"

2. DISCOVER existing namespaces:
   → List src/locales/en/
   → Found: common.json, auth.json, dashboard.json, reports.json, ...

3. CREATE language directory:
   → mkdir src/locales/es/

4. FOR EACH discovered file:
   → Read src/locales/en/{file}.json
   → Create src/locales/es/{file}.json with translations
   
5. VERIFY:
   → All files from en/ have matching files in es/
   → All keys are preserved
   → All {{variables}} are preserved
```

## OUTPUT CHECKLIST

After adding a new language, verify:

- [ ] **Discovery completed**: Listed all files in reference language folder
- [ ] **Directory created**: `src/locales/{lang}/`
- [ ] **All namespace files created**: One file for EACH file in reference language
- [ ] All JSON files are valid (no syntax errors)
- [ ] All keys from source files are present in translated files
- [ ] Interpolation variables preserved (e.g., `{{count}}`, `{{name}}`)
- [ ] Nested object structures preserved exactly
- [ ] Translations are natural and accurate

## TESTING THE NEW LANGUAGE

To verify the language works:
1. Run the development server: `npm run dev`
2. Open the application in browser
3. Click the language selector (globe icon)
4. The new language should appear in the dropdown
5. Select the new language
6. All UI text should update to the new language

## EXAMPLE: Adding German (de)

### Step 1: Discover namespaces
```
List src/locales/en/
→ Found: common.json, auth.json, myPage.json, settings.json
```

### Step 2: Create directory
```
src/locales/de/
```

### Step 3: Create each file

**`src/locales/de/common.json`** (translated from en/common.json):
```json
{
    "welcome": "Willkommen",
    "language": "Sprache",
    "loading": "Laden...",
    "error": "Ein Fehler ist aufgetreten"
}
```

**`src/locales/de/auth.json`** (translated from en/auth.json):
```json
{
    "sign_in": "Anmelden",
    "sign_out": "Abmelden",
    "welcome": "Willkommen bei {{appName}}"
}
```

**`src/locales/de/myPage.json`** (translated from en/myPage.json):
```json
{
    "title": "Meine Seite",
    "description": "Beschreibungstext hier"
}
```

**`src/locales/de/settings.json`** (translated from en/settings.json):
```json
{
    "title": "Einstellungen",
    "save": "Speichern",
    "cancel": "Abbrechen"
}
```

## Remember

1. **ALWAYS discover existing namespaces first** - never assume which files exist
2. **Create matching files for ALL discovered namespaces**
3. **Preserve all keys, structure, and interpolation variables**
4. The i18n system auto-discovers languages - no config changes needed!
