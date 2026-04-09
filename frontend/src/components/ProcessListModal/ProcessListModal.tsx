import { useEffect, useState } from 'react';
import {
  ProcessDefinitionResponse,
  fetchProcessDefinitions,
  fetchProcessDefinitionXml,
  deleteDeployment,
} from '@services/operaton-api';

interface ProcessListModalProps {
  onClose: () => void;
  onOpen: (xml: string, definition: ProcessDefinitionResponse) => void;
}

export default function ProcessListModal({ onClose, onOpen }: ProcessListModalProps) {
  const [definitions, setDefinitions] = useState<ProcessDefinitionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProcessDefinitionResponse | null>(null);

  const loadDefinitions = async () => {
    setLoading(true);
    setError(null);
    try {
      const defs = await fetchProcessDefinitions();
      setDefinitions(defs.sort((a, b) => a.key.localeCompare(b.key) || b.version - a.version));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefinitions();
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleOpen = async (def: ProcessDefinitionResponse) => {
    setActionInProgress(def.id);
    setError(null);
    try {
      const xml = await fetchProcessDefinitionXml(def.id);
      onOpen(xml, def);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (def: ProcessDefinitionResponse) => {
    setActionInProgress(def.deploymentId);
    setError(null);
    try {
      await deleteDeployment(def.deploymentId, true);
      setConfirmDelete(null);
      await loadDefinitions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionInProgress(null);
    }
  };

  const secondaryBtn =
    'inline-flex h-32 items-center rounded-button border-1 border-divider bg-white px-10 text-sm font-medium text-dark-primary transition hover:bg-gray-lighter disabled:cursor-not-allowed disabled:opacity-50';
  const dangerBtn =
    'inline-flex h-32 items-center rounded-button bg-error-surface-primary px-10 text-sm font-medium text-white transition hover:bg-error-surface-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[70vh] w-[60rem] overflow-hidden rounded-cards bg-white shadow-200">
        <div className="flex items-center justify-between border-b-1 border-divider px-24 py-16">
          <h2 className="text-h4-sm font-semibold text-dark-primary">Process definitions</h2>
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Close
          </button>
        </div>

        <div className="max-h-[calc(70vh-8rem)] overflow-y-auto">
          {loading && <div className="px-24 py-16 text-sm text-dark-secondary">Loading...</div>}

          {error && (
            <div className="mx-24 mt-16 rounded-utility bg-error-background-100 px-16 py-10 text-sm text-error">
              {error}
            </div>
          )}

          {!loading && definitions.length === 0 && (
            <div className="px-24 py-16 text-sm text-dark-secondary">
              No process definitions found. Publish a diagram first.
            </div>
          )}

          {!loading && definitions.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-1 border-divider text-left text-dark-secondary">
                  <th className="px-24 py-10 font-medium">Name</th>
                  <th className="px-12 py-10 font-medium">Key</th>
                  <th className="px-12 py-10 font-medium">Version</th>
                  <th className="px-24 py-10 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {definitions.map((def) => (
                  <tr key={def.id} className="border-b-1 border-divider hover:bg-gray-lighter">
                    <td className="px-24 py-10 text-dark-primary">{def.name || def.key}</td>
                    <td className="px-12 py-10 font-mono text-dark-secondary">{def.key}</td>
                    <td className="px-12 py-10 text-dark-secondary">v{def.version}</td>
                    <td className="flex items-center justify-end gap-8 px-24 py-10">
                      {confirmDelete?.id === def.id ? (
                        <>
                          <span className="text-xs text-error">Delete? Running instances will be terminated.</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(def)}
                            disabled={actionInProgress === def.deploymentId}
                            className={dangerBtn}
                          >
                            {actionInProgress === def.deploymentId ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className={secondaryBtn}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpen(def)}
                            disabled={!!actionInProgress}
                            className={secondaryBtn}
                          >
                            {actionInProgress === def.id ? 'Loading...' : 'Open'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(def)}
                            disabled={!!actionInProgress}
                            className={secondaryBtn}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
