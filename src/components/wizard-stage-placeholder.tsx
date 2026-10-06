export function WizardStageShell(props: {
  title: string;
  description: string;
  status: string;
  locked: boolean;
  downstreamImpact: Array<{
    stepKey: string;
    title: string;
    locked: boolean;
  }>;
}) {
  return (
    <div className="wizardEditor">
      {props.downstreamImpact.length ? (
        <div className="impactWarning">
          <strong>Backtracking impact</strong>
          <p>
            When this stage becomes editable, changes here can require review
            of downstream work already present in the project.
          </p>
          <ul>
            {props.downstreamImpact.map((warning) => (
              <li key={warning.stepKey}>
                {warning.title}
                {warning.locked ? " (locked content preserved)" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="wizardStageBoundary">
        <p className="eyebrow">Stage shell</p>
        <h2>{props.title}</h2>
        <p>{props.description}</p>
        <p>
          Persistent navigation, status, backtracking, locking, autosave
          storage, concurrency protection, and downstream-impact handling are
          active for this stage. Its stage-specific domain editor is not part
          of PR 10.
        </p>
        <div className="projectMeta">
          <span>{props.status.replaceAll("_", " ")}</span>
          {props.locked ? <span>Locked</span> : null}
        </div>
      </section>
    </div>
  );
}
