# Engine Room portfolio tracking: Music Video Wizard

This repository has an approved development-plan manifest at `.exechub/project.yml` for Engine Room discovery and measured progress.

## Count and evidence

- **51 merged feature/release PRs:** GitHub PRs #1–47 and #49–52.
- **One superseded, unmerged PR:** #48. It is **not** a completed work unit and is excluded from the denominator; its dependency-audit content is already represented on main.
- **12 production launch and monitoring slots:** PR #53 through #64. Their eventual GitHub merge status, not a document checkbox, is the evidence for development completion.
- **63 distinct roadmap units total:** 51 merged units + 12 remaining slots. This is a planned code-delivery denominator, **not** a percentage of production availability or verified media-generation readiness.

`.exechub/approved-pr-mapping.json` records the exact non-consecutive GitHub PR numbers so consumers do not accidentally count the superseded #48.

The milestone grouping is by chronological delivery sequence, not by the current order of wizard screens:

| Milestone | Roadmap units | GitHub PR evidence |
| --- | ---: | --- |
| Application foundation and creative libraries | 10 | #1–10 |
| Music analysis and creative direction | 11 | #11–21 |
| Storyboarding and media generation | 14 | #22–35 |
| Automatic editing and final export | 7 | #36–42 |
| Release acceptance and operations foundation | 9 | #43–47 and #49–52 |
| Production activation and monitoring | 12 | #53–64 |

## Remaining production rollout work

PR #53 adds a scheduled production readiness probe. PR #54 registers the approved plan with Engine Room. Subsequent work slots should prioritize worker visibility, real Render and Neon deployment acceptance, object-store verification, provider and FFmpeg acceptance, end-to-end paid-provider smoke tests, backup/recovery drills, failure alerts, and final security/usability acceptance. Exact scope may be adjusted in later PRs without misrepresenting unfinished deployment tasks as complete.

Engine Room's GitHub ingestion is expected to recognize this manifest after deployment/reconciliation. **This commit alone does not activate external polling or prove any Render/Neon service is live.** Report production deployment state and observed service health separately from PR completion.

To update the planned denominator or milestones later, create a reviewed manifest version rather than rewriting the meaning of the already approved version.
