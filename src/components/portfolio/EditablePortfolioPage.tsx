"use client";

import { useMemo, useState } from "react";

import { AppShell, ContentSurface } from "@/components/layout";

type Project = {
  id: number;
  name: string;
  summary: string;
  stack: string;
  link: string;
};

type PortfolioDraft = {
  fullName: string;
  role: string;
  location: string;
  bio: string;
  skills: string;
  projects: Project[];
};

const initialDraft: PortfolioDraft = {
  fullName: "Alex Parker",
  role: "Product Designer + Frontend Engineer",
  location: "Austin, TX",
  bio: "I design and build clean, conversion-focused web experiences for startup teams. I care about accessible interfaces, rapid prototyping, and simple systems that are easy to maintain.",
  skills: "Figma, React, Next.js, Tailwind, User Research, Prototyping",
  projects: [
    {
      id: 1,
      name: "Mentor Match",
      summary:
        "Built a guided onboarding flow that increased mentor profile completion from 41% to 78%.",
      stack: "Next.js, TypeScript, Supabase",
      link: "https://example.com/mentor-match",
    },
    {
      id: 2,
      name: "Ops Dashboard",
      summary:
        "Designed and shipped a KPI dashboard that replaced weekly spreadsheet reporting for 6 teams.",
      stack: "React, Recharts, Tailwind",
      link: "https://example.com/ops-dashboard",
    },
  ],
};

function parseSkills(skills: string) {
  return skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export function EditablePortfolioPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PortfolioDraft>(initialDraft);

  const skillTags = useMemo(() => parseSkills(draft.skills), [draft.skills]);

  const updateProject = (id: number, field: keyof Project, value: string) => {
    setDraft((previous) => ({
      ...previous,
      projects: previous.projects.map((project) =>
        project.id === id ? { ...project, [field]: value } : project,
      ),
    }));
  };

  const addProject = () => {
    setDraft((previous) => ({
      ...previous,
      projects: [
        ...previous.projects,
        {
          id: Date.now(),
          name: "New project",
          summary: "Describe what you built and the result.",
          stack: "Tech stack",
          link: "https://",
        },
      ],
    }));
  };

  const removeProject = (id: number) => {
    setDraft((previous) => ({
      ...previous,
      projects: previous.projects.filter((project) => project.id !== id),
    }));
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <ContentSurface
          kicker="Portfolio"
          title="Editable portfolio page"
          description="Toggle edit mode to update profile details, skill tags, and featured projects in-place."
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-600">
              Mode:{" "}
              <span className="font-semibold text-zinc-900">
                {isEditing ? "Editing" : "Preview"}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setIsEditing((previous) => !previous)}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              {isEditing ? "Finish editing" : "Edit portfolio"}
            </button>
          </div>
        </ContentSurface>

        <ContentSurface
          title="Profile"
          description="Headline information shown at the top of your portfolio."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {isEditing ? (
              <>
                <label className="text-sm font-medium text-zinc-700">
                  Full name
                  <input
                    value={draft.fullName}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, fullName: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-zinc-700">
                  Role
                  <input
                    value={draft.role}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, role: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                  Location
                  <input
                    value={draft.location}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, location: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                  Bio
                  <textarea
                    value={draft.bio}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, bio: event.target.value }))
                    }
                    className="mt-1 h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : (
              <article className="md:col-span-2 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{draft.location}</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">{draft.fullName}</h2>
                <p className="text-sm font-medium text-sky-700">{draft.role}</p>
                <p className="mt-3 text-sm leading-6 text-zinc-700">{draft.bio}</p>
              </article>
            )}
          </div>
        </ContentSurface>

        <ContentSurface
          title="Skills"
          description="Comma-separated tags that power your quick summary."
        >
          {isEditing ? (
            <label className="text-sm font-medium text-zinc-700">
              Skills list
              <input
                value={draft.skills}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, skills: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skillTags.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </ContentSurface>

        <ContentSurface
          title="Featured projects"
          description="Add, edit, and remove project cards to keep your portfolio current."
        >
          <div className="space-y-4">
            {draft.projects.map((project) => (
              <article key={project.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                {isEditing ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Project name
                      <input
                        value={project.name}
                        onChange={(event) => updateProject(project.id, "name", event.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-zinc-700">
                      Stack
                      <input
                        value={project.stack}
                        onChange={(event) => updateProject(project.id, "stack", event.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                      Summary
                      <textarea
                        value={project.summary}
                        onChange={(event) =>
                          updateProject(project.id, "summary", event.target.value)
                        }
                        className="mt-1 h-20 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-zinc-700 md:col-span-2">
                      Project link
                      <input
                        value={project.link}
                        onChange={(event) => updateProject(project.id, "link", event.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeProject(project.id)}
                        className="text-sm font-semibold text-rose-600 transition hover:text-rose-500"
                      >
                        Remove project
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-zinc-900">{project.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        {project.stack}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">{project.summary}</p>
                    <a
                      className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-600"
                      href={project.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View project
                    </a>
                  </>
                )}
              </article>
            ))}
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={addProject}
              className="mt-4 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              Add project
            </button>
          ) : null}
        </ContentSurface>
      </div>
    </AppShell>
  );
}
