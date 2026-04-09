import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  CamundaPlatformPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import { ElementTemplatesPropertiesProviderModule } from 'bpmn-js-element-templates';
import ElementTemplateChooserModule from '@bpmn-io/element-template-chooser';
import CamundaModdle from 'camunda-bpmn-moddle/resources/camunda';

import { EMPTY_BPMN_DIAGRAM } from './empty-diagram';
import { ElementTemplate, ProcessDefinitionResponse, fetchElementTemplates, publishDeployment } from '@services/operaton-api';
import ProcessListModal from '@components/ProcessListModal/ProcessListModal';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function BpmnEditor() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading', message: 'Loading modeler...' });
  const [deploymentName, setDeploymentName] = useState('new-process');
  const [templates, setTemplates] = useState<ElementTemplate[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<ProcessDefinitionResponse | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !propertiesRef.current) {
      return;
    }

    let modeler: any;
    let cancelled = false;

    (async () => {
      let loadedTemplates: ElementTemplate[] = [];
      try {
        loadedTemplates = await fetchElementTemplates();
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setStatus({
          kind: 'error',
          message: `${message}. The modeler will still load, but no element templates are available.`,
        });
      }

      if (cancelled) return;

      modeler = new BpmnModeler({
        container: canvasRef.current,
        propertiesPanel: { parent: propertiesRef.current },
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
          CamundaPlatformPropertiesProviderModule,
          ElementTemplatesPropertiesProviderModule,
          ElementTemplateChooserModule,
        ],
        moddleExtensions: {
          camunda: CamundaModdle,
        },
      });

      modelerRef.current = modeler;
      // Dev-only: expose modeler on window for browser-driven testing
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
        (window as unknown as { bpmnModeler?: unknown }).bpmnModeler = modeler;
      }
      setTemplates(loadedTemplates);

      if (loadedTemplates.length > 0) {
        try {
          modeler.get('elementTemplatesLoader').setTemplates(loadedTemplates);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Could not set element templates:', error);
        }
      }

      try {
        await modeler.importXML(EMPTY_BPMN_DIAGRAM);
        const canvas = modeler.get('canvas');
        canvas.zoom('fit-viewport');
        if (!cancelled && loadedTemplates.length > 0) {
          setStatus({
            kind: 'idle',
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus({ kind: 'error', message: `Failed to load diagram: ${message}` });
      }
    })();

    return () => {
      cancelled = true;
      if (modeler) {
        modeler.destroy();
      }
      modelerRef.current = null;
    };
  }, []);

  const onPublish = async () => {
    if (!modelerRef.current) return;
    setPublishing(true);
    setStatus({ kind: 'loading', message: 'Publishing...' });
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      if (!xml) {
        throw new Error('Modeler returned empty XML');
      }
      const response = await publishDeployment(xml, deploymentName.trim() || 'unnamed-process');
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
      await modelerRef.current.importXML(EMPTY_BPMN_DIAGRAM);
      modelerRef.current.get('canvas').zoom('fit-viewport');
      setEditingDefinition(null);
      setDeploymentName('new-process');
      setStatus({ kind: 'idle' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Reset failed: ${message}` });
    }
  };

  const onOpenDefinition = async (xml: string, definition: ProcessDefinitionResponse) => {
    if (!modelerRef.current) return;
    setShowOpenModal(false);
    try {
      await modelerRef.current.importXML(xml);
      modelerRef.current.get('canvas').zoom('fit-viewport');
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
      modelerRef.current.get('canvas').zoom('fit-viewport');
      setEditingDefinition(null);
      setDeploymentName(file.name.replace(/\.bpmn$/i, ''));
      setStatus({ kind: 'success', message: `Imported ${file.name}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Failed to import: ${message}` });
    }
    // Reset the input so the same file can be re-imported
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
      a.download = `${deploymentName.trim() || 'process'}.bpmn`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'success', message: `Downloaded ${a.download}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Export failed: ${message}` });
    }
  };

  const onApplyTemplate = () => {
    if (!modelerRef.current) return;
    const selection = modelerRef.current.get('selection').get();
    if (selection.length === 0) {
      setStatus({
        kind: 'error',
        message: 'Select a Service Task on the canvas before applying a template.',
      });
      return;
    }
    try {
      modelerRef.current.get('elementTemplateChooser').open(selection[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message: `Could not open template chooser: ${message}` });
    }
  };

  /*
   * All classes below use @sk-web-gui tokens — no arbitrary hex values, no
   * Tailwind defaults that got replaced by the preset. Notes:
   *
   * - sk sets `html { font-size: 0.625em }` (1rem = 10px), and its spacing
   *   scale is linear: `h-56` → 5.6rem → 56px, `h-36` → 36px, `px-24` → 24px.
   *   Whatever pixel size you want, the class name is literally that number.
   * - sk replaces Tailwind's default `borderWidth` scale, so write `border-1`
   *   (not `border`) for a 1px border — same pattern used by
   *   web-app-dispatch-portal.
   * - Colors: use the Sundsvall primary `vattjom-surface-primary` (+ `-hover`),
   *   the neutral aliases `dark-primary` / `dark-secondary` for text,
   *   `gray-lighter` for subtle fills, and `divider` for borders.
   * - Radii are named tokens: `rounded-utility` (8px), `rounded-button`
   *   (12px), `rounded-circular` (fully round). No `rounded-md` etc.
   */
  const secondaryBtn =
    'inline-flex h-36 items-center gap-8 rounded-button border-1 border-divider bg-white px-12 text-sm font-medium text-dark-primary transition hover:bg-gray-lighter disabled:cursor-not-allowed disabled:opacity-50';
  const primaryBtn =
    'inline-flex h-36 items-center rounded-button bg-vattjom-surface-primary px-16 text-sm font-medium text-white transition hover:bg-vattjom-surface-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="modeler-shell">
      <header className="flex h-56 items-center gap-16 border-b-1 border-divider bg-white px-24 shadow-50">
        {/* Brand */}
        <div className="flex items-center gap-10">
          <div
            aria-hidden
            className="flex h-32 w-32 items-center justify-center rounded-utility bg-vattjom-surface-primary text-base font-semibold text-white"
          >
            O
          </div>
          <span className="text-base font-semibold text-dark-primary">Operaton Modeler</span>
        </div>

        <div aria-hidden className="h-24 w-[1px] bg-divider" />

        {/* Name field + editing indicator */}
        <div className="flex items-center gap-10">
          <label htmlFor="deployment-name" className="text-sm text-dark-secondary">
            Process name
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

        {/* Actions */}
        <div className="flex items-center gap-8">
          <Link href="/dmn" className={secondaryBtn}>
            DMN
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
            accept=".bpmn,.xml"
            className="hidden"
            onChange={onImportFile}
          />
          <button
            type="button"
            onClick={onApplyTemplate}
            disabled={publishing || templates.length === 0}
            className={secondaryBtn}
          >
            <span>Apply template</span>
            <span className="inline-flex h-20 min-w-[2rem] items-center justify-center rounded-circular bg-gray-lighter px-6 text-xs font-semibold text-dark-secondary">
              {templates.length}
            </span>
          </button>
          <button type="button" onClick={onPublish} disabled={publishing} className={primaryBtn}>
            {publishing ? 'Publishing…' : editingDefinition ? 'Publish new version' : 'Publish'}
          </button>
        </div>
      </header>
      <div className="modeler-body">
        <div ref={canvasRef} className="modeler-canvas" />
        <div ref={propertiesRef} className="modeler-properties" />
      </div>
      {status.kind !== 'idle' && (
        <div className={`modeler-status ${status.kind === 'error' ? 'error' : status.kind === 'success' ? 'success' : ''}`}>
          {status.message}
        </div>
      )}
      {showOpenModal && (
        <ProcessListModal
          onClose={() => setShowOpenModal(false)}
          onOpen={onOpenDefinition}
        />
      )}
    </div>
  );
}
