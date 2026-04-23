import { redirect } from "next/navigation";
import { joinCampaign } from "../actions";

export const dynamic = "force-dynamic";

export default async function JoinCampaign({
  params,
}: {
  params: { slug: string };
}) {
  const result = await joinCampaign({ slug: params.slug });
  if ("error" in result) {
    if (result.needsLogin) {
      redirect(
        `/auth/login?next=${encodeURIComponent(`/campaign/${params.slug}`)}`,
      );
    }
    redirect(
      `/campaign/${params.slug}?error=${encodeURIComponent(result.error)}`,
    );
  }
  redirect(`/projects/${result.projectId}`);
}
