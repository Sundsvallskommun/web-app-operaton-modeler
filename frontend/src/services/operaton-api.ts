/*
 * Thin client for the BFF's /api/operaton/* proxy. The BFF holds the OAuth2
 * client_credentials registration that talks to api-service-operaton; the SPA
 * never sees a client secret. Auth between SPA and BFF is the session cookie
 * set by the SAML callback, hence `credentials: 'include'` on every fetch.
 */

export interface DeploymentResponse {
  id: string;
  name: string;
  source?: string;
  deploymentTime?: string;
}

export interface ElementTemplateBinding {
  type: string;
  name: string;
}

export interface ElementTemplateConstraints {
  notEmpty?: boolean;
}

export interface ElementTemplateProperty {
  label: string;
  type: string;
  value?: string;
  editable?: boolean;
  binding: ElementTemplateBinding;
  constraints?: ElementTemplateConstraints;
}

export interface ElementTemplate {
  $schema: string;
  id: string;
  name: string;
  description?: string;
  appliesTo: string[];
  properties: ElementTemplateProperty[];
}

interface Problem {
  title?: string;
  status?: number;
  detail?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;
const OPERATON_BASE = `${API_URL}/operaton`;

const DEFAULT_FETCH_OPTS: RequestInit = {
  credentials: 'include',
};

async function parseProblemMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as Problem;
    return problem.detail ?? problem.title ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function fetchElementTemplates(): Promise<ElementTemplate[]> {
  const response = await fetch(`${OPERATON_BASE}/topics/templates`, { ...DEFAULT_FETCH_OPTS, method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to load element templates: ${await parseProblemMessage(response)}`);
  }
  return (await response.json()) as ElementTemplate[];
}

export interface ProcessDefinitionResponse {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
}

export interface ProcessDefinitionsResponse {
  processDefinitions: ProcessDefinitionResponse[];
}

export async function fetchProcessDefinitions(): Promise<ProcessDefinitionResponse[]> {
  const response = await fetch(`${OPERATON_BASE}/process-definitions`, { ...DEFAULT_FETCH_OPTS, method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to load process definitions: ${await parseProblemMessage(response)}`);
  }
  const body = (await response.json()) as ProcessDefinitionsResponse;
  return body.processDefinitions;
}

export async function fetchProcessDefinitionXml(id: string): Promise<string> {
  const response = await fetch(`${OPERATON_BASE}/process-definitions/${encodeURIComponent(id)}/xml`, {
    ...DEFAULT_FETCH_OPTS,
    method: 'GET',
    headers: { Accept: 'application/xml' },
  });
  if (!response.ok) {
    throw new Error(`Failed to load BPMN XML: ${await parseProblemMessage(response)}`);
  }
  return response.text();
}

export async function deleteDeployment(id: string, cascade: boolean): Promise<void> {
  const response = await fetch(`${OPERATON_BASE}/deployments/${encodeURIComponent(id)}?cascade=${cascade}`, {
    ...DEFAULT_FETCH_OPTS,
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete deployment: ${await parseProblemMessage(response)}`);
  }
}

export async function publishDeployment(xml: string, name: string): Promise<DeploymentResponse> {
  return publishDeploymentWithExtension(xml, name, 'bpmn');
}

/*
 * The Operaton engine inspects the uploaded file's extension to pick a parser
 * (.bpmn → BpmnDeployer, .dmn → DmnDeployer, .form → FormDeployer). The
 * backend just hands the multipart stream straight to RepositoryService, so
 * the only requirement is that the filename uses the correct extension.
 */
export async function publishDeploymentWithExtension(
  xml: string,
  name: string,
  extension: 'bpmn' | 'dmn',
): Promise<DeploymentResponse> {
  const form = new FormData();
  form.append('name', name);
  form.append('file', new Blob([xml], { type: 'application/xml' }), `${name}.${extension}`);

  const response = await fetch(`${OPERATON_BASE}/deployments`, {
    ...DEFAULT_FETCH_OPTS,
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Deploy failed: ${await parseProblemMessage(response)}`);
  }

  return (await response.json()) as DeploymentResponse;
}

export interface DecisionDefinitionResponse {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
}

export interface DecisionDefinitionsResponse {
  decisionDefinitions: DecisionDefinitionResponse[];
}

export async function fetchDecisionDefinitions(): Promise<DecisionDefinitionResponse[]> {
  const response = await fetch(`${OPERATON_BASE}/decision-definitions`, { ...DEFAULT_FETCH_OPTS, method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to load decision definitions: ${await parseProblemMessage(response)}`);
  }
  const body = (await response.json()) as DecisionDefinitionsResponse;
  return body.decisionDefinitions;
}

export async function fetchDecisionDefinitionXml(id: string): Promise<string> {
  const response = await fetch(`${OPERATON_BASE}/decision-definitions/${encodeURIComponent(id)}/xml`, {
    ...DEFAULT_FETCH_OPTS,
    method: 'GET',
    headers: { Accept: 'application/xml' },
  });
  if (!response.ok) {
    throw new Error(`Failed to load DMN XML: ${await parseProblemMessage(response)}`);
  }
  return response.text();
}
