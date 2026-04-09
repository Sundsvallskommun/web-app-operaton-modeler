import dynamic from 'next/dynamic';

/*
 * dmn-js, like bpmn-js, mutates the DOM at construction time. SSR-safe import
 * mirrors what /editor (the BPMN page) does.
 */
const DmnEditor = dynamic(() => import('@components/DmnEditor/DmnEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-gray-500">Loading DMN editor...</div>
  ),
});

export default function DmnPage() {
  return <DmnEditor />;
}
