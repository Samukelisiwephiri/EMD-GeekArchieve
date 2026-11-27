
import { supabase } from "./supabase";

const PROJECT_FIELDS = `
  id,
  slug,
  title,
  aliases,
  summary,
  description,
  repo_url,
  demo_url,
  tech_stack,
  completion_pct,
  missing_modules,
  domain,
  suggested_price,
  price_currency,
  is_illustrative,
  included_tailoring,
  active,
  created_by,
  created_at
`;

export function mapProject(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    aliases: row.aliases || [],
    summary: row.summary || "",
    description: row.description || "",
    repo: row.repo_url || "",
    demo: row.demo_url || "",
    stack: row.tech_stack || [],
    completion: row.completion_pct ?? null,
    missing: row.missing_modules || [],
    domain: row.domain || "",
    estimatedValue:
      row.suggested_price == null
        ? null
        : new Intl.NumberFormat("en-ZA", {
            style: "currency",
            currency: row.price_currency || "ZAR",
            maximumFractionDigits: 2,
          }).format(Number(row.suggested_price)),
    illustrative: row.is_illustrative,
    includedTailoring: row.included_tailoring || [],
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function fetchProjects() {
  if (!supabase) {
    throw new Error("Database connection unavailable.");
  }

  const { data, error } = await supabase
    .from("prototypes")
    .select(PROJECT_FIELDS)
    .eq("active", true)
    .order("is_illustrative", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;

  return (data || []).map(mapProject);
}

export async function createProject(input) {
  if (!supabase) {
    throw new Error("Database connection unavailable.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in before submitting a project.");
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const repo = input.repo.trim();
  const domain = input.domain.trim();

  if (!title || title.length > 150) {
    throw new Error("Enter a project name of 1–150 characters.");
  }

  if (description.length < 20 || description.length > 10000) {
    throw new Error(
      "Enter a project description of 20–10,000 characters."
    );
  }

  if (repo) {
    try {
      const url = new URL(repo);

      if (!["https:", "http:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      throw new Error("Enter a valid project or repository URL.");
    }
  }

  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "project";

  const slug = `${slugBase}-${crypto.randomUUID()}`;

  const { data, error } = await supabase
    .from("prototypes")
    .insert({
      slug,
      title,
      summary: description.slice(0, 200),
      description,
      repo_url: repo || null,
      tech_stack: [
        ...new Set(
          input.stack
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        ),
      ],
      domain: domain || null,
      active: true,
    })
    .select(PROJECT_FIELDS)
    .single();

  if (error) throw error;

  return mapProject(data);
}
