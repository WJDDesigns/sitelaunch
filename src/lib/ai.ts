import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/cloud/encryption";

export interface AIIntegration {
  provider: "openai" | "anthropic" | "google_ai";
  apiKey: string;
  model: string;
}

/**
 * Get the first available AI integration for a partner.
 * Falls back to parent agency's AI integration if the partner has none.
 * Prefers anthropic > openai > google_ai.
 */
export async function getPartnerAI(partnerId: string): Promise<AIIntegration | null> {
  const admin = createAdminClient();
  const { data: integrations } = await admin
    .from("ai_integrations")
    .select("provider, api_key_encrypted, model_preference")
    .eq("partner_id", partnerId);

  if (!integrations || integrations.length === 0) {
    // Fall back to parent agency's AI integration
    const { data: partner } = await admin
      .from("partners")
      .select("parent_partner_id")
      .eq("id", partnerId)
      .maybeSingle();
    if (partner?.parent_partner_id) {
      return getPartnerAI(partner.parent_partner_id);
    }
    return null;
  }

  // Prefer anthropic > openai > google_ai
  const priority = ["anthropic", "openai", "google_ai"];
  const sorted = [...integrations].sort(
    (a, b) => priority.indexOf(a.provider) - priority.indexOf(b.provider),
  );

  const chosen = sorted[0];
  const defaultModels: Record<string, string> = {
    openai: "gpt-4o",
    anthropic: "claude-sonnet-4-20250514",
    google_ai: "gemini-2.0-flash",
  };

  return {
    provider: chosen.provider as AIIntegration["provider"],
    apiKey: decryptToken(chosen.api_key_encrypted),
    model: chosen.model_preference || defaultModels[chosen.provider] || "gpt-4o",
  };
}

/**
 * Send a prompt to the partner's AI provider and return the text response.
 */
export async function aiComplete(
  ai: AIIntegration,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  try {
    if (ai.provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ai.apiKey}`,
        },
        body: JSON.stringify({
          model: ai.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 600,
          temperature: 0.4,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    }

    if (ai.provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ai.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ai.model,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 600,
          temperature: 0.4,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.content?.[0]?.text ?? null;
    }

    if (ai.provider === "google_ai") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${ai.model}:generateContent?key=${ai.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
          }),
        },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }

    return null;
  } catch {
    return null;
  }
}
