import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
      <div className="max-w-xl text-center">
        <h1 className="mb-4 text-3xl font-semibold">Operaton BPMN Modeler</h1>
        <p className="mb-6 text-gray-600">
          A browser-based BPMN editor for Sundsvall&apos;s Operaton service. Drop a Service Task, apply one of the
          registered worker templates (Send Email, Send Sms, Create Errand, Log Message), and publish directly to{' '}
          <code>api-service-operaton</code>.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/editor"
            className="inline-block rounded-md bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            BPMN Editor
          </Link>
          <Link
            href="/dmn"
            className="inline-block rounded-md border border-blue-700 px-5 py-3 font-medium text-blue-700 hover:bg-blue-50"
          >
            DMN Editor
          </Link>
        </div>
      </div>
    </main>
  );
}
