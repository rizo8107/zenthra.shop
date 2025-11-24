import { ComponentConfig } from "@measured/puck";
import React from "react";
import { Sparkles } from "lucide-react";

export interface CustomHtmlProps {
  html?: string;
}

const CustomHtmlPreview: React.FC<CustomHtmlProps> = ({ html }) => {
  if (!html || !html.trim()) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground p-4 text-sm text-muted-foreground">
        Add your custom HTML in the sidebar.
      </div>
    );
  }

  return (
    <div
      className="custom-html-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

type HtmlFieldProps = {
  value?: string;
  onChange: (value: string) => void;
};

const CustomHtmlField: React.FC<HtmlFieldProps> = ({ value, onChange }) => {
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      alert("Please describe what you want AI to generate.");
      return;
    }

    try {
      setLoading(true);

      const webhooksBase = (import.meta as any).env?.VITE_WEBHOOKS_API_BASE || "/api/webhooks";
      const aiBase = webhooksBase.replace(/\/webhooks$/, "");
      const url = `${aiBase}/ai/puck-content`;

      const payload = {
        mode: "section" as const,
        description:
          trimmed +
          "\nReturn a single CustomHtml block with clean, responsive Tailwind HTML in props.html.",
        tone: "professional" as const,
        existingTypes: ["CustomHtml"],
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as any)?.error || `Request failed with status ${resp.status}`);
      }

      const json = (await resp.json()) as { data?: unknown };
      const blocks = Array.isArray(json.data) ? (json.data as any[]) : [];
      const htmlBlock = blocks.find(
        (b) => b && b.type === "CustomHtml" && b.props && typeof b.props.html === "string",
      );

      if (!htmlBlock) {
        throw new Error("AI did not return a CustomHtml block.");
      }

      onChange(htmlBlock.props.html as string);
    } catch (error) {
      console.error("[CustomHtml] AI generation failed", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      alert(`AI generation failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">AI prompt</label>
        <textarea
          className="w-full min-h-[60px] rounded-md border border-input bg-background px-2 py-1 text-xs"
          placeholder="Describe the section you want (e.g. product benefits, comparison table, FAQ, etc.)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        <Sparkles className="h-3 w-3" />
        {loading ? "Generating with AI..." : "Generate with Gemini AI"}
      </button>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">HTML Code</label>
        <textarea
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
          placeholder="<div>Your custom HTML here</div>"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export const CustomHtml: ComponentConfig<CustomHtmlProps> = {
  label: "Custom HTML",
  fields: {
    html: {
      type: "custom",
      label: "HTML Code",
      render: ({ value, onChange }) => (
        <CustomHtmlField
          value={typeof value === "string" ? value : ""}
          onChange={(val) => onChange(val)}
        />
      ),
    },
  },
  defaultProps: {
    html: "",
  },
  render: (props) => <CustomHtmlPreview {...props} />,
};
