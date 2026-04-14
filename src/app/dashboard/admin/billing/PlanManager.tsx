"use client";

import { useState, useTransition } from "react";
import { savePlanAction, togglePlanActiveAction, deletePlanAction } from "./plan-actions";

interface Plan {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  submissionsMonthlyLimit: number | null;
  features: string[];
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  highlight: boolean;
  sortOrder: number;
}

interface Props {
  plans: Plan[];
}

const INPUT_CLS =
  "block w-full px-3 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all";

export default function PlanManager({ plans: initialPlans }: Props) {
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      {/* Plan list */}
      <div className="divide-y divide-outline-variant/5">
        {initialPlans.map((plan) => (
          <PlanRow
            key={plan.id}
            plan={plan}
            onEdit={() => { setEditing(plan); setCreating(false); }}
          />
        ))}
      </div>

      {/* Add plan button */}
      {!creating && !editing && (
        <div className="px-6 py-4 border-t border-outline-variant/10">
          <button
            onClick={() => { setCreating(true); setEditing(null); }}
            className="flex items-center gap-2 text-xs font-bold text-primary hover:text-on-surface transition-colors"
          >
            <i className="fa-solid fa-plus text-[10px]" /> Add New Plan
          </button>
        </div>
      )}

      {/* Edit / Create form */}
      {(editing || creating) && (
        <div className="border-t border-outline-variant/10">
          <PlanForm
            plan={editing}
            nextOrder={initialPlans.length}
            onClose={() => { setEditing(null); setCreating(false); }}
          />
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    startTransition(async () => {
      await togglePlanActiveAction(plan.id);
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deletePlanAction(plan.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
        setDeleteConfirm(false);
      }
    });
  }

  return (
    <div className={`px-6 py-4 flex items-center gap-4 ${!plan.isActive ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-on-surface">{plan.name}</span>
          <span className="text-xs text-on-surface-variant/60 font-mono">{plan.slug}</span>
          {plan.highlight && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Featured
            </span>
          )}
          {!plan.isActive && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant/60 border border-outline-variant/15">
              Inactive
            </span>
          )}
          {plan.stripePriceId && (
            <span className="text-[10px] text-on-surface-variant/40">
              <i className="fa-brands fa-stripe text-sm" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-on-surface-variant">
            {plan.priceMonthly === 0 ? "Free" : `$${(plan.priceMonthly / 100).toFixed(2)}/mo`}
          </span>
          <span className="text-xs text-on-surface-variant/60">
            {plan.submissionsMonthlyLimit === null ? "Unlimited" : `${plan.submissionsMonthlyLimit} submissions/mo`}
          </span>
          <span className="text-xs text-on-surface-variant/60">
            {plan.features.length} features
          </span>
        </div>
        {error && <p className="text-xs text-error mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          disabled={pending}
          className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50"
        >
          Edit
        </button>
        <button
          onClick={handleToggle}
          disabled={pending}
          className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 transition-all disabled:opacity-50"
        >
          {plan.isActive ? "Deactivate" : "Activate"}
        </button>
        {plan.slug !== "free" && (
          !deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              disabled={pending}
              className="px-3 py-1.5 text-xs font-bold text-error/60 border border-error/20 rounded-lg hover:text-error hover:border-error/40 transition-all disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDelete}
                disabled={pending}
                className="px-3 py-1.5 text-xs font-bold bg-error text-on-primary rounded-lg disabled:opacity-50"
              >
                {pending ? "..." : "Confirm"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs text-on-surface-variant border border-outline-variant/20 rounded-lg"
              >
                Cancel
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function PlanForm({ plan, nextOrder, onClose }: { plan: Plan | null; nextOrder: number; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      try {
        await savePlanAction(formData);
        setMsg("Saved!");
        setTimeout(onClose, 800);
      } catch (err) {
        setMsg(`Error: ${err instanceof Error ? err.message : "Failed"}`);
      }
    });
  }

  return (
    <form action={handleSubmit} className="px-6 py-5 space-y-4 bg-surface-container/30">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          {plan ? "Edit Plan" : "New Plan"}
        </h3>
        <button type="button" onClick={onClose} className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors">
          <i className="fa-solid fa-xmark" /> Close
        </button>
      </div>

      {plan && <input type="hidden" name="plan_id" value={plan.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Slug</span>
          <input
            name="slug"
            required
            defaultValue={plan?.slug ?? ""}
            placeholder="pro"
            disabled={plan?.slug === "free"}
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Display Name</span>
          <input
            name="name"
            required
            defaultValue={plan?.name ?? ""}
            placeholder="Supernova"
            className={INPUT_CLS}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Price ($/month)</span>
          <input
            name="price_monthly"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={plan ? (plan.priceMonthly / 100).toFixed(2) : ""}
            placeholder="149.00"
            className={INPUT_CLS}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Submissions Limit</span>
          <input
            name="submissions_limit"
            defaultValue={plan?.submissionsMonthlyLimit?.toString() ?? "unlimited"}
            placeholder="unlimited"
            className={INPUT_CLS}
          />
          <span className="text-[10px] text-on-surface-variant/40 mt-0.5 block">Leave &quot;unlimited&quot; or enter a number</span>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sort Order</span>
          <input
            name="sort_order"
            type="number"
            defaultValue={plan?.sortOrder ?? nextOrder}
            className={INPUT_CLS}
          />
        </label>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_active" defaultChecked={plan?.isActive ?? true} className="h-4 w-4 rounded" />
            <span className="text-xs text-on-surface">Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="highlight" defaultChecked={plan?.highlight ?? false} className="h-4 w-4 rounded" />
            <span className="text-xs text-on-surface">Featured</span>
          </label>
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Features</span>
        <span className="text-[10px] text-on-surface-variant/40 ml-1">(one per line)</span>
        <textarea
          name="features"
          rows={4}
          defaultValue={plan?.features.join("\n") ?? ""}
          placeholder={"Unlimited submissions\nCustom domain\nBranded emails"}
          className={INPUT_CLS}
        />
      </label>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:shadow-[0_0_15px_rgba(192,193,255,0.3)] transition-all disabled:opacity-50"
        >
          {pending ? (
            <><i className="fa-solid fa-spinner fa-spin text-[10px] mr-1.5" /> Saving &amp; syncing Stripe...</>
          ) : (
            <>{plan ? "Save Changes" : "Create Plan"}</>
          )}
        </button>
        {msg && (
          <span className={`text-xs font-medium ${msg.startsWith("Error") ? "text-error" : "text-tertiary"}`}>
            {msg}
          </span>
        )}
      </div>
    </form>
  );
}
