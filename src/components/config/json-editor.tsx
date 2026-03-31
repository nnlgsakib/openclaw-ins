import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfigStore } from "@/stores/use-config-store";
import { cn } from "@/lib/utils";
import { FileJson, AlignLeft } from "lucide-react";

export interface JsonEditorProps {
  onSave: (config: Record<string, unknown>) => void;
  isSaving: boolean;
}

export function JsonEditor({ onSave, isSaving }: JsonEditorProps) {
  const storeConfig = useConfigStore((s) => s.config);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(storeConfig, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);

  // Sync local text when store config changes externally
  const [prevConfig, setPrevConfig] = useState(storeConfig);
  if (storeConfig !== prevConfig) {
    const newText = JSON.stringify(storeConfig, null, 2);
    if (newText !== jsonText) {
      setJsonText(newText);
      setParseError(null);
    }
    setPrevConfig(storeConfig);
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setJsonText(text);

      try {
        JSON.parse(text);
        setParseError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid JSON";
        setParseError(`Invalid JSON: ${msg}`);
      }
    },
    []
  );

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid JSON";
      setParseError(`Cannot format: ${msg}`);
    }
  }, [jsonText]);

  const handleSave = useCallback(() => {
    if (parseError) return;
    try {
      const parsed = JSON.parse(jsonText);
      onSave(parsed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid JSON";
      setParseError(`Invalid JSON: ${msg}`);
    }
  }, [jsonText, parseError, onSave]);

  const parsedSuccessfully = !parseError && jsonText.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">JSON Editor</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFormat}
              disabled={isSaving}
            >
              <AlignLeft className="mr-1 h-3.5 w-3.5" />
              Format
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!parsedSuccessfully || isSaving}
            >
              Save JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <textarea
          value={jsonText}
          onChange={handleChange}
          className={cn(
            "w-full min-h-[400px] p-4 font-mono text-sm rounded-md border bg-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "resize-y",
            parseError ? "border-destructive" : "border-input"
          )}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
        {parseError && (
          <p className="text-xs text-destructive mt-1">{parseError}</p>
        )}
      </CardContent>
    </Card>
  );
}

