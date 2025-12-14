# Frontend Guidelines - 378625e7-3833-4ff4-9ee6-3baec4a915ab

## Design Philosophy

### Elegant UI Principles
- **Simplicity**: Keep interfaces clean and uncluttered
- **Consistency**: Maintain uniform design patterns throughout
- **Hierarchy**: Use visual hierarchy to guide user attention
- **Whitespace**: Use spacing effectively for readability
- **Feedback**: Provide clear feedback for user actions

### Design Theme Consistency
- Use a consistent color palette defined in your CSS variables
- Maintain uniform typography (font families, sizes, weights)
- Apply consistent spacing system (use rem/em units)
- Keep border radius, shadows, and transitions uniform
- Use consistent iconography style throughout

## Component Guidelines

### Component Structure
- One component per file
- Keep components under 200 lines
- Extract reusable logic into composables/hooks
- Use TypeScript for type safety

### Naming Conventions
- **Components**: PascalCase (e.g., `UserProfile.vue`, `UserProfile.tsx`)
- **Files**: kebab-case for utilities (e.g., `api-client.ts`)
- **CSS Classes**: Use consistent methodology (BEM or utility-first)
- **Variables**: camelCase for JavaScript, kebab-case for CSS

### Styling Best Practices
```css
/* Define CSS variables for consistency */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-accent: #8b5cf6;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

### Responsive Design
- Mobile-first approach
- Use CSS Grid and Flexbox for layouts
- Define breakpoints consistently
- Test on multiple screen sizes


## Next.js + TypeScript Guidelines

### App Router Conventions
```typescript
// app/users/page.tsx - Server Component by default
import { Suspense } from 'react'

interface PageProps {
  searchParams: { q?: string }
}

export default async function UsersPage({ searchParams }: PageProps) {
  const users = await getUsers(searchParams.q)

  return (
    <main>
      <h1>Users</h1>
      <Suspense fallback={<UsersSkeleton />}>
        <UsersList users={users} />
      </Suspense>
    </main>
  )
}

// Metadata
export const metadata = {
  title: 'Users',
  description: 'Browse all users'
}
```

### Server Actions
```typescript
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string

  // Validate
  if (!name || !email) {
    return { error: 'Name and email required' }
  }

  // Create user
  await db.user.create({ data: { name, email } })

  // Revalidate and redirect
  revalidatePath('/users')
  redirect('/users')
}
```

### Client Components
```typescript
// components/SearchInput.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export function SearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }

    startTransition(() => {
      router.push(`/users?${params.toString()}`)
    })
  }

  return (
    <input
      type="search"
      placeholder="Search..."
      onChange={(e) => handleSearch(e.target.value)}
      className={isPending ? 'opacity-50' : ''}
    />
  )
}
```

### Loading and Error States
```typescript
// app/users/loading.tsx
export default function Loading() {
  return <div className="skeleton">Loading users...</div>
}

// app/users/error.tsx
'use client'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### API Routes
```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  const users = await db.user.findMany({
    where: query ? { name: { contains: query } } : undefined
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const user = await db.user.create({ data: body })

  return NextResponse.json(user, { status: 201 })
}
```


## State Management
- Keep state as local as possible
- Lift state only when necessary
- Use global state sparingly
- Implement loading and error states

## Performance
- Lazy load routes and heavy components
- Optimize images and assets
- Minimize bundle size
- Use proper caching strategies

## Accessibility
- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Test with screen readers

## API Integration
- Centralize API calls in a service layer
- Handle loading and error states consistently
- Implement proper request/response typing
- Use environment variables for API URLs
