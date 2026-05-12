import Link from "next/link";
import { FaUser } from "react-icons/fa";
import { FaShieldHalved } from "react-icons/fa6";

export default function AuthPage() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white/90 p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">UniHub Workshop</h1>
          <p className="mt-1 text-sm text-slate-600">Choose a role to continue</p>
        </div>

        <div className="mt-6 space-y-4">
          <RoleCard
            href="/auth/login?role=student"
            icon={<FaUser />}
            title="Student"
            description="Browse workshops, register, and open QR tickets"
          />
          <RoleCard
            href="/auth/login?role=organizer"
            icon={<FaShieldHalved />}
            title="Organizer"
            description="Manage workshops, sessions, and publish changes"
          />
          <RoleCard
            href="/auth/login?role=checkin"
            icon={<FaShieldHalved />}
            title="Check-in staff"
            description="Validate attendee QR codes and sync door activity"
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-black/10 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-5">
        {icon}
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="text-slate-400">→</div>
    </Link>
  );
}
