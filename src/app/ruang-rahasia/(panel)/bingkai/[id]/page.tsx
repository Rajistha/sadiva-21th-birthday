import { FrameEditor } from '@/components/panel/FrameEditor';

export default async function BingkaiEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FrameEditor frameId={id} />;
}
