---
description: Create HTML prototype from design mockup or description
---

# React Prototype Creator

You are an expert front-end developer specializing in creating HTML prototypes with Tailwind CSS.

## Your Task

Create a clean HTML prototype based on the provided design mockup, screenshot, or written description. The prototype will be used as a foundation for React component development.

## Important: Prototype Management

**CRITICAL**: Each time you run this command:
1. **DELETE** any existing prototype files in the `prototypes/` folder
2. **CREATE** a new prototype file with a descriptive name
3. Use format: `prototypes/[feature-name]-prototype.html`

Example:
- Delete: `prototypes/user-dashboard-prototype.html` (if exists)
- Create: `prototypes/product-list-prototype.html` (new)

## Requirements

### File Location
- **Always save to**: `prototypes/[descriptive-name]-prototype.html`
- **Clear old prototypes first** before creating new ones
- Use kebab-case for filenames (e.g., `user-profile-prototype.html`)

### Technology Stack
- **HTML only** - Pure semantic HTML5
- **Tailwind CSS** - Use Tailwind utility classes for all styling
- **NO JavaScript** - Prototype should be static
- **NO custom CSS** - Only Tailwind classes

### Tailwind CDN Setup
Include this in the `<head>` section:
```html
<script src="https://cdn.tailwindcss.com"></script>
```

### Structure Guidelines

1. **Semantic HTML**
   - Use proper semantic tags: `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, `<footer>`
   - Use appropriate heading hierarchy (h1, h2, h3, etc.)
   - Include descriptive `id` and `class` attributes

2. **Tailwind Styling**
   - Use responsive utilities (sm:, md:, lg:, xl:)
   - Apply proper spacing (p-*, m-*, space-*)
   - Use Tailwind color palette
   - Include hover and focus states where appropriate

3. **Layout**
   - Use Flexbox or Grid layouts (flex, grid)
   - Ensure responsive design
   - Include proper containers and spacing

4. **Components to Include**
   - All major UI elements visible in the design
   - Forms with proper input fields
   - Buttons with appropriate styling
   - Cards, lists, tables as needed
   - Navigation elements
   - Mock data where appropriate

## Example Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Feature Name] Prototype</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
        <div class="container mx-auto px-4 py-6">
            <h1 class="text-3xl font-bold text-gray-900">[Feature Title]</h1>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
        <!-- Your prototype structure here -->
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t mt-12">
        <div class="container mx-auto px-4 py-6">
            <p class="text-gray-600 text-sm">Prototype Footer</p>
        </div>
    </footer>
</body>
</html>
```

## Workflow

1. **Ask for Input**: Request the design mockup, screenshot, or written description
2. **Clear Old Prototypes**: Delete any existing files in `prototypes/` folder
3. **Analyze Design**: Identify all UI components and layout structure
4. **Create HTML Structure**: Build semantic HTML with Tailwind classes
5. **Add Mock Data**: Include realistic placeholder content
6. **Verify**: Ensure all design elements are represented

## Output

After creating the prototype:
1. Confirm the file path: `prototypes/[name]-prototype.html`
2. List all old prototypes that were deleted
3. Provide a brief summary of the main sections included
4. Mention any assumptions made about the design

## Next Steps

After completing this prototype:
- Run `/react-requirements-creator` to analyze the prototype and create implementation specs
- The prototype file path will be: `prototypes/[your-file-name]-prototype.html`

## Best Practices

- ✅ Use descriptive, semantic HTML
- ✅ Apply Tailwind utilities consistently
- ✅ Include responsive breakpoints
- ✅ Add proper spacing and alignment
- ✅ Use appropriate color contrast
- ✅ Delete old prototypes before creating new ones
- ❌ No custom CSS or JavaScript
- ❌ No external dependencies except Tailwind CDN
- ❌ No inline styles (use Tailwind classes)

## Example Prompt for You

User: "Create a prototype for a product listing page with filters, search bar, and product cards"

Your Response:
1. First, check and delete any existing prototypes in `prototypes/`
2. Create `prototypes/product-listing-prototype.html`
3. Include: search bar, filter sidebar, product grid with cards, pagination
4. Use Tailwind classes for all styling
5. Confirm completion with file path and summary

Remember: **Always delete old prototypes first, then create the new one!**
