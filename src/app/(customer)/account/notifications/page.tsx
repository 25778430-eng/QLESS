import { requireUser } from "@/lib/auth";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { PushToggle } from "@/components/PushToggle";
import { SubHead } from "@/components/SetRow";
import { updateNotifications } from "../actions";

export const dynamic = "force-dynamic";

export default async function Notifications({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const user = await requireUser();
  return (
    <main className="main app">
      <SubHead back="/account" backLabel="Account" title="Notifications" />
      <Messages searchParams={searchParams} />
      <form action={updateNotifications} className="stack" style={{ gap: 12 }}>
        <div className="card stack">
          <label className="check"><input type="checkbox" name="consentReminders" defaultChecked={user.consentReminders} /> Booking updates and reminders</label>
          <label className="check"><input type="checkbox" name="notifySms" defaultChecked={user.notifySms} /> By SMS</label>
          <label className="check"><input type="checkbox" name="notifyWhatsapp" defaultChecked={user.notifyWhatsapp} /> By WhatsApp</label>
          <label className="check"><input type="checkbox" name="consentOffers" defaultChecked={user.consentOffers} /> Offers from places I&apos;ve visited</label>
        </div>
        <div className="card stack">
          <label className="check"><input type="checkbox" name="lowData" defaultChecked={user.lowData} /> Data saver (don&apos;t load shop photos)</label>
        </div>
        <Submit>Save</Submit>
      </form>
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </main>
  );
}
