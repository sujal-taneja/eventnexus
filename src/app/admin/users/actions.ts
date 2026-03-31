"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: "USER" | "ORGANIZER" | "ADMIN") {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Prevent an admin from demoting themselves (failsafe)
  if (userId === session.user.id) {
    throw new Error("You cannot change your own role from this panel.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  revalidatePath("/admin/users");
}
