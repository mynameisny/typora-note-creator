import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  popToRoot,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { exec } from "child_process";

function resolveNotesDir(): string {
  const { notesDir } = getPreferenceValues<{ notesDir: string }>();
  return notesDir.startsWith("~") ? join(homedir(), notesDir.slice(1)) : notesDir;
}

export default function CreateNoteCommand() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    const baseDir = resolveNotesDir();
    const templateDir = join(baseDir, ".note-templates");

    if (!existsSync(templateDir)) {
      mkdirSync(templateDir, { recursive: true });
    }

    const files = readdirSync(templateDir).filter((f) => f.endsWith(".md"));
    setTemplates(files);
    setLoadingTemplates(false);
  }, []);

  async function handleSubmit(values: { title: string; template?: string }) {
    const folderName = values.title.trim();
    if (!folderName) {
      await showToast({ style: Toast.Style.Failure, title: "Title cannot be empty" });
      return;
    }

    const baseDir = resolveNotesDir();
    const folderPath = join(baseDir, folderName);
    const filePath = join(folderPath, `${folderName}.md`);

    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    let content = `# ${folderName}\n\n`;

    if (values.template) {
      const templatePath = join(baseDir, ".note-templates", values.template);
      if (existsSync(templatePath)) {
        content = readFileSync(templatePath, "utf-8");
      }
    }

    writeFileSync(filePath, content);
    exec(`open -a Typora "${filePath}"`);

    await showToast({ style: Toast.Style.Success, title: `Created note: ${folderName}` });
    popToRoot();
  }

  return (
    <Form
      isLoading={loadingTemplates}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" onSubmit={handleSubmit} />
          <Action
            title="Open Template Directory in Finder"
            onAction={() => exec(`open "${join(resolveNotesDir(), ".note-templates")}"`)}
            icon={Icon.Finder}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://github.com/mynameisny/typora-note-creator"
          text="Open Documentation"
        />
      }
    >
      <Form.TextField id="title" title="Title" autoFocus placeholder="e.g. Study Plan 2025" />
      <Form.Dropdown id="template" title="Template" storeValue>
        <Form.Dropdown.Item value="" title="(None)" icon={Icon.Circle} />
        {templates.map((t) => (
          <Form.Dropdown.Item
            key={t}
            value={t}
            title={t.replace(/\.md$/, "")}
            icon={{ fileIcon: __filename }}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="You can open the template directory from the Action Panel below." />
    </Form>
  );
}
