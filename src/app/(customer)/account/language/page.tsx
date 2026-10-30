import { requireUser } from "@/lib/auth";
import { LanguagePicker } from "@/components/LanguagePicker";
import { SubHead } from "@/components/SetRow";
import { langFor } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function Language() {
  const user = await requireUser();
  return (
    <main className="main app">
      <SubHead back="/account" backLabel="Account" title="Language" />
      <LanguagePicker lang={langFor(user)} next="/account" />
    </main>
  );
}
