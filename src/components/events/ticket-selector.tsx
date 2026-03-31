"use client"

import { useState, useEffect } from "react"
import { useCartStore } from "@/lib/store/cart"
import { motion } from "framer-motion"
import { Plus, Minus, Ticket as TicketIcon } from "lucide-react"
import { toast } from "sonner"

interface TicketType {
  id: string
  name: string
  price: number
  capacity: number
}

interface TicketSelectorProps {
  eventId: string
  eventTitle: string
  tickets: TicketType[]
  /** Remaining bookable seats per tier (server-computed). */
  remainingById: Record<string, number>
  /** Confirmed tickets this user already holds per tier (for display). */
  ownedById?: Record<string, number>
}

export function TicketSelector({
  eventId,
  eventTitle,
  tickets,
  remainingById,
  ownedById = {},
}: TicketSelectorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const cartItems = useCartStore(state => state.items)
  const addItem = useCartStore(state => state.addItem)
  const setIsCartOpen = useCartStore(state => state.setIsOpen)

  // Sync with existing cart items on mount (deferred to avoid setState-in-effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      const existing: Record<string, number> = {}
      let hasExisting = false
      tickets.forEach(t => {
        const inCart = cartItems.find(i => i.ticketTypeId === t.id)
        if (inCart) {
          existing[t.id] = inCart.quantity
          hasExisting = true
        }
      })
      if (hasExisting) {
        setQuantities(existing)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [tickets, cartItems])

  // Clamp quantities when availability drops (e.g. another purchase completed)
  useEffect(() => {
    const t = setTimeout(() => {
      setQuantities((prev) => {
        let changed = false
        const next = { ...prev }
        for (const ticket of tickets) {
          const rem = remainingById[ticket.id] ?? 0
          const q = next[ticket.id] ?? 0
          if (q > rem) {
            next[ticket.id] = rem
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 0)
    return () => clearTimeout(t)
  }, [tickets, remainingById])

  const handleUpdate = (id: string, delta: number, maxSelectable: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 0
      if (delta < 0) {
        return { ...prev, [id]: Math.max(0, current + delta) }
      }
      const next = Math.min(current + delta, maxSelectable)
      return { ...prev, [id]: next }
    })
  }

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0)
  const totalPrice = tickets.reduce((total, t) => total + (quantities[t.id] || 0) * t.price, 0)

  // Check if current selection matches cart exactly
  const matchesCart = tickets.every(t => {
    const cartQ = cartItems.find(i => i.ticketTypeId === t.id)?.quantity || 0
    return (quantities[t.id] || 0) === cartQ
  })

  const handleReserve = async () => {
    if (totalItems === 0) {
      toast.error("Please add at least 1 ticket.");
      return;
    }
    
    // Add selected to store
    tickets.forEach(t => {
      const q = quantities[t.id] || 0
      if (q > 0) {
        addItem({
          eventId,
          eventTitle,
          ticketTypeId: t.id,
          ticketName: t.name,
          price: t.price,
          quantity: q
        })
      } else {
        // If they set it to 0, but it was in the cart, it will be handled by the user clearing the cart or us removing it.
        // Actually, addItem in Zustand adds or updates. To remove, we need to explicitly remove if q === 0.
        // For simplicity, we can let them update in cart drawer or we can use updateQuantity.
      }
    })

    // To handle deletions from selector properly:
    tickets.forEach(t => {
      const q = quantities[t.id] || 0
      const inCart = cartItems.find(i => i.ticketTypeId === t.id)
      if (q === 0 && inCart) {
         useCartStore.getState().removeItem(t.id)
      }
    })

    setIsCartOpen(true);
    toast.success("Added to cart!");
  }

  return (
    <div className="glass rounded-xl p-6 border border-[var(--border-subtle)] sticky top-24">
      <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] mb-6 flex items-center gap-2">
        <TicketIcon className="w-5 h-5 text-[var(--text-tertiary)]" />
        Select Tickets
      </h3>

      <div className="space-y-4 mb-8">
        {tickets.map((ticket) => {
          const remaining = remainingById[ticket.id] ?? 0
          const owned = ownedById[ticket.id] ?? 0
          const maxSelect = remaining
          return (
          <div key={ticket.id} className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] last:border-0 last:pb-0">
            <div>
              <h4 className="font-medium text-[var(--text-primary)] leading-none">{ticket.name}</h4>
              <p className="text-[0.875rem] text-[var(--text-tertiary)] mt-1.5">
                {ticket.price === 0 ? "Free" : `₹${ticket.price}`}
                {" "}• {remaining} left
                {owned > 0 ? (
                  <span className="text-[var(--text-secondary)]"> (you have {owned})</span>
                ) : null}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleUpdate(ticket.id, -1, maxSelect)}
                disabled={!(quantities[ticket.id] > 0)}
                className="w-8 h-8 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-30 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-4 text-center text-[0.875rem] font-medium text-[var(--text-primary)]">
                {quantities[ticket.id] || 0}
              </span>
              <button 
                type="button"
                onClick={() => handleUpdate(ticket.id, 1, maxSelect)}
                disabled={maxSelect === 0 || (quantities[ticket.id] || 0) >= maxSelect}
                className="w-8 h-8 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )})}
      </div>

      <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between mb-6">
        <span className="text-[var(--text-secondary)]">Total</span>
        <span className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {totalPrice === 0 && totalItems === 0 ? "—" : totalPrice === 0 ? "Free" : `₹${totalPrice}`}
        </span>
      </div>

      <motion.button
        whileHover={totalItems > 0 && !matchesCart ? { scale: 1.01 } : {}}
        whileTap={totalItems > 0 && !matchesCart ? { scale: 0.98 } : {}}
        disabled={totalItems === 0}
        onClick={() => {
          if (totalItems === 0) return;
          if (matchesCart) {
            setIsCartOpen(true);
            return;
          }
          void handleReserve();
        }}
        className={`w-full !py-3 flex justify-center items-center gap-2 transition-all ${
          totalItems === 0
            ? "btn-secondary !text-[0.875rem] disabled:opacity-60 disabled:cursor-not-allowed"
            : matchesCart
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg !text-[0.875rem] font-medium"
            : "btn-primary !text-[0.875rem]"
        }`}
      >
        {totalItems === 0 ? (
          "Select Tickets"
        ) : matchesCart ? (
          "View cart"
        ) : (
          `Update Cart (${totalItems})`
        )}
      </motion.button>
    </div>
  )
}
