/*
 * The bpmn-js family of packages ships limited/no TypeScript definitions.
 * Declare the modules we consume so the compiler doesn't complain. We cast
 * the imported constructors/modules to `any` at the call site — proper
 * typings can be added when the upstream .d.ts catches up.
 */
declare module 'bpmn-js/lib/Modeler';
declare module 'bpmn-js-properties-panel';
declare module 'bpmn-js-element-templates';
declare module '@bpmn-io/element-template-chooser';
declare module 'camunda-bpmn-moddle/resources/camunda';
declare module 'dmn-js/lib/Modeler';
declare module 'dmn-js-properties-panel';
declare module 'dmn-js-shared/lib/util/ModelUtil';
