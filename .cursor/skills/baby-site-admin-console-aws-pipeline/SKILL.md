---
name: baby-site-admin-console-aws-pipeline
description: Monitor and operate the Shoply baby-site/admin-console AWS CodePipeline from the AWS CLI. Use when asked to watch cd-shopping_assistant_by_shopily, inspect CodeBuild failures, collect logs, or approve the ManualApproval stage to start production deployment.
---

# AWS Pipeline Monitor

## Defaults

- Region: `us-west-1`
- Pipeline: `cd-shopping_assistant_by_shopily`
- Build project/action: `BuildAndPushDocker_shopping_assistant_by_shopily`
- Deploy project/action: `Deploy_shopping_assistant_by_shopily`
- Manual approval stage/action: `ManualApproval` / `ApprovalToProd`

## Workflow

1. Confirm identity:

   ```bash
   aws sts get-caller-identity --region us-west-1
   ```

2. Read current pipeline state:

   ```bash
   aws codepipeline get-pipeline-state \
     --name cd-shopping_assistant_by_shopily \
     --region us-west-1
   ```

3. Identify the current execution and active action:

   ```bash
   aws codepipeline list-pipeline-executions \
     --pipeline-name cd-shopping_assistant_by_shopily \
     --region us-west-1 \
     --max-items 5
   ```

4. If `Build` is `InProgress`, poll every 60-120 seconds. Keep the user updated with the execution id, build id, stage, and status.

5. If `Build` fails:
   - Extract the CodeBuild build id from `Build.actionStates[].latestExecution.externalExecutionId`.
   - Fetch build details:

     ```bash
     aws codebuild batch-get-builds --ids '<build-id>' --region us-west-1
     ```

   - Fetch recent CloudWatch logs from the returned `logs.groupName` and `logs.streamName`:

     ```bash
     aws logs get-log-events \
       --log-group-name '<log-group>' \
       --log-stream-name '<log-stream>' \
       --region us-west-1 \
       --limit 200
     ```

   - Summarize the first real error, failing phase, and likely repo or Dockerfile change. If a code fix is needed, inspect the relevant local repo and implement or ask before changing unrelated code.

6. If `ManualApproval` is `InProgress`, approve it:

   ```bash
   aws codepipeline put-approval-result \
     --pipeline-name cd-shopping_assistant_by_shopily \
     --stage-name ManualApproval \
     --action-name ApprovalToProd \
     --result summary='Approved by Codex after successful build',status=Approved \
     --token '<approval-token>' \
     --region us-west-1
   ```

7. After approval, monitor `Deploy` until it succeeds or fails. If deploy fails, debug it the same way as build failures with `codebuild batch-get-builds` and CloudWatch logs.

## Notes

- Do not approve if the current pipeline execution source revisions do not match the intended commit.
- Approval tokens are only available while the approval action is in progress.
- A previous approval or deploy status may belong to an older execution. Always compare `latestExecution.pipelineExecutionId` across stages before deciding what to do.
