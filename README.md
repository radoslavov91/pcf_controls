# VossTagViewControl – PCF Tag Component  
**Version:** 1.0.0  
**Author:** VOSS Automotive IT – Dynamics 365 Team  
**Owner:** Kiril Radoslavov (Product Owner)

---

## 📌 Overview  
`VossTagViewControl` is a custom Power Apps Component Framework (PCF) control that replaces a standard Single-Line Text field with an interactive “tag chip” experience.  
It converts comma-separated text into a user-friendly, editable tag interface used across Dynamics 365.
<img width="461" height="95" alt="Screenshot 2025-12-05 161145" src="https://github.com/user-attachments/assets/72cf9eea-28b3-4e26-b71a-09d721f3a2a5" />
<img width="481" height="146" alt="Screenshot 2025-12-05 161154" src="https://github.com/user-attachments/assets/ff1845cb-3bcd-45f5-a7f9-d2bd5f27c69a" />
The control is optimized for:
- Clean data entry  
- Fast tagging  
- Better readability  
- Modern UI/UX  
- Scalability across business processes  

---

## 🚀 Features

### ✔ Tag Rendering  
- Tag “chips” with colors  
- Multi-line wrapping  
- Expand/Collapse with **+X** and **less** behavior  
- Automatic parsing & normalization

### ✔ Tag Editing  
- Inline input field for adding tags  
- Press **Enter** to add  
- Click **X** to remove  
- Live validation errors:
  - Duplicate tag  
  - Max length exceeded  

### ✔ Configuration Options  
Defined in `ControlManifest.Input.xml`:

| Property | Description |
|---------|-------------|
| `voss_tags` | Bound comma-separated field value |
| `defaultTagColor` | Base tag color when dynamic mode is off |
| `useDynamicColors` | Enables deterministic color-per-tag |
| `customTagPalette` | JSON mapping: `{ "Vip": "#FF0000" }` |
| `maxTagsToShow` | Number of visible tags before collapsing |
| `maxTagLength` | Max allowed characters per tag |
<img width="508" height="815" alt="Screenshot 2025-12-05 161136" src="https://github.com/user-attachments/assets/cfa764de-dcdd-48de-a9f2-0e67b61fa544" />

---

## 🎨 Styling  
The styling is defined in `css/VossTagViewControl.css`.  
Key classes include:

- `.voss-tag-wrapper`  
- `.voss-tag-list`  
- `.voss-tag`  
- `.voss-tag-close`  
- `.voss-tag-more`  
- `.voss-tag-toggle`  
- `.voss-tag-input`  
- `.voss-tag-error`

---

## 🧠 Technical Architecture

### Lifecycle Methods  
- `init()` – Load context, parse tags, render  
- `updateView()` – Refresh when data/form factor changes  
- `getOutputs()` – Returns updated comma-separated string  
- `destroy()` – Cleanup  

### Storage Format  
Tags are stored as a **comma-separated string** in the bound Dataverse field.

Example:
```
Test,Vip,New,Another
```

### Tag Normalization  
- Trim whitespace  
- First letter uppercase (`vip` → `Vip`)  
- Enforced max length  
- Duplicate prevention  
<img width="475" height="166" alt="Screenshot 2025-12-05 161209" src="https://github.com/user-attachments/assets/65bb68bd-f182-4a84-86a9-147898f0cc36" />

---

## 📦 Deployment Instructions

### 1. Build PCF  
```bash
npm install
npm run build
```

### 2. Test locally  
```bash
npm start
```

### 3. Add to solution  
```bash
pac solution add-reference --path .
```

### 4. Pack solution  
```bash
pac solution pack --zipFilePath VossTagViewControl_1_0_0.zip
```

### 5. Import into Dynamics  
Power Apps → Solutions → Import → Select ZIP → Publish

### 6. Add control to a form  
- Open form designer  
- Select field  
- Components → Add → `VossTagViewControl`  
- Configure properties  

---

## 🗺 Versioning Strategy  
Semantic versioning:

- **PATCH** – Bug fixes (1.0.x)  
- **MINOR** – New features (1.x.0)  
- **MAJOR** – Breaking changes (x.0.0)  

Document changes in `CHANGELOG.md`.

---

## 🧩 Known Limitations  
- Tags cannot contain commas  
- Underlying field must be `Single-Line Text`  
- Manual redeployment required for updates  

---

## 👥 Maintainers  
- **Kiril Radoslavov** – Dynamics 365 Product Owner  
- **VOSS Automotive IT CRM Development Team**

For issues, create a ticket in the internal IT DevOps system under category **CRM → Custom Controls**.

---

## 📚 Additional Documentation  
- Architecture diagrams  
- Screenshots  
- CSS style reference  

---
