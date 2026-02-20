'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrCreateCurrentUser } from '@/lib/auth';
import { triggerExpertHunt } from '@/app/lib/n8n-bridge';
import { revalidatePath } from 'next/cache';

export type CreateResearchProjectInput = {
  title: string;
  filterCriteria?: {
    industry?: string;
    sub_industry?: string;
    region?: string;
    country?: string;
    brief?: string;
    query?: string;
  };
};

export async function createResearchProject(input: CreateResearchProjectInput | FormData) {
  const creatorId = await getOrCreateCurrentUser();

  let title: string;
  let filterCriteria: CreateResearchProjectInput['filterCriteria'] = {};

  if (input instanceof FormData) {
    title = (input.get('title') as string)?.trim() ?? '';
    const industry = (input.get('industry') as string)?.trim();
    const region = (input.get('region') as string)?.trim();
    const brief = (input.get('brief') as string)?.trim();
    if (industry) filterCriteria.industry = industry;
    if (region) filterCriteria.region = region;
    if (brief) filterCriteria.brief = brief;
  } else {
    title = input.title.trim();
    filterCriteria = input.filterCriteria ?? {};
  }

  const project = await prisma.researchProject.create({
    data: {
      creatorId,
      title,
      status: 'PENDING',
      filterCriteria: filterCriteria as object,
    },
  });

  // Trigger n8n Expert Hunter workflow
  const huntResult = await triggerExpertHunt({
    projectId: project.id,
    projectTitle: project.title,
    filterCriteria: (project.filterCriteria as Record<string, unknown>) ?? {},
  });

  if (huntResult.ok && huntResult.data) {
    const data = huntResult.data as {
      ranked_experts?: Array<{ expert_id: string; confidence_score?: number }>;
    };
    const experts = data.ranked_experts ?? [];
    if (experts.length > 0) {
      const scoreToTier = (s: number) =>
        s >= 0.8 ? 'S' : s >= 0.6 ? 'A' : s >= 0.4 ? 'B' : 'C';
      await prisma.researchResult.createMany({
        data: experts.map((e) => ({
          projectId: project.id,
          expertId: e.expert_id,
          matchScore: e.confidence_score ?? 0.5,
          classificationTier: scoreToTier(e.confidence_score ?? 0.5),
        })),
        skipDuplicates: true,
      });
      await prisma.researchProject.update({
        where: { id: project.id },
        data: { status: 'COMPLETED' },
      });
    } else {
      await prisma.researchProject.update({
        where: { id: project.id },
        data: { status: 'RUNNING' },
      });
    }
  }

  revalidatePath('/projects');
  revalidatePath('/');
  redirect('/projects');
}

export async function getResearchProjects() {
  const currentUserId = await getOrCreateCurrentUser();
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true },
  });
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const projects = await prisma.researchProject.findMany({
    where: isAdmin ? undefined : { creatorId: currentUserId },
    orderBy: { id: 'desc' },
    include: {
      _count: { select: { results: true } },
    },
  });

  return projects;
}

export async function getProjectWithResults(projectId: string) {
  const currentUserId = await getOrCreateCurrentUser();
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true },
  });
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const project = await prisma.researchProject.findFirst({
    where: { id: projectId, ...(isAdmin ? {} : { creatorId: currentUserId }) },
    include: {
      results: {
        include: { expert: { include: { contacts: true } } },
        orderBy: { matchScore: 'desc' },
      },
    },
  });

  if (!project) return null;

  const augmentedResults = await Promise.all(
    project.results.map(async (r) => {
      const expert = r.expert as typeof r.expert & {
        contactCloaked?: boolean;
      };
      if (!expert.contactCloaked) return r;

      const hasEngagement = await prisma.engagement.findFirst({
        where: { projectId: project.id, expertId: expert.id },
        select: { id: true },
      });
      if (hasEngagement) return r;

      return {
        ...r,
        expert: {
          ...r.expert,
          contacts: (r.expert.contacts ?? []).map((c) => ({
            ...c,
            value: 'Contact cloaked until vetted engagement is accepted',
          })),
        },
      };
    })
  );

  return {
    ...project,
    results: augmentedResults,
  };
}

export async function reRunHunt(projectId: string) {
  const currentUserId = await getOrCreateCurrentUser();
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true },
  });
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const project = await prisma.researchProject.findFirst({
    where: { id: projectId, ...(isAdmin ? {} : { creatorId: currentUserId }) },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  await prisma.researchResult.deleteMany({ where: { projectId } });
  await prisma.researchProject.update({
    where: { id: projectId },
    data: { status: 'PENDING' },
  });

  const huntResult = await triggerExpertHunt({
    projectId: project.id,
    projectTitle: project.title,
    filterCriteria: (project.filterCriteria as Record<string, unknown>) ?? {},
  });

  if (huntResult.ok && huntResult.data) {
    const data = huntResult.data as {
      ranked_experts?: Array<{ expert_id: string; confidence_score?: number }>;
    };
    const experts = data.ranked_experts ?? [];
    if (experts.length > 0) {
      const scoreToTier = (s: number) =>
        s >= 0.8 ? 'S' : s >= 0.6 ? 'A' : s >= 0.4 ? 'B' : 'C';
      await prisma.researchResult.createMany({
        data: experts.map((e) => ({
          projectId: project.id,
          expertId: e.expert_id,
          matchScore: e.confidence_score ?? 0.5,
          classificationTier: scoreToTier(e.confidence_score ?? 0.5),
        })),
        skipDuplicates: true,
      });
      await prisma.researchProject.update({
        where: { id: projectId },
        data: { status: 'COMPLETED' },
      });
    } else {
      await prisma.researchProject.update({
        where: { id: projectId },
        data: { status: 'RUNNING' },
      });
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
}

export async function deleteProject(projectId: string) {
  const currentUserId = await getOrCreateCurrentUser();
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true },
  });
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const project = await prisma.researchProject.findFirst({
    where: { id: projectId, ...(isAdmin ? {} : { creatorId: currentUserId }) },
    select: { id: true },
  });
  if (!project) {
    throw new Error('Project not found');
  }

  await prisma.researchResult.deleteMany({ where: { projectId } });
  await prisma.researchProject.delete({ where: { id: projectId } });

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}
