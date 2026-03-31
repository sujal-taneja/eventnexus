"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleEventStatus(eventId: string, newStatus: boolean) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { isActive: newStatus },
  });

  revalidatePath("/admin/events");
}
