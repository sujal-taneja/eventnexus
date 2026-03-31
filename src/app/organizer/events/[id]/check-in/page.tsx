import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { EventCheckInScanner } from "@/components/organizer/event-check-in-scanner";

export default async function OrganizerCheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const event = await prisma.event.findFirst({
    where: { id, organizerId: session.user.id },
    select: { id: true, title: true },
  });
  if (!event) notFound();

  return <EventCheckInScanner eventId={event.id} eventTitle={event.title} />;
}
