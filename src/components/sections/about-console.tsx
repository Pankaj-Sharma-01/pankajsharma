"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { ConsoleWindow } from "@/components/ui/console-window";
import { ExternalLink } from "@/components/ui/external-link";

type Link = { label: string; href: string };

type AboutConsoleProps = {
  bio: readonly string[];
  focusAreas: readonly string[];
  interests: readonly string[];
  links: readonly Link[];
  sectors: readonly Link[];
};

type Entry = { id: number; command: string; output: ReactNode };

const PROMPT = "visitor@pankajsharma.dev:~$";
/** Shown as one-tap buttons, and listed by `help`. */
const COMMANDS = ["whoami", "focus", "interests", "contact", "sectors", "help", "clear"] as const;

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden="true" className="text-hot">
            +
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * The About page as a terminal. It loads with `whoami`, `focus` and
 * `interests` already run, so all the content is in the page without any
 * interaction; visitors can then run more commands by button or keyboard.
 */
export function AboutConsole({ bio, focusAreas, interests, links, sectors }: AboutConsoleProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [recall, setRecall] = useState(-1);

  function respond(command: string): ReactNode {
    switch (command) {
      case "whoami":
        return (
          <div className="space-y-3 font-sans text-base leading-relaxed text-foreground">
            {bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        );
      case "focus":
        return <List items={focusAreas} />;
      case "interests":
        return <List items={interests} />;
      case "contact":
        return (
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <ExternalLink href={link.href} className="text-accent">
                  {link.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        );
      case "sectors":
        return (
          <p>
            {sectors.map((sector) => sector.label.toLowerCase()).join("  ")}
            <span className="mt-1 block text-muted">Type a sector name to go there.</span>
          </p>
        );
      case "help":
        return (
          <p>
            {COMMANDS.join("  ")}
            <span className="mt-1 block text-muted">Or type a sector name, such as projects, to jump to it.</span>
          </p>
        );
      default:
        return (
          <p className="text-hot">
            command not found: {command}. <span className="text-muted">Try help.</span>
          </p>
        );
    }
  }

  // Entries are only ever appended (or all cleared), so position is a stable key.
  const [entries, setEntries] = useState<Entry[]>(() =>
    ["whoami", "focus", "interests"].map((command, id) => ({ id, command, output: respond(command) })),
  );

  function run(raw: string) {
    const command = raw.trim().toLowerCase();
    if (!command) return;
    setPast((previous) => [command, ...previous]);
    setRecall(-1);
    setValue("");

    if (command === "clear") {
      setEntries([]);
      return;
    }
    const sector = sectors.find((item) => item.label.toLowerCase() === command.replace(/^(goto|cd|open)\s+/, ""));
    if (sector) {
      setEntries((previous) => [
        ...previous,
        { id: previous.length, command, output: <p className="text-accent">routing to {sector.label.toLowerCase()}…</p> },
      ]);
      router.push(sector.href);
      return;
    }
    setEntries((previous) => [...previous, { id: previous.length, command, output: respond(command) }]);
    // Keep the prompt in view as the log grows.
    requestAnimationFrame(() => inputRef.current?.scrollIntoView({ block: "nearest" }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    run(value);
  }

  // Up and down recall earlier commands, as in a shell.
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const index = Math.max(-1, Math.min(past.length - 1, recall + (event.key === "ArrowUp" ? 1 : -1)));
    setRecall(index);
    setValue(index === -1 ? "" : past[index]);
  }

  return (
    <ConsoleWindow title="about.sh" status="Interactive">
      <div role="log" aria-live="polite" aria-label="Console output" className="space-y-6 font-mono text-sm">
        {entries.map((item) => (
          <div key={item.id} className="space-y-2">
            <p className="break-all">
              <span className="text-muted">{PROMPT}</span> <span className="text-sun">{item.command}</span>
            </p>
            <div className="border-l border-border pl-4">{item.output}</div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex items-center gap-2 border-t border-border pt-4 font-mono text-sm">
        <label htmlFor="about-command" className="shrink-0 text-muted">
          <span className="hidden sm:inline">{PROMPT}</span>
          <span aria-hidden="true" className="sm:hidden">
            $
          </span>
          <span className="sr-only"> command</span>
        </label>
        <input
          ref={inputRef}
          id="about-command"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="type a command, or tap one below"
          className="min-w-0 flex-1 bg-transparent text-sun caret-accent outline-none placeholder:text-muted/60"
        />
        <button
          type="submit"
          className="border border-accent/50 px-3 py-1 text-xs tracking-widest text-accent uppercase transition-colors hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Run
        </button>
      </form>

      <ul aria-label="Commands" className="mt-4 flex flex-wrap gap-2">
        {COMMANDS.map((command) => (
          <li key={command}>
            <button
              type="button"
              onClick={() => run(command)}
              className="border border-border bg-surface px-3 py-1 font-mono text-xs text-muted transition-colors hover:border-hot/60 hover:text-hot focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {command}
            </button>
          </li>
        ))}
      </ul>
    </ConsoleWindow>
  );
}
