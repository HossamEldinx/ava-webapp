# Internationalization (i18n) Structure

This directory contains the internationalization files for the React application, supporting English and German languages.

## Structure

```
locales/
├── en/                     # English translations
│   ├── index.js           # Main export file
│   ├── navigation.json    # Navigation menu items
│   ├── homepage.json      # Homepage content
│   ├── categories.json    # Categories page content
│   ├── common.json        # Common UI elements (buttons, messages, modals)
│   └── boq.json          # Bill of Quantities page content
├── de/                     # German translations
│   ├── index.js           # Main export file
│   ├── navigation.json    # Navigation menu items
│   ├── homepage.json      # Homepage content
│   ├── categories.json    # Categories page content
│   ├── common.json        # Common UI elements (buttons, messages, modals)
│   └── boq.json          # Bill of Quantities page content
├── en.json                # Legacy single file (can be removed)
├── de.json                # Legacy single file (can be removed)
└── README.md              # This documentation
```

## Usage

### In Components

```javascript
import { useLocalization } from "../contexts/LocalizationContext";

function MyComponent() {
    const { t } = useLocalization();

    return (
        <div>
            <h1>{t("homepage.title")}</h1>
            <p>{t("homepage.subtitle")}</p>
            <button>{t("common.buttons.save")}</button>
        </div>
    );
}
```

### Translation Keys

Translation keys follow a hierarchical structure:

-   `navigation.*` - Navigation menu items
-   `homepage.*` - Homepage content
-   `categories.*` - Categories page content
-   `common.*` - Shared UI elements
-   `boq.*` - Bill of Quantities content

## Adding New Translations

### 1. Add to Module Files

Add new keys to the appropriate JSON files in both `en/` and `de/` directories.

### 2. Example: Adding a new page

1. Create `frontend/src/locales/en/newpage.json`
2. Create `frontend/src/locales/de/newpage.json`
3. Update both `en/index.js` and `de/index.js` to import the new module
4. Use in components with `t('newpage.yourKey')`

### 3. Adding New Languages

1. Create a new directory (e.g., `fr/` for French)
2. Copy the structure from `en/` directory
3. Translate all JSON files
4. Create `fr/index.js` with the same structure
5. Update `LocalizationContext.js` to include the new language

## Language Switcher

The language switcher is located in the navigation header and allows users to switch between:

-   🇺🇸 English
-   🇩🇪 German (Deutsch)

Language preference is automatically saved to localStorage and persists across browser sessions.

## Benefits of Modular Structure

1. **Organization**: Related translations are grouped together
2. **Maintainability**: Easier to find and update specific translations
3. **Scalability**: Easy to add new modules for new features
4. **Team Collaboration**: Different team members can work on different modules
5. **Performance**: Only load translations for specific modules if needed (future optimization)

## Migration Notes

The old single-file structure (`en.json`, `de.json`) has been replaced with the modular structure. The old files can be safely removed after confirming the new structure works correctly.
