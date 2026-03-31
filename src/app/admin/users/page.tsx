import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUserRole } from "./actions";

export default async function AdminUsersPage() {
  const session = await auth();
  const currentUserId = session!.user.id;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Users & Roles</h1>
        <p className="text-[var(--text-secondary)]">
          Manage user accounts and escalate privileges for Organizers.
        </p>
      </div>

      <div className="glass-card overflow-hidden">
         <div className="overflow-x-auto p-1">
           <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                 <tr>
                   <th className="px-6 py-4 font-medium">User Details</th>
                   <th className="px-6 py-4 font-medium">Authentication</th>
                   <th className="px-6 py-4 font-medium">Joined Date</th>
                   <th className="px-6 py-4 font-medium">System Role</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                 {users.map((u) => (
                   <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                     <td className="px-6 py-4">
                       <div className="font-medium text-white">{u.name || "Unknown"}</div>
                       <div className="text-[0.8125rem] text-[var(--text-tertiary)]">{u.email}</div>
                     </td>
                     <td className="px-6 py-4">
                       <span className="inline-flex items-center px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-black/40 text-[0.75rem]">
                         OAuth
                       </span>
                     </td>
                     <td className="px-6 py-4 text-[var(--text-tertiary)] flex items-center h-full">
                       {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                     </td>
                     <td className="px-6 py-4">
                       <form action={async (formData) => {
                          "use server";
                          const newRole = formData.get("role") as "USER" | "ORGANIZER" | "ADMIN";
                          await updateUserRole(u.id, newRole);
                       }}>
                         <select
                           name="role"
                           defaultValue={u.role}
                           disabled={u.id === currentUserId}
                           onChange={(e) => e.target.form?.requestSubmit()} // Auto-submits the form
                           className="bg-black/60 border border-[var(--border-subtle)] rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] focus:text-white outline-none disabled:opacity-50 cursor-pointer w-32"
                         >
                           <option value="USER">User</option>
                           <option value="ORGANIZER">Organizer</option>
                           <option value="ADMIN">Admin</option>
                         </select>
                       </form>
                     </td>
                   </tr>
                 ))}
              </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
