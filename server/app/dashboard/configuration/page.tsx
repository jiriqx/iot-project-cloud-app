import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ConfigurationClient } from "./_components/ConfigurationClient";

export default async function ConfigurationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const zones = await prisma.zone.findMany({
    where: { ownerId: session.user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Konfigurace zón</h1>
        <ConfigurationClient zones={zones} />
      </div>
    </div>
  );
}