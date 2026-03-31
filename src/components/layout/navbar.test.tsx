import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Navbar } from './navbar'
import { useSession } from 'next-auth/react'

// Mock next/image and next/link
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

describe('Navbar Authentication State', () => {
  it('renders Log in and Sign up buttons when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn()
    })
    
    render(<Navbar />)
    
    // Desktop layout assertions
    expect(screen.getAllByText('Log in').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sign up').length).toBeGreaterThan(0)
  })

  it('renders Sign out and dashboard avatar link when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { 
        user: { name: 'John Doe', email: 'john@example.com', id: '1', role: 'USER' }, 
        expires: '2026-12-31T23:59:59.999Z' 
      },
      status: 'authenticated',
      update: vi.fn()
    })
    
    render(<Navbar />)
    
    expect(screen.getAllByText('Sign out').length).toBeGreaterThan(0)
    const dash = screen.getByLabelText('Open your dashboard: tickets and QR codes')
    expect(dash).toHaveAttribute('href', '/dashboard')
  })
})
