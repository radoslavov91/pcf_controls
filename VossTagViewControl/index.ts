import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class VossTagViewControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    // ----- Internal state -----
    private container!: HTMLDivElement;
    private tags: string[] = [];
    private errorMessage: string | null = null;
    private showAllTags = false;

    private context!: ComponentFramework.Context<IInputs>;
    private notifyOutputChanged!: () => void;

    constructor() {
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
        this.showAllTags = false;

        this.render();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        this.tags = this.parseTags(context);

        // If user has expanded and now tags fit the limit → collapse back automatically
        if (this.showAllTags && this.tags.length <= this.getMaxTagsToShow(context)) {
            this.showAllTags = false;
        }

        this.render();
    }

    public getOutputs(): IOutputs {
        return {
            voss_tags: this.tags.join(",")
        };
    }

    public destroy(): void {
        console.log("VossTagViewControl destroyed");
    }

    // ----- Helpers -----

    private parseTags(context: ComponentFramework.Context<IInputs>): string[] {
        const raw = context.parameters.voss_tags.raw || "";
        const parts = raw
            .split(",")
            .map(t => t.trim())
            .filter(t => t.length > 0);

        const seen = new Set<string>();
        const normalized: string[] = [];

        const maxLength = this.getMaxTagLength(context);

        for (const p of parts) {
            const tag = this.normalizeTagText(p);
            if (!tag) continue;

            if (tag.length > maxLength) continue;

            const lower = tag.toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
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
            return JSON.parse(raw) as Record<string, string>;
        } catch (e) {
            console.warn("Invalid customTagPalette JSON", e);
            return null;
        }
    }

    private normalizeTagText(input: string): string | null {
        const trimmed = input.trim();
        if (!trimmed) return null;
        const lower = trimmed.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }

    private getTagColor(tag: string): string {
        const context = this.context;
        const defaultColor = this.getDefaultColor(context);

        if (!this.useDynamicColors(context)) {
            return defaultColor;
        }

        const palette = this.getCustomPalette(context);
        if (palette && palette[tag]) {
            return palette[tag];
        }

        const colorPool = [
            "#F59F27",
            "#0F6CBD",
            "#107C10",
            "#D13438",
            "#8C0095",
            "#008272"
        ];

        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            hash = ((hash << 5) - hash) + tag.charCodeAt(i);
            hash |= 0;
        }

        return colorPool[Math.abs(hash) % colorPool.length];
    }

    // ----- Rendering -----

    private render(): void {
        const context = this.context;
        const isDisabled = context.mode.isControlDisabled;

        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        const wrapper = document.createElement("div");
        wrapper.className = "voss-tag-wrapper";

        const maxToShow = this.showAllTags ? this.tags.length : this.getMaxTagsToShow(context);
        const visibleTags = this.tags.slice(0, maxToShow);
        const hiddenCount = this.tags.length - visibleTags.length;

        const tagList = document.createElement("div");
        tagList.className = "voss-tag-list";

        visibleTags.forEach(tag => {
            const chip = document.createElement("div");
            chip.className = "voss-tag";
            chip.style.backgroundColor = this.getTagColor(tag);

            const text = document.createElement("span");
            text.className = "voss-tag-text";
            text.innerText = tag;

            chip.appendChild(text);

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

            tagList.appendChild(chip);
        });

        // Expand button ("+X")
        if (hiddenCount > 0) {
            const moreChip = document.createElement("div");
            moreChip.className = "voss-tag-more";
            moreChip.innerText = `+${hiddenCount}`;
            moreChip.setAttribute("role", "button");
            moreChip.tabIndex = 0;
            moreChip.onclick = () => {
                this.showAllTags = true;
                this.render();
            };
            moreChip.onkeydown = (e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    this.showAllTags = true;
                    this.render();
                }
            };
            tagList.appendChild(moreChip);
        }

        // Collapse button ("less")
        const canCollapse = this.showAllTags && this.tags.length > this.getMaxTagsToShow(context);
        if (canCollapse) {
            const collapseChip = document.createElement("div");
            collapseChip.className = "voss-tag-toggle";
            collapseChip.innerText = "less";
            collapseChip.setAttribute("role", "button");
            collapseChip.tabIndex = 0;
            collapseChip.onclick = () => {
                this.showAllTags = false;
                this.render();
            };
            collapseChip.onkeydown = (e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    this.showAllTags = false;
                    this.render();
                }
            };
            tagList.appendChild(collapseChip);
        }

        wrapper.appendChild(tagList);

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

        if (this.errorMessage && !isDisabled) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "voss-tag-error";
            errorDiv.innerText = this.errorMessage;
            this.container.appendChild(errorDiv);
        }
    }

    // ----- Mutations -----

    private addTagFromInput(rawInput: string): void {
        this.errorMessage = null;

        const maxLength = this.getMaxTagLength(this.context);
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
        const exists = this.tags.some(t => t.toLowerCase() === lower);

        if (exists) {
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
        if (this.notifyOutputChanged) {
            this.notifyOutputChanged();
        }
        this.render();
    }
}
