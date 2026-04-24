import { redirect } from "next/navigation";

// Admin customer detail -- redirect to the shared partner detail page
// which auto-detects admin context for labeling
export default async function AdminCustomerDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/partners/${id}?from=admin`);
}
