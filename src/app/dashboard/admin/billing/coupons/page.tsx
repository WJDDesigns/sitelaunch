import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { getAllCoupons } from "@/lib/coupons";
import CouponManager from "./CouponManager";

export default async function AdminCouponsPage() {
  await requireSuperadmin();
  const coupons = await getAllCoupons();

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <Link
          href="/dashboard/admin/billing"
          className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Billing
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          Coupons
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Create and manage discount codes for customers.
        </p>
      </header>

      <CouponManager coupons={coupons} />
    </div>
  );
}
