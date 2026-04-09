import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import DmnModeler from 'dmn-js/lib/Modeler';

import { EMPTY_DMN_DIAGRAM } from './empty-diagram';
import { DecisionDefinitionResponse, publishDeploymentWithExtension } from '@services/operaton-api';
import DecisionListModal from '@components/DecisionListModal/DecisionListModal';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

/*
 * dmn-js editor — sibling to BpmnEditor.
 *
 * Differences vs BpmnEditor:
 *   - No element templates (DMN doesn't have external task workers).
 *   - No properties panel for V1; dmn-js ships rich inline editing for
 *     decision tables (cell editing, +/- column/row buttons in the toolbar
 *     when in table view) which covers ~90% of POC needs without wiring up
 *     dmn-js-properties-panel.
 *   - Uses a single full-width canvas. The DMN modeler internally swaps
 *     between three "active views" (DRD diagram, decision table, literal
 *     expression) when the user clicks into a decision and back out.
 */
export default function DmnEditor() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading', message: 'Loading modeler...' });
  const [deploymentName, setDeploymentName] = useState('new-decision');
  const [publishing, setPublishing] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<DecisionDefinitionResponse | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    let modeler: any;
    let cancelled = false;

    (async () => {
      modeler = new DmnModeler({
        container: canvasRef.current,
        keyboard: { bindTo: window },
      });

      modelerRef.current = modeler;
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
        (window as unknown as { dmnModeler?: unknown }).dmnModeler = modeler;
      }

      try {
        await modeler.importXML(EMPTY_DMN_DIAGRAM);
        if (!cancelled) setStatus({ kind: 'idle' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) setStatus({ kind: 'error', message: `Failed to load diagram: ${message}` });
      }
    })();

    return () => {
      cancelled = true;
      if (modeler) modeler.destroy();
      modelerRef.current = null;
    };
  }, []);

  const onPublish = async () => {
    if (!modelerRef.current) return;
    setPublishing(true);
    setStatus({ kind: 'loading', message: 'Publishing...' });
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (!xml) throw new Error('Modeler returned empty XML');
      const response = await publishDeploymentWithExtension(
        xml,
        deploymentName.trim() || 'unnamed-decision',
        'dmn',
      );
      setStatus({
        kind: 'success',
        message: `Deployed as ${response.id} (${response.name})`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message });
    } finally {
      setPublishing(false);
    }
  };

  const onReset = async () => {
    if (!modelerRef.current) return;
    try {
      await modelerRef.current.importXML(EMPTY_DMN_DIAGRAM);
      setEditingDefinition(null);
      setDeploymentName('new-decision');
      setStatus({ kind: 'idle' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Reset failed: ${message}` });
    }
  };

  const onOpenDefinition = async (xml: string, definition: DecisionDefinitionResponse) => {
    if (!modelerRef.current) return;
    setShowOpenModal(false);
    try {
      await modelerRef.current.importXML(xml);
      setEditingDefinition(definition);
      setDeploymentName(definition.key);
      setStatus({
        kind: 'success',
        message: `Loaded ${definition.name || definition.key} v${definition.version}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Failed to load diagram: ${message}` });
    }
  };

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modelerRef.current) return;
    try {
      const xml = await file.text();
      await modelerRef.current.importXML(xml);
      setEditingDefinition(null);
      setDeploymentName(file.name.replace(/\.dmn$/i, ''));
      setStatus({ kind: 'success', message: `Imported ${file.name}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Failed to import: ${message}` });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onExportFile = async () => {
    if (!modelerRef.current) return;
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (!xml) throw new Error('Modeler returned empty XML');
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deploymentName.trim() || 'decision'}.dmn`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'success', message: `Downloaded ${a.download}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Export failed: ${message}` });
    }
  };

  const secondaryBtn =
    'inline-flex h-36 items-center gap-8 rounded-button border-1 border-divider bg-white px-12 text-sm font-medium text-dark-primary transition hover:bg-gray-lighter disabled:cursor-not-allowed disabled:opacity-50';
  const primaryBtn =
    'inline-flex h-36 items-center rounded-button bg-vattjom-surface-primary px-16 text-sm font-medium text-white transition hover:bg-vattjom-surface-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="modeler-shell">
      <header className="flex h-56 items-center gap-16 border-b-1 border-divider bg-white px-24 shadow-50">
        <div className="flex items-center gap-10">
          <div
            aria-hidden
            className="flex h-32 w-32 items-center justify-center rounded-utility bg-juniskar-surface-primary text-base font-semibold text-white"
          >
            D
          </div>
          <span className="text-base font-semibold text-dark-primary">Operaton DMN Modeler</span>
        </div>

        <div aria-hidden className="h-24 w-[1px] bg-divider" />

        <div className="flex items-center gap-10">
          <label htmlFor="deployment-name" className="text-sm text-dark-secondary">
            Decision name
          </label>
          <input
            id="deployment-name"
            type="text"
            value={deploymentName}
            onChange={(event) => setDeploymentName(event.target.value)}
            spellCheck={false}
            className="h-36 w-[22rem] rounded-button border-1 border-divider bg-white px-12 text-sm text-dark-primary transition focus:border-vattjom-surface-primary focus:outline-none"
          />
          {editingDefinition && (
            <span className="rounded-button bg-vattjom-background-100 px-10 py-4 text-xs font-medium text-vattjom-text-primary">
              Editing: {editingDefinition.key} v{editingDefinition.version}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-8">
          <Link href="/editor" className={secondaryBtn}>
            BPMN
          </Link>
          <button type="button" onClick={onReset} disabled={publishing} className={secondaryBtn}>
            New
          </button>
          <button type="button" onClick={() => setShowOpenModal(true)} disabled={publishing} className={secondaryBtn}>
            Open
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={publishing} className={secondaryBtn}>
            Import
          </button>
          <button type="button" onClick={onExportFile} disabled={publishing} className={secondaryBtn}>
            Export
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dmn,.xml"
            className="hidden"
            onChange={onImportFile}
          />
          <button type="button" onClick={onPublish} disabled={publishing} className={primaryBtn}>
            {publishing ? 'Publishing…' : editingDefinition ? 'Publish new version' : 'Publish'}
          </button>
        </div>
      </header>
      <div className="modeler-body modeler-body--single">
        <div ref={canvasRef} className="modeler-canvas" />
      </div>
      {status.kind !== 'idle' && (
        <div className={`modeler-status ${status.kind === 'error' ? 'error' : status.kind === 'success' ? 'success' : ''}`}>
          {status.message}
        </div>
      )}
      {showOpenModal && (
        <DecisionListModal onClose={() => setShowOpenModal(false)} onOpen={onOpenDefinition} />
      )}
    </div>
  );
}
