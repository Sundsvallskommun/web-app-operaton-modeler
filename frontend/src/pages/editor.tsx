import dynamic from 'next/dynamic';

/*
 * bpmn-js manipulates the DOM directly at construction time, which breaks
 * Next.js SSR. `ssr: false` forces client-only rendering so the Modeler is
 * constructed in the browser after hydration.
 */
const BpmnEditor = dynamic(() => import('@components/BpmnEditor/BpmnEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-gray-500">Loading BPMN editor...</div>
  ),
});

export default function EditorPage() {
  return <BpmnEditor />;
}
