import { NextResponse, type NextRequest } from "next/server";
import { MODEL_GROUPS as FALLBACK_GROUPS } from "@/app/_data/free-model-groups";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

type UpstreamModel = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  pricing?: unknown;
  tags?: unknown;
};

type UpstreamResponse = {
  data?: unknown;
};

type PricingRecord = Record<string, unknown> | undefined;

type ModelOption = {
  id: string;
  label: string;
  description: string;
};

type ModelGroup = {
  id: string;
  label: string;
  options: ModelOption[];
};

type CatalogResponse = {
  groups: ModelGroup[];
  updatedAt: string;
};

const FALLBACK_OPTIONS_MAP = new Map<string, { label: string; description: string; groupId: string }>(
  FALLBACK_GROUPS.flatMap((group) =>
    group.options.map((option) => [option.id, { ...option, groupId: group.id }]),
  ),
);

function parseModelId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function parseModelName(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function parseDescription(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }

  return trimmed.length > 600 ? `${trimmed.slice(0, 597)}...` : trimmed;
}

function parsePricing(value: unknown): PricingRecord {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function parsePriceEntry(entry: unknown): number | null {
  if (typeof entry === "number") {
    return Number.isFinite(entry) ? entry : null;
  }

  if (typeof entry === "string") {
    const parsed = Number.parseFloat(entry);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isFreePricing(pricing: PricingRecord): boolean {
  if (!pricing) {
    return false;
  }

  const keys = [
    "prompt",
    "completion",
    "request",
    "image",
    "web_search",
    "internal_reasoning",
    "input_cache_read",
    "input_cache_write",
  ];

  let hasValue = false;

  for (const key of keys) {
    const entry = parsePriceEntry(pricing[key]);
    if (entry === null) {
      continue;
    }
    hasValue = true;
    if (entry > 0) {
      return false;
    }
  }

  return hasValue;
}

function isFreeModel(model: UpstreamModel): boolean {
  const id = parseModelId(model.id);
  if (!id) {
    return false;
  }

  if (id.endsWith(":free")) {
    return true;
  }

  const pricing = parsePricing(model.pricing);
  if (pricing && isFreePricing(pricing)) {
    return true;
  }

  return false;
}

function coerceOptionFromFallback(modelId: string, upstream: UpstreamModel | undefined): ModelOption | null {
  const fallback = FALLBACK_OPTIONS_MAP.get(modelId);
  if (!fallback) {
    return null;
  }

  const upstreamName = upstream ? parseModelName(upstream.name) : null;
  const upstreamDescription = upstream ? parseDescription(upstream.description) : null;

  return {
    id: modelId,
    label: upstreamName ?? fallback.label,
    description: upstreamDescription ?? fallback.description,
  } satisfies ModelOption;
}

function formatModelId(modelId: string): string {
  const [provider, slugWithTier] = modelId.split("/");
  if (!slugWithTier) {
    return modelId;
  }

  const providerLabel = provider.replace(/[-_]/g, " ");
  const slug = slugWithTier.replace(/[:_]/g, " ");
  return `${capitalizeWords(providerLabel)}: ${capitalizeWords(slug)}`;
}

function capitalizeWords(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildAdditionalOption(model: UpstreamModel): ModelOption | null {
  const id = parseModelId(model.id);
  if (!id) {
    return null;
  }

  const name = parseModelName(model.name) ?? formatModelId(id);
  const description = parseDescription(model.description) ?? `${name} is available via OpenRouter.`;

  return {
    id,
    label: name,
    description,
  } satisfies ModelOption;
}

function dedupeOptions(options: ModelOption[]): ModelOption[] {
  const seen = new Set<string>();
  const deduped: ModelOption[] = [];

  for (const option of options) {
    if (seen.has(option.id)) {
      continue;
    }

    seen.add(option.id);
    deduped.push(option);
  }

  return deduped;
}

function sanitizeGroups(groups: ModelGroup[]): ModelGroup[] {
  return groups
    .map((group) => ({
      id: group.id,
      label: group.label,
      options: dedupeOptions(
        group.options
          .map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
          }))
          .filter((option) => option.id && option.label && option.description),
      ),
    }))
    .filter((group) => group.options.length > 0);
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-openrouter-key")?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenRouter API key in request headers." },
      { status: 401 },
    );
  }

  const originHeader =
    request.headers.get("origin") ??
    request.headers.get("referer") ??
    request.nextUrl.origin;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(OPENROUTER_MODELS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": originHeader,
        "X-Title": "DevStudy AI Suite",
      },
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to reach OpenRouter.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  let payload: UpstreamResponse;
  try {
    payload = (await upstreamResponse.json()) as UpstreamResponse;
  } catch (error) {
    return NextResponse.json(
      {
        error: "OpenRouter returned an unreadable response.",
        details: error instanceof Error ? error.message : String(error),
        status: upstreamResponse.status,
      },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: "OpenRouter returned an error response.",
        details: payload,
      },
      { status: upstreamResponse.status },
    );
  }

  const rawModels = Array.isArray(payload.data) ? (payload.data as UpstreamModel[]) : [];
  const freeModels = rawModels.filter(isFreeModel);
  const modelsById = new Map(
    freeModels
      .map((model) => {
        const id = parseModelId(model.id);
        return id ? ([id, model] as const) : null;
      })
      .filter((entry): entry is readonly [string, UpstreamModel] => entry !== null),
  );

  const usedModelIds = new Set<string>();

  const curatedGroups = FALLBACK_GROUPS.map<ModelGroup | null>((group) => {
    const options = group.options
      .map((option) => {
        const upstream = modelsById.get(option.id);
        if (!upstream) {
          return null;
        }

        usedModelIds.add(option.id);
        return coerceOptionFromFallback(option.id, upstream);
      })
      .filter((option): option is ModelOption => option !== null);

    if (!options.length) {
      return null;
    }

    return {
      id: group.id,
      label: group.label,
      options,
    } satisfies ModelGroup;
  }).filter((group): group is ModelGroup => group !== null);

  const additionalOptions = freeModels
    .filter((model) => {
      const id = parseModelId(model.id);
      return id !== null && !usedModelIds.has(id);
    })
    .map((model) => buildAdditionalOption(model))
    .filter((option): option is ModelOption => option !== null)
    .sort((a, b) => a.label.localeCompare(b.label));

  if (additionalOptions.length) {
    curatedGroups.push({
      id: "additional-free",
      label: "Additional Free Models",
      options: additionalOptions,
    });
  }

  const groups = curatedGroups.length
    ? curatedGroups
    : FALLBACK_GROUPS.map((group) => ({
        id: group.id,
        label: group.label,
        options: group.options.map((option) => ({
          id: option.id,
          label: option.label,
          description: option.description,
        })),
      }));
  const responseBody: CatalogResponse = {
    groups: sanitizeGroups(groups),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
