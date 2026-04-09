/*
 * Minimal blank DMN 1.3 diagram with one decision and a 1x1 decision table.
 * Loaded on mount so the modeler has a valid root to render. The user can
 * rename the decision, add inputs/outputs, and add rules from the toolbar
 * inside the decision-table view.
 *
 * Operaton uses the same DMN 1.3 schema as Camunda 7, with the same
 * `camunda:` namespace for engine extensions (history time to live, etc.).
 */
export const EMPTY_DMN_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
  xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
  xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
  xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/"
  xmlns:camunda="http://camunda.org/schema/1.0/dmn"
  id="Definitions_1"
  name="DRD"
  namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="New Decision" camunda:historyTimeToLive="180">
    <decisionTable id="DecisionTable_1" hitPolicy="UNIQUE">
      <input id="Input_1" label="Input">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="Output_1" label="Output" name="output" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_1">
      <dmndi:DMNShape id="DMNShape_Decision_1" dmnElementRef="Decision_1">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;
