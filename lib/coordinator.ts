/**
 * Multi-Agent System (Step 11): Coordinator logic.
 * Decomposes brief into sub-tasks, dispatches Hunter + Scholar, aggregates into Elite Expert Profile.
 * All agents read/write the Blackboard (AgentTaskState); no direct agent-to-agent communication.
 */

import { prisma } from '@/lib/prisma';
import { AGENT_PROMPTS } from '@/lib/agent-prompts';
import { completeChat } from '@/lib/openai';
import type { AgentStatus } from '@prisma/client';

const AGENT_STATUS = {
  IDLE: 'IDLE' as AgentStatus,
  RUNNING: 'RUNNING' as AgentStatus,
  DONE: 'DONE' as AgentStatus,
  ERROR: 'ERROR' as AgentStatus,
};

export type RunPipelineResult =
  | { ok: true; taskId: string; projectId: string }
  | { ok: false; error: string };

/**
 * Decompose a client brief into pipeline sub-tasks (conceptually: fetch raw -> extract -> price -> audit).
 * Creates one AgentTaskState row and runs the full pipeline: Hunter -> Scholar -> Valuer -> Auditor.
 */
export async function runCoordinatorPipeline(params: {
  projectId: string;
  brief: string;
  creatorId: string;
}): Promise<RunPipelineResult> {
  const { projectId, brief, creatorId } = params;

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { id: true, creatorId: true },
  });
  if (!project || project.creatorId !== creatorId) {
    return { ok: false, error: 'Project not found or access denied' };
  }

  const task = await prisma.agentTaskState.create({
    data: {
      projectId,
      candidateLabel: brief.slice(0, 80) || 'Expert pipeline',
    },
  });

  try {
    await runHunter(task.id, brief);
    await runScholar(task.id);
    await runValuer(task.id);
    await runAuditor(task.id);
    await aggregateEliteProfile(task.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline error';
    await setAgentError(task.id, message);
    return { ok: false, error: message };
  }

  return { ok: true, taskId: task.id, projectId };
}

/** Aggregate Hunter + Scholar + Valuer + Auditor outputs into final Elite Expert Profile on the blackboard. */
async function aggregateEliteProfile(taskId: string): Promise<void> {
  const task = await prisma.agentTaskState.findUnique({
    where: { id: taskId },
    select: { hunterRaw: true, scholarStructured: true, valuerPricing: true, auditorResult: true },
  });
  if (!task) return;
  const eliteProfile = {
    raw: task.hunterRaw ?? null,
    structured: task.scholarStructured ?? null,
    pricing: task.valuerPricing ?? null,
    audit: task.auditorResult ?? null,
    aggregatedAt: new Date().toISOString(),
  };
  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: { eliteProfile: eliteProfile as object },
  });
}

const COORDINATOR_HUNTER_URL = process.env.COORDINATOR_HUNTER_URL?.replace(/\/$/, '');
const HUNTER_TIMEOUT_MS = 15_000;

async function runHunter(taskId: string, brief: string): Promise<void> {
  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: {
      hunterStatus: AGENT_STATUS.RUNNING,
      hunterMessage: 'Searching LinkedIn and sources for raw profile data…',
    },
  });

  let hunterRaw: object;
  if (COORDINATOR_HUNTER_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HUNTER_TIMEOUT_MS);
      const res = await fetch(COORDINATOR_HUNTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, taskId }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Hunter returned ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      hunterRaw = {
        rawText: data.rawText ?? data.raw ?? JSON.stringify(data),
        source: data.source ?? 'hunter',
        fetchedAt: new Date().toISOString(),
        ...data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hunter request failed';
      await setAgentStatus(taskId, 'hunter', AGENT_STATUS.ERROR, msg);
      throw err;
    }
  } else {
    await sleep(600);
    hunterRaw = {
      rawText:
        'Senior Vice President, Supply Chain. 18+ years in logistics and procurement. Functional domain: Operations, Procurement. Previously at DHL, Maersk.',
      source: 'stub',
      fetchedAt: new Date().toISOString(),
    };
  }

  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: {
      hunterRaw,
      hunterStatus: AGENT_STATUS.DONE,
      hunterMessage: 'Raw data collected.',
    },
  });
}

async function runScholar(taskId: string): Promise<void> {
  const task = await prisma.agentTaskState.findUnique({
    where: { id: taskId },
    select: { hunterRaw: true },
  });
  if (!task?.hunterRaw) {
    await setAgentStatus(taskId, 'scholar', AGENT_STATUS.ERROR, 'No raw data from Hunter.');
    return;
  }

  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: {
      scholarStatus: AGENT_STATUS.RUNNING,
      scholarMessage: 'Analyzing the CV and extracting structured fields…',
    },
  });

  const rawText =
    typeof task.hunterRaw === 'object' && task.hunterRaw !== null && 'rawText' in task.hunterRaw
      ? String((task.hunterRaw as { rawText?: string }).rawText)
      : JSON.stringify(task.hunterRaw);

  try {
    const content = await completeChat(AGENT_PROMPTS.THE_SCHOLAR, rawText);
    const structured = parseJson(content);
    await prisma.agentTaskState.update({
      where: { id: taskId },
      data: {
        scholarStructured: structured as object,
        scholarStatus: AGENT_STATUS.DONE,
        scholarMessage: 'Structured extraction complete.',
      },
    });
  } catch (e) {
    await setAgentStatus(
      taskId,
      'scholar',
      AGENT_STATUS.ERROR,
      e instanceof Error ? e.message : 'Extraction failed'
    );
    throw e;
  }
}

async function runValuer(taskId: string): Promise<void> {
  const task = await prisma.agentTaskState.findUnique({
    where: { id: taskId },
    select: { scholarStructured: true, projectId: true },
  });
  if (!task) return;
  if (!task?.scholarStructured) {
    await setAgentStatus(taskId, 'valuer', AGENT_STATUS.ERROR, 'No structured data from Scholar.');
    return;
  }

  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: {
      valuerStatus: AGENT_STATUS.RUNNING,
      valuerMessage: 'Comparing profile to Internal Feedback Loop; determining 60-min rate range…',
    },
  });

  const structured =
    typeof task.scholarStructured === 'object' && task.scholarStructured !== null
      ? task.scholarStructured as Record<string, unknown>
      : {};
  const userMessage = `Expert profile: ${JSON.stringify(structured)}. No historical engagements in this run; use market-based reasoning.`;

  try {
    const content = await completeChat(AGENT_PROMPTS.THE_VALUER, userMessage);
    const pricing = parseJson(content);
    await prisma.agentTaskState.update({
      where: { id: taskId },
      data: {
        valuerPricing: pricing as object,
        valuerStatus: AGENT_STATUS.DONE,
        valuerMessage: 'Rate range assigned.',
      },
    });
  } catch (e) {
    await setAgentStatus(
      taskId,
      'valuer',
      AGENT_STATUS.ERROR,
      e instanceof Error ? e.message : 'Valuation failed'
    );
    throw e;
  }
}

async function runAuditor(taskId: string): Promise<void> {
  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: {
      auditorStatus: AGENT_STATUS.RUNNING,
      auditorMessage: 'Verifying contact and flagging if confidence < 85%…',
    },
  });

  const mockContactContext =
    'Verified contact: email on file, last verified 30 days ago. One engagement in last 12 months.';
  try {
    const content = await completeChat(AGENT_PROMPTS.THE_AUDITOR, mockContactContext);
    const result = parseJson(content);
    const confidence = typeof result?.confidence === 'number' ? result.confidence : 90;
    const pendingAudit = confidence < 85;
    await prisma.agentTaskState.update({
      where: { id: taskId },
      data: {
        auditorResult: {
          ...(typeof result === 'object' && result !== null ? result : {}),
          pendingAudit,
          confidence,
        } as object,
        auditorStatus: AGENT_STATUS.DONE,
        auditorMessage: pendingAudit
          ? 'Flagged PENDING_AUDIT; Admin Panel notified.'
          : 'Verification complete.',
      },
    });
    if (pendingAudit) {
      const taskRow = await prisma.agentTaskState.findUnique({
        where: { id: taskId },
        select: { projectId: true },
      });
      const project = taskRow
        ? await prisma.researchProject.findUnique({
            where: { id: taskRow.projectId },
            select: { creatorId: true },
          })
        : null;
      if (project) {
        await prisma.notification.create({
          data: {
            userId: project.creatorId,
            type: 'PENDING_AUDIT',
            title: 'Expert pending audit',
            body: `Task ${taskId}: confidence < 85%. Review in Agent Squad.`,
          },
        });
      }
    }
  } catch (e) {
    await setAgentStatus(
      taskId,
      'auditor',
      AGENT_STATUS.ERROR,
      e instanceof Error ? e.message : 'Audit failed'
    );
    throw e;
  }
}

async function setAgentStatus(
  taskId: string,
  agent: 'hunter' | 'scholar' | 'valuer' | 'auditor',
  status: AgentStatus,
  message: string | null
): Promise<void> {
  const key = `${agent}Status` as const;
  const msgKey = `${agent}Message` as const;
  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: { [key]: status, [msgKey]: message },
  });
}

async function setAgentError(taskId: string, message: string): Promise<void> {
  await prisma.agentTaskState.update({
    where: { id: taskId },
    data: {
      scholarStatus: AGENT_STATUS.ERROR,
      scholarMessage: message,
    },
  });
}

function parseJson(content: string): Record<string, unknown> {
  const stripped = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(stripped) as Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
