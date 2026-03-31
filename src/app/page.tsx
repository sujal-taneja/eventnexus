import { HeroSection } from "@/components/landing/hero-section";
import { FeaturedEventsSection } from "@/components/landing/featured-events";
import { FeaturesSection } from "@/components/landing/features-section";
import { CTASection } from "@/components/landing/cta-section";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const dbEvents = await prisma.event.findMany({
    include: { 
      tickets: { include: { _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } } }, 
      organizer: true 
    },
    orderBy: { date: "asc" },
    take: 6,
  });

  const events = dbEvents.map((evt) => {
    const lowestPrice = evt.tickets.length > 0 
      ? Math.min(...evt.tickets.map(t => t.price)) 
      : 0;
      
    const totalCapacity = evt.tickets.reduce((sum, t) => sum + t.capacity, 0);
    const confirmedBookings = evt.tickets.reduce((sum, t) => sum + t._count.bookings, 0);

    return {
      id: evt.id,
      title: evt.title,
      // Short date format e.g., "APR 15"
      date: evt.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
      time: evt.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      location: evt.location,
      imageUrl: evt.imageUrl || "",
      category: evt.category,
      price: lowestPrice,
      spotsLeft: Math.max(0, totalCapacity - confirmedBookings),
      totalSpots: totalCapacity,
      organizer: evt.organizer.name || "Organizer"
    };
  });
  return (
    <>
      <HeroSection />
      <FeaturedEventsSection events={events} />
      <FeaturesSection />
      <CTASection />
    </>
  );
}
