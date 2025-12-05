import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class VossTagViewControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    // ----- Internal state -----
    private container!: HTMLDivElement;
    private tags: string[] = [];
    private errorMessage: string | null = null;

    // keep latest context so we can re-render on events
    private context!: ComponentFramework.Context<IInputs>;
    private notifyOutputChanged!: () => void;

    // ----- Lifecycle -----

    constructor() {
        // Required by framework
        console.log("VossTagViewControl constructed");
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.container = container;

        this.tags = this.parseTags(context);
        this.render();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Framework calls this whenever data or dimensions change
        this.context = context;
        this.tags = this.parseTags(context);
        this.render();
    }

    public getOutputs(): IOutputs {
        // Join tags back into single-line text
        return {
            voss_tags: this.tags.join(",")
        };
    }

    public destroy(): void {
        // No special cleanup for now
        console.log("VossTagViewControl destroyed");
    }

    // ----- Helpers: data & configuration -----

    private parseTags(context: ComponentFramework.Context<IInputs>): string[] {
        const raw = context.parameters.voss_tags.raw || "";
        const parts = raw
            .split(",")
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // normalize + dedupe
        const seen = new Set<string>();
        const normalized: string[] = [];

        const maxLength = this.getMaxTagLength(context);

        for (const p of parts) {
            const tag = this.normalizeTagText(p);
            if (!tag) {
                continue;
            }

            // silently skip too-long tags coming from existing data
            if (tag.length > maxLength) {
                continue;
            }

            if (!seen.has(tag.toLowerCase())) {
                seen.add(tag.toLowerCase());
                normalized.push(tag);
            }
        }

        return normalized;
    }

    private getMaxTagLength(context: ComponentFramework.Context<IInputs>): number {
        const raw = context.parameters.maxTagLength?.raw;
        const n = raw !== null && raw !== undefined ? Number(raw) : 20;
        return isNaN(n) || n <= 0 ? 20 : n;
    }

    private getMaxTagsToShow(context: ComponentFramework.Context<IInputs>): number {
        const raw = context.parameters.maxTagsToShow?.raw;
        const n = raw !== null && raw !== undefined ? Number(raw) : 10;
        return isNaN(n) || n <= 0 ? 10 : n;
    }

    private getDefaultColor(context: ComponentFramework.Context<IInputs>): string {
        const c = context.parameters.defaultTagColor?.raw;
        return c && c.trim().length > 0 ? c.trim() : "#F59F27";
    }

    private useDynamicColors(context: ComponentFramework.Context<IInputs>): boolean {
        return context.parameters.useDynamicColors?.raw === true;
    }

    private getCustomPalette(context: ComponentFramework.Context<IInputs>): Record<string, string> | null {
        const raw = context.parameters.customTagPalette?.raw;
        if (!raw || raw.trim().length === 0) {
            return null;
        }

        try {
            const obj = JSON.parse(raw) as Record<string, string>;
            return obj;
        } catch (e) {
            // If JSON is invalid, ignore palette but do not break control
            console.warn("Invalid customTagPalette JSON", e);
            return null;
        }
    }

    private normalizeTagText(input: string): string | null {
        const trimmed = input.trim();
        if (!trimmed) {
            return null;
        }

        // First letter uppercase, rest lowercase
        const lower = trimmed.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }

    // ----- Tag color logic -----

    private getTagColor(tag: string): string {
        const context = this.context;
        const defaultColor = this.getDefaultColor(context);

        if (!this.useDynamicColors(context)) {
            return defaultColor;
        }

        const palette = this.getCustomPalette(context);
        const key = tag; // use normalized tag as key

        if (palette && palette[key]) {
            return palette[key];
        }

        // simple deterministic color based on hash of tag
        const colorPool = [
            "#F59F27", // orange
            "#0F6CBD", // blue
            "#107C10", // green
            "#D13438", // red
            "#8C0095", // purple
            "#008272"  // teal
        ];

        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = ((hash << 5) - hash) + key.charCodeAt(i);
            hash |= 0; // convert to 32-bit int
        }

        const index = Math.abs(hash) % colorPool.length;
        return colorPool[index];
    }

    // ----- Rendering -----

    private render(): void {
        const context = this.context;
        const isDisabled = context.mode.isControlDisabled;

        // Clear container
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        const wrapper = document.createElement("div");
        wrapper.className = "voss-tag-wrapper";

        const maxToShow = this.getMaxTagsToShow(context);
        const visibleTags = this.tags.slice(0, maxToShow);
        const hiddenCount = this.tags.length - visibleTags.length;

        // Render each visible tag chip
        visibleTags.forEach(tag => {
            const chip = document.createElement("div");
            chip.className = "voss-tag";
            chip.style.backgroundColor = this.getTagColor(tag);

            const textSpan = document.createElement("span");
            textSpan.className = "voss-tag-text";
            textSpan.innerText = tag;

            chip.appendChild(textSpan);

            if (!isDisabled) {
                const close = document.createElement("span");
                close.className = "voss-tag-close";
                close.innerText = "✕";
                close.onclick = (e) => {
                    e.stopPropagation();
                    this.removeTag(tag);
                };
                chip.appendChild(close);
            }

            wrapper.appendChild(chip);
        });

        // Show "+X" if there are more tags than we display
        if (hiddenCount > 0) {
            const moreChip = document.createElement("div");
            moreChip.className = "voss-tag-more";
            moreChip.innerText = `+${hiddenCount}`;
            wrapper.appendChild(moreChip);
        }

        // Input box (only when control is enabled & editable)
        if (!isDisabled && context.mode.isVisible) {
            const input = document.createElement("input");
            input.type = "text";
            input.className = "voss-tag-input";
            input.placeholder = "Type and press Enter to add a tag";

            input.onkeydown = (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    this.addTagFromInput(input.value);
                    input.value = "";
                }
            };

            wrapper.appendChild(input);
        }

        this.container.appendChild(wrapper);

        // Error message (for max length or duplicates)
        if (this.errorMessage && !isDisabled) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "voss-tag-error";
            errorDiv.innerText = this.errorMessage;
            this.container.appendChild(errorDiv);
        }
    }

    // ----- Tag operations -----

    private addTagFromInput(rawInput: string): void {
        this.errorMessage = null;

        const context = this.context;
        const maxLength = this.getMaxTagLength(context);

        const normalized = this.normalizeTagText(rawInput);
        if (!normalized) {
            this.render();
            return;
        }

        if (normalized.length > maxLength) {
            this.errorMessage = `Tag is too long! Maximum ${maxLength} characters.`;
            this.render();
            return;
        }

        const lower = normalized.toLowerCase();
        const alreadyExists = this.tags.some(t => t.toLowerCase() === lower);
        if (alreadyExists) {
            this.errorMessage = "Tag already exists.";
            this.render();
            return;
        }

        this.tags.push(normalized);
        this.pushChanges();
    }

    private removeTag(tag: string): void {
        const lower = tag.toLowerCase();
        this.tags = this.tags.filter(t => t.toLowerCase() !== lower);
        this.errorMessage = null;
        this.pushChanges();
    }

    private pushChanges(): void {
        // notify the framework that the bound value changed
        if (this.notifyOutputChanged) {
            this.notifyOutputChanged();
        }
        // re-render to reflect updates
        this.render();
    }
}
