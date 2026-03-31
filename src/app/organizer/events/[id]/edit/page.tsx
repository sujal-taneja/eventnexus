import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { EditEventForm } from "@/components/organizer/edit-event-form";
import { toDatetimeLocalValue } from "@/lib/datetime-local";

export default async function EditOrganizerEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const event = await prisma.event.findFirst({
    where: { id, organizerId: session.user.id },
  });
  if (!event) notFound();

  return (
    <EditEventForm
      eventId={event.id}
      initial={{
        title: event.title,
        description: event.description,
        datetimeLocal: toDatetimeLocalValue(new Date(event.date)),
        location: event.location,
        imageUrl: event.imageUrl,
        category: event.category,
      }}
    />
  );
}
