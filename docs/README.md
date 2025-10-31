# Premium Docs Reader

This is a premium documentation reader built with React, TypeScript, and Tailwind CSS. It parses Insomnia-style YAML documentation and presents it in a beautiful, modern interface.

## Features

- **Premium Design**: Modern, glassy cards with subtle borders and gradients
- **Dark Mode**: Full dark mode support with system preference detection
- **Environment Switching**: Dynamic environment selection with URL template resolution
- **Code Samples**: Auto-generated code samples in cURL, JavaScript (fetch/Axios), and Python
- **Search & Navigation**: Live search with keyboard shortcuts (⌘/Ctrl + K)
- **Responsive**: Mobile-friendly with drawer navigation
- **Deep Linking**: Hash-based navigation to specific endpoints
- **Accessibility**: Semantic HTML with proper ARIA attributes

## YAML Structure Mapping

The application expects Insomnia-style YAML with the following structure:

### Collection Structure
```yaml
collection:
  name: "API Name"
  children:
    endpoint-group:
      name: "Group Name"
      children:
        specific-endpoint:
          name: "Endpoint Name"
          method: "GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS"
          endpoint: "https://api.example.com/v1/users"  # or 'url'
          headers:
            header1:
              name: "Authorization"
              value: "Bearer {{_.token}}"
          parameters:
            param1:
              name: "limit"
              value: "10"
              description: "Number of items to return"
              required: true
          pathParameters:
            param1:
              name: "id"
              value: "123"
              description: "User ID"
              required: true
          body:
            text: '{"name": "John Doe"}'
```

### Environment Structure
```yaml
environments:
  production:
    name: "Production"
    data:
      base_url: "https://api.example.com"
      token: "prod-token-123"
      version: "v1"
  staging:
    name: "Staging"
    data:
      base_url: "https://staging-api.example.com"
      token: "staging-token-456"
      version: "v1"
```

## Template Variables

The application supports template variable resolution using the `{{_.variable}}` syntax:

- Variables are resolved from the selected environment's `data` object
- Templates work in URLs, headers, parameters, and body content
- Example: `{{_.base_url}}/{{_.version}}/users` becomes `https://api.example.com/v1/users`

## UI Components

### Method Badges
Color-coded HTTP method badges:
- GET: Emerald
- POST: Sky Blue
- PUT: Amber
- PATCH: Yellow
- DELETE: Rose
- HEAD: Indigo
- OPTIONS: Purple

### Code Blocks
Dark-themed code blocks with:
- Syntax highlighting
- Copy-to-clipboard functionality
- Language labels
- Responsive overflow handling

### KV Tables
Clean tables for displaying:
- Headers
- Query parameters
- Path parameters
- With support for descriptions and required field indicators

## Navigation

- **Index Page** (`/docs`): Grid of documentation cards
- **Reader Page** (`/docs/[path]`): Full documentation reader
- **Deep Links**: `#endpoint-id` for direct endpoint access
- **Breadcrumbs**: Easy navigation back to index

## Keyboard Shortcuts

- `⌘/Ctrl + K`: Focus search input
- Hash navigation for quick endpoint jumping

## Responsive Design

- **Desktop**: Sticky sidebar navigation
- **Mobile**: Drawer-style navigation with overlay
- **Tablet**: Adaptive layout with collapsible sidebar

## Accessibility Features

- Semantic HTML structure
- ARIA labels and roles
- Focus management
- High contrast ratios
- Screen reader friendly
- Keyboard navigation support

## Performance

- SWR for efficient data fetching and caching
- Intersection Observer for scroll-spy navigation
- Lazy loading and code splitting ready
- Optimized re-renders with React hooks