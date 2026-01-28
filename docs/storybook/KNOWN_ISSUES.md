# Storybook Known Issues

## ✅ RESOLVED - Using Storybook 10

**Previous Issue:** Storybook 8.6.15 had webpack compatibility issues with Next.js 15.5.9

**Solution:** Upgraded to **Storybook 10.2.0** which is fully compatible with Next.js 15

**Status:** Storybook is now working! See `STORYBOOK_10_STATUS.md` for details.

---

## Current Minor Limitations

### Temporarily Disabled Addons

Some Storybook addons are still at v8 and incompatible with Storybook 10. These are temporarily disabled:

- ⏸️ `@storybook/addon-essentials` - Controls, actions, docs
- ⏸️ `@storybook/addon-interactions` - Interaction testing
- ⏸️ `@storybook/addon-a11y` - Accessibility checks
- ⏸️ `@storybook/addon-themes` - Automatic theme switching

### Impact

Without these addons, you won't have:
- Interactive controls panel to change props
- Auto-generated documentation tabs
- Built-in accessibility violation detection
- Automatic dark mode toolbar toggle

### Workarounds

✅ **Dark mode:** Implemented via custom `theme-decorator.tsx`

✅ **University themes:** Custom decorator with 3 theme presets

✅ **Component development:** All core functionality works - you can view and develop components

✅ **Manual controls:** Edit story args directly in code

### When Will Addons Be Available?

The Storybook ecosystem typically updates addons within a few weeks of major releases. Check for updates:

```bash
pnpm view @storybook/addon-essentials versions | grep "10\."
```

When available:
```bash
pnpm add -D @storybook/addon-essentials@latest \
  @storybook/addon-interactions@latest \
  @storybook/addon-a11y@latest \
  @storybook/addon-themes@latest
```

Then uncomment the addon imports in:
- `.storybook/main.ts` (lines with `// Temporarily disabled`)
- `.storybook/preview.tsx` (lines with `// TODO: Need v10 addon`)

## Running Storybook Now

```bash
pnpm storybook
# Opens at http://localhost:6006
```

All 4 example stories work:
- ✅ Button (11 variants)
- ✅ Card (5 examples)
- ✅ Input (8 examples)
- ✅ Switch (7 examples)

## Next Steps

1. **Start using Storybook** - Core functionality is ready
2. **Create more stories** - Follow patterns in example stories
3. **Monitor addon releases** - Check weekly for v10 updates
4. **Implement custom features** - If needed, add missing features manually

For full status, see `docs/storybook/STORYBOOK_10_STATUS.md`

## Last Updated

2026-01-26 - Resolved by upgrading to Storybook 10.2.0
