(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/supabaseClient.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Supabase client for interacting with the Supabase API.
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-client] (ecmascript) <locals>");
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://bjpdmssagrqurlgzkxlr.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcGRtc3NhZ3JxdXJsZ3preGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDQ3NjEsImV4cCI6MjA3MTcyMDc2MX0.fMNQ89w2p1MvNibS-SavNQyHppAIhFvLTs04p4lhIwQ"));
;
const __TURBOPACK__default__export__ = supabase;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/helpers/chips-field.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChipsField
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Stack/Stack.js [app-client] (ecmascript) <export default as Stack>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Chip$2f$Chip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Chip$3e$__ = __turbopack_context__.i("[project]/node_modules/@mui/material/esm/Chip/Chip.js [app-client] (ecmascript) <export default as Chip>");
;
var _s = __turbopack_context__.k.signature();
;
;
function ChipsField(param) {
    let { label, helper, options, values, onChange, disabled } = param;
    _s();
    const id = "chips-".concat(label.replace(/\s+/g, "-").toLowerCase());
    const toggle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ChipsField.useCallback[toggle]": (val)=>{
            if (disabled) return;
            onChange({
                "ChipsField.useCallback[toggle]": (prev)=>{
                    const set = new Set(prev);
                    set.has(val) ? set.delete(val) : set.add(val);
                    return Array.from(set);
                }
            }["ChipsField.useCallback[toggle]"]);
        }
    }["ChipsField.useCallback[toggle]"], [
        disabled,
        onChange
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            marginBottom: 16,
            opacity: disabled ? 0.6 : 1
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        htmlFor: id,
                        style: {
                            display: "block",
                            fontWeight: 600,
                            marginBottom: 6
                        },
                        children: label
                    }, void 0, false, {
                        fileName: "[project]/helpers/chips-field.tsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, this),
                    values.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>onChange([]),
                        style: {
                            fontSize: 12,
                            color: "#555",
                            textDecoration: "underline",
                            background: "none"
                        },
                        "aria-label": "Clear ".concat(label, " selections"),
                        children: "Clear"
                    }, void 0, false, {
                        fileName: "[project]/helpers/chips-field.tsx",
                        lineNumber: 41,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/helpers/chips-field.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            helper && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    color: "#666",
                    marginBottom: 8
                },
                children: helper
            }, void 0, false, {
                fileName: "[project]/helpers/chips-field.tsx",
                lineNumber: 51,
                columnNumber: 18
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Stack$2f$Stack$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Stack$3e$__["Stack"], {
                id: id,
                role: "listbox",
                "aria-multiselectable": "true",
                direction: "row",
                spacing: 1,
                useFlexGap: true,
                flexWrap: "wrap",
                children: [
                    options.map((opt)=>{
                        const selected = values.includes(opt.id);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$mui$2f$material$2f$esm$2f$Chip$2f$Chip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Chip$3e$__["Chip"], {
                            label: opt.name,
                            onClick: ()=>toggle(opt.id),
                            clickable: true,
                            color: selected ? "primary" : "default",
                            variant: selected ? "filled" : "outlined",
                            sx: {
                                mb: 1
                            },
                            role: "option",
                            "aria-selected": selected
                        }, opt.id, false, {
                            fileName: "[project]/helpers/chips-field.tsx",
                            lineNumber: 65,
                            columnNumber: 13
                        }, this);
                    }),
                    options.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            color: "#777"
                        },
                        children: "No options available."
                    }, void 0, false, {
                        fileName: "[project]/helpers/chips-field.tsx",
                        lineNumber: 78,
                        columnNumber: 34
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/helpers/chips-field.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/helpers/chips-field.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_s(ChipsField, "umzuRS/+IaC9qXdsuWYWZjMMAoM=");
_c = ChipsField;
var _c;
__turbopack_context__.k.register(_c, "ChipsField");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/helpers/single-select.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SingleSelect
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function SingleSelect(param) {
    let { label, helper, options, value, onChange, placeholder } = param;
    const id = "sel-".concat(label.replace(/\s+/g, "-").toLowerCase());
    const helperId = helper ? "".concat(id, "-help") : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            marginBottom: 16
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                htmlFor: id,
                style: {
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 6
                },
                children: label
            }, void 0, false, {
                fileName: "[project]/helpers/single-select.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            helper && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: helperId,
                style: {
                    color: "#666",
                    marginBottom: 8
                },
                children: helper
            }, void 0, false, {
                fileName: "[project]/helpers/single-select.tsx",
                lineNumber: 27,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                id: id,
                "aria-describedby": helperId,
                value: value == null ? "" : String(value),
                onChange: onChange,
                style: {
                    width: "100%",
                    height: 44,
                    borderRadius: 8,
                    border: "1px solid #e5e5e5",
                    padding: "0 8px",
                    background: "white"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "",
                        disabled: true,
                        children: placeholder !== null && placeholder !== void 0 ? placeholder : "Select…"
                    }, void 0, false, {
                        fileName: "[project]/helpers/single-select.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this),
                    options.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            value: String(opt.id),
                            children: opt.name
                        }, opt.id, false, {
                            fileName: "[project]/helpers/single-select.tsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/helpers/single-select.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/helpers/single-select.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = SingleSelect;
var _c;
__turbopack_context__.k.register(_c, "SingleSelect");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/create-account/CreateAccountForm.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CreateAccountForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$chips$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/helpers/chips-field.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$single$2d$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/helpers/single-select.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function CreateAccountForm(param) {
    let { userId, nextHref, preload, initial } = param;
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Lookups (static from server)
    const [universities] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(preload.universities);
    const [majorsOpts, setMajorsOpts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [minorsOpts, setMinorsOpts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [interestsOpts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(preload.interests);
    const [careerOpts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(preload.careers);
    const [classPrefOpts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(preload.classPrefs);
    // Selected values
    const [universityId, setUniversityId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [majors, setMajors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [minors, setMinors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [interests, setInterests] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [careerSelections, setCareerSelections] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [classPreferences, setClassPreferences] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Helper: keep only values that exist in options
    const clampToOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "CreateAccountForm.useCallback[clampToOptions]": (values, options)=>{
            const valid = new Set(options.map({
                "CreateAccountForm.useCallback[clampToOptions]": (o)=>o.id
            }["CreateAccountForm.useCallback[clampToOptions]"]));
            return values.filter({
                "CreateAccountForm.useCallback[clampToOptions]": (v)=>valid.has(v)
            }["CreateAccountForm.useCallback[clampToOptions]"]);
        }
    }["CreateAccountForm.useCallback[clampToOptions]"], []);
    // Prefill from server-provided initial (once)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CreateAccountForm.useEffect": ()=>{
            if (!initial) return;
            var _initial_university_id;
            setUniversityId((_initial_university_id = initial.university_id) !== null && _initial_university_id !== void 0 ? _initial_university_id : null);
            var _initial_selected_majors;
            setMajors((_initial_selected_majors = initial.selected_majors) !== null && _initial_selected_majors !== void 0 ? _initial_selected_majors : []);
            var _initial_selected_minors;
            setMinors((_initial_selected_minors = initial.selected_minors) !== null && _initial_selected_minors !== void 0 ? _initial_selected_minors : []);
            var _initial_selected_interests;
            setInterests((_initial_selected_interests = initial.selected_interests) !== null && _initial_selected_interests !== void 0 ? _initial_selected_interests : []);
            var _initial_career_options;
            setCareerSelections((_initial_career_options = initial.career_options) !== null && _initial_career_options !== void 0 ? _initial_career_options : []);
            var _initial_class_preferences;
            setClassPreferences((_initial_class_preferences = initial.class_preferences) !== null && _initial_class_preferences !== void 0 ? _initial_class_preferences : []);
        }
    }["CreateAccountForm.useEffect"], [
        initial
    ]);
    // Filter majors/minors by selected university (and clamp existing selections instead of clearing)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CreateAccountForm.useEffect": ()=>{
            if (universityId == null) {
                setMajorsOpts([]);
                setMinorsOpts([]);
                setMajors({
                    "CreateAccountForm.useEffect": ()=>[]
                }["CreateAccountForm.useEffect"]);
                setMinors({
                    "CreateAccountForm.useEffect": ()=>[]
                }["CreateAccountForm.useEffect"]);
                return;
            }
            const nextMajorsOpts = preload.majorsAll.filter({
                "CreateAccountForm.useEffect.nextMajorsOpts": (m)=>m.university_id === universityId
            }["CreateAccountForm.useEffect.nextMajorsOpts"]);
            const nextMinorsOpts = preload.minorsAll.filter({
                "CreateAccountForm.useEffect.nextMinorsOpts": (m)=>m.university_id === universityId
            }["CreateAccountForm.useEffect.nextMinorsOpts"]);
            setMajorsOpts(nextMajorsOpts);
            setMinorsOpts(nextMinorsOpts);
            // Keep selections that still exist under this university
            setMajors({
                "CreateAccountForm.useEffect": (prev)=>clampToOptions(prev, nextMajorsOpts)
            }["CreateAccountForm.useEffect"]);
            setMinors({
                "CreateAccountForm.useEffect": (prev)=>clampToOptions(prev, nextMinorsOpts)
            }["CreateAccountForm.useEffect"]);
        }
    }["CreateAccountForm.useEffect"], [
        universityId,
        preload.majorsAll,
        preload.minorsAll,
        clampToOptions
    ]);
    const canSubmit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CreateAccountForm.useMemo[canSubmit]": ()=>universityId != null
    }["CreateAccountForm.useMemo[canSubmit]"], [
        universityId
    ]);
    async function onSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            if (universityId == null) throw new Error("Please select your university.");
            const uniq = (xs)=>Array.from(new Set(xs.filter((n)=>Number.isFinite(n))));
            // 1) Ensure profile exists (correct table + snake_case column)
            const { error: profileError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("profiles").upsert({
                id: userId,
                university_id: universityId
            }, {
                onConflict: "id"
            }).select("university_id").single();
            if (profileError) {
                console.error("[CreateAccount] Profile upsert error:", profileError);
                setError(profileError.message || "Could not save your profile.");
                setSaving(false);
                return;
            }
            // 2) Upsert student preferences referencing that profile
            const studentRow = {
                profile_id: userId,
                selected_majors: uniq(majors),
                selected_minors: uniq(minors),
                selected_interests: uniq(interests),
                career_options: uniq(careerSelections),
                class_preferences: uniq(classPreferences)
            };
            console.log("[CreateAccount] Upserting student row →", studentRow);
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("student").upsert(studentRow, {
                onConflict: "profile_id"
            }).select("profile_id, selected_majors, selected_minors, selected_interests, career_options, class_preferences").single();
            if (error) {
                console.error("[CreateAccount] Student upsert error:", error);
                setError(error.message || "Could not save your preferences.");
                setSaving(false);
                return;
            }
            console.log("[CreateAccount] Upsert OK:", data);
            router.push(nextHref);
        } catch (err) {
            console.error("[CreateAccount] Submit exception:", err);
            setError(err instanceof Error ? err.message : String(err));
            setSaving(false);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        onSubmit: onSubmit,
        children: [
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "alert",
                style: {
                    background: "#fee",
                    border: "1px solid #fca5a5",
                    color: "#b91c1c",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 12
                },
                children: error
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 158,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$single$2d$select$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                label: "University",
                helper: "Select your current university.",
                options: universities,
                value: universityId,
                onChange: (e)=>setUniversityId(e.target.value ? Number(e.target.value) : null),
                placeholder: "Choose a university"
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 173,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$chips$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Major(s)",
                helper: universityId == null ? "Choose a university first to see available majors." : "Choose one or more majors you’re pursuing or considering.",
                options: majorsOpts,
                values: majors,
                onChange: setMajors,
                disabled: universityId == null || majorsOpts.length === 0
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 182,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$chips$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Minor(s)",
                helper: "Optional – pick any minors you’re considering.",
                options: minorsOpts,
                values: minors,
                onChange: setMinors,
                disabled: minorsOpts.length === 0
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 195,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$chips$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Interests",
                helper: "What subjects or areas excite you?",
                options: interestsOpts,
                values: interests,
                onChange: setInterests
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 204,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$chips$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Potential career paths",
                helper: "Where do you see yourself heading?",
                options: careerOpts,
                values: careerSelections,
                onChange: setCareerSelections
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 212,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$helpers$2f$chips$2d$field$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Class preferences",
                helper: "e.g., mornings, small seminars, online, project-based.",
                options: classPrefOpts,
                values: classPreferences,
                onChange: setClassPreferences
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 220,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    gap: 12,
                    marginTop: 16
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "submit",
                    disabled: !canSubmit || saving,
                    "aria-disabled": !canSubmit || saving,
                    style: {
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: canSubmit && !saving ? "black" : "#999",
                        color: "white",
                        fontWeight: 600
                    },
                    children: saving ? "Saving…" : "Continue"
                }, void 0, false, {
                    fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                    lineNumber: 229,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/create-account/CreateAccountForm.tsx",
                lineNumber: 228,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/create-account/CreateAccountForm.tsx",
        lineNumber: 156,
        columnNumber: 5
    }, this);
}
_s(CreateAccountForm, "yF848FdaINqQRR6DQdFgAWtM7EA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = CreateAccountForm;
var _c;
__turbopack_context__.k.register(_c, "CreateAccountForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/create-account/CreateAccountClient.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CreateAccountClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$create$2d$account$2f$CreateAccountForm$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/create-account/CreateAccountForm.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function CreateAccountClient(param) {
    let { preload, nextHref, initial } = param;
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [userId, setUserId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CreateAccountClient.useEffect": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession().then({
                "CreateAccountClient.useEffect": (param)=>{
                    let { data } = param;
                    var _data_session;
                    var _data_session_user_id;
                    const id = (_data_session_user_id = (_data_session = data.session) === null || _data_session === void 0 ? void 0 : _data_session.user.id) !== null && _data_session_user_id !== void 0 ? _data_session_user_id : null;
                    if (!id) {
                        router.replace("/login");
                        return;
                    }
                    setUserId(id);
                    setLoading(false);
                }
            }["CreateAccountClient.useEffect"]);
        }
    }["CreateAccountClient.useEffect"], [
        router
    ]);
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        style: {
            padding: 24
        },
        children: "Loading…"
    }, void 0, false, {
        fileName: "[project]/components/create-account/CreateAccountClient.tsx",
        lineNumber: 50,
        columnNumber: 23
    }, this);
    if (!userId) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$create$2d$account$2f$CreateAccountForm$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        userId: userId,
        nextHref: nextHref,
        preload: preload,
        initial: initial
    }, void 0, false, {
        fileName: "[project]/components/create-account/CreateAccountClient.tsx",
        lineNumber: 54,
        columnNumber: 5
    }, this);
}
_s(CreateAccountClient, "2LDTPRN+NiVMM0so5shl1yS8occ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = CreateAccountClient;
var _c;
__turbopack_context__.k.register(_c, "CreateAccountClient");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_1c3fe7fb._.js.map