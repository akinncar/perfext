import {
  AnalyzeRequest,
  AnalyzeResponse,
  Issue,
  Settings,
} from "../types";
import { OverlayRenderer } from "./overlay-renderer";
import { PositionTracker } from "./position-tracker";
import { TextInputSource } from "./text-input-source";
import { TextSource } from "./text-source";

type TextField = HTMLTextAreaElement | HTMLInputElement;

/**
 * Per active field: owns and wires together one `TextSource`, one
 * `OverlayRenderer`, one `PositionTracker`, and the analysis debounce.
 *
 * It is written only against the `TextSource` interface, so swapping in a
 * `ContentEditableSource` (Phase 1) requires no changes here.
 */
export class FieldController {
  private source: TextSource;
  private renderer: OverlayRenderer;
  private tracker: PositionTracker;
  private getSettings: () => Settings;

  private issues: Issue[] = [];
  private denied = new Set<string>();
  private debounceTimer: number | null = null;
  private lastAnalyzed = "";
  private destroyed = false;
  private unsubscribe: () => void;

  constructor(el: TextField, getSettings: () => Settings) {
    this.getSettings = getSettings;

    this.source = new TextInputSource(el);
    this.renderer = new OverlayRenderer(this.source, {
      onAccept: (i) => this.applyIssue(i),
      onDeny: (i) => this.toggleDeny(i),
    });
    this.tracker = new PositionTracker(this.source, () => this.repaint());

    this.unsubscribe = this.source.onChange(() => this.scheduleAnalyze());

    // Initial pass shortly after attach, in case there is existing text.
    this.scheduleAnalyze();
  }

  /** Re-draw marks at the field's current geometry (no analysis). */
  private repaint() {
    if (this.destroyed) return;
    this.renderer.render(this.issues, this.denied);
  }

  private scheduleAnalyze() {
    if (this.destroyed) return;
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    // Repaint immediately so highlights stay glued to the text while typing.
    this.repaint();

    const settings = this.getSettings();
    const text = this.value();
    const pending =
      settings.enabled && text.trim().length >= 3 && text !== this.lastAnalyzed;
    // Show the "analyzing" indicator while we wait out the debounce + fetch.
    if (pending) this.renderer.showSpinner();
    else this.renderer.hideSpinner();

    this.debounceTimer = window.setTimeout(
      () => this.runAnalyze(),
      settings.debounceMs,
    );
  }

  private async runAnalyze() {
    if (this.destroyed) return;
    const settings = this.getSettings();
    if (!settings.enabled) {
      this.renderer.hideSpinner();
      return;
    }

    const text = this.value();
    if (text.trim().length < 3) {
      this.issues = [];
      this.repaint();
      this.renderer.hideSpinner();
      return;
    }
    if (text === this.lastAnalyzed) {
      this.renderer.hideSpinner();
      return;
    }

    try {
      const res = (await chrome.runtime.sendMessage({
        type: "perfext:analyze",
        text,
      } satisfies AnalyzeRequest)) as AnalyzeResponse;

      if (this.destroyed) return;
      // Ignore stale responses if the user kept typing; a newer run is pending
      // and is already showing its own spinner.
      if (this.value() !== text) return;

      this.lastAnalyzed = text;
      if (res?.ok) {
        this.issues = res.issues;
      } else {
        this.issues = [];
        if (res?.error) console.warn("[Perfext]", res.error);
      }
      this.repaint();
    } catch (err) {
      console.warn("[Perfext] analyze failed", err);
    } finally {
      if (!this.destroyed && this.value() === text) this.renderer.hideSpinner();
    }
  }

  private value(): string {
    return this.source.getText();
  }

  private applyIssue(issue: Issue) {
    const text = this.value();
    if (text.slice(issue.start, issue.end) !== issue.text) return;

    this.source.applyEdit(issue.start, issue.end, issue.replacement);

    // Drop the applied issue; offsets of others are revalidated on repaint.
    this.issues = this.issues.filter((i) => i.id !== issue.id);
    this.denied.delete(issue.id);
    this.lastAnalyzed = ""; // allow re-analysis of the new text
    this.scheduleAnalyze();
  }

  private toggleDeny(issue: Issue) {
    if (this.denied.has(issue.id)) this.denied.delete(issue.id);
    else this.denied.add(issue.id);
    this.repaint();
  }

  refresh() {
    this.lastAnalyzed = "";
    this.scheduleAnalyze();
  }

  destroy() {
    this.destroyed = true;
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
    this.unsubscribe();
    this.tracker.destroy();
    this.renderer.destroy();
    this.source.destroy();
  }
}
