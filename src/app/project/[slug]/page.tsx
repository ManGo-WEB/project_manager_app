import { ProjectDetailView } from "@/components/ProjectDetailView";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <ProjectDetailView slug={slug} />
    </main>
  );
}
