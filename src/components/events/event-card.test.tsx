import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EventCard } from './event-card'

// Mock next/image and next/link
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode, href: string }) => <a href={href}>{children}</a>
}))

describe('EventCard', () => {
  const defaultProps = {
    id: 'e1',
    title: 'Awesome Tech Conference 2026',
    date: 'Dec 15, 2026',
    time: '09:00 AM',
    location: 'Silicon Valley, CA',
    imageUrl: '/placeholder.jpg',
    category: 'Tech',
    price: 299,
    spotsLeft: 42,
    totalSpots: 500,
    organizer: 'TechCorp'
  }

  it('renders all core event information correctly', () => {
    render(<EventCard {...defaultProps} />)
    
    expect(screen.getByText('Awesome Tech Conference 2026')).toBeInTheDocument()
    expect(screen.getByText('Dec 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('Tech')).toBeInTheDocument()
    expect(screen.getByText('₹299')).toBeInTheDocument()
  })

  it('displays "Free" when price is 0', () => {
    render(<EventCard {...defaultProps} price={0} />)
    
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('displays spots left efficiently', () => {
    render(<EventCard {...defaultProps} spotsLeft={12} />)
    
    expect(screen.getByText('12 spots left')).toBeInTheDocument()
  })
})
