import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import ContentCopy from "@mui/icons-material/ContentCopy";
import DataObject from "@mui/icons-material/DataObject";
import Check from "@mui/icons-material/Check";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";

const BORDER = "rgba(15, 23, 42, 0.12)";
const CODE_BG = "#f6f8fa";
const HEADER_BG = "#f0f2f5";

const LANG_LABEL: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    mjs: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TSX",
    jsx: "JSX",
    cs: "C#",
    csharp: "C#",
    bash: "Bash",
    sh: "Shell",
    shell: "Shell",
    zsh: "Zsh",
    py: "Python",
    python: "Python",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sql: "SQL",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    markdown: "Markdown",
    go: "Go",
    rust: "Rust",
    java: "Java",
    kt: "Kotlin",
    kotlin: "Kotlin",
    swift: "Swift",
    php: "PHP",
    rb: "Ruby",
    ruby: "Ruby",
    xml: "XML",
    dockerfile: "Dockerfile",
    txt: "Text",
    text: "Plain text",
    plaintext: "Plain text",
};

function toPrismLang(lang: string): string {
    const m: Record<string, string> = {
        cs: "csharp",
        csharp: "csharp",
        sh: "bash",
        shell: "bash",
        zsh: "bash",
        yml: "yaml",
        md: "markdown",
        js: "javascript",
        ts: "typescript",
        jsx: "jsx",
        tsx: "tsx",
        text: "plaintext",
        txt: "plaintext",
    };
    const k = lang.toLowerCase();
    return m[k] ?? k;
}

function labelForLang(lang: string): string {
    const k = lang.toLowerCase();
    return LANG_LABEL[k] ?? lang.charAt(0).toUpperCase() + lang.slice(1);
}

type CodeBlockProps = {
    language: string;
    code: string;
};

function CodeBlock({ language, code }: CodeBlockProps): React.JSX.Element {
    const [copied, setCopied] = React.useState(false);
    const prismLang = toPrismLang(language);
    const title = labelForLang(language);

    const handleCopy = (): void => {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box
            sx={{
                my: 1.25,
                borderRadius: "10px",
                overflow: "hidden",
                border: `1px solid ${BORDER}`,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                maxWidth: "100%",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 1.25,
                    py: 0.75,
                    bgcolor: HEADER_BG,
                    borderBottom: `1px solid ${BORDER}`,
                }}
            >
                <Typography
                    component="span"
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "rgba(15, 23, 42, 0.85)",
                        fontFamily: '"Inter", system-ui, sans-serif',
                    }}
                >
                    <DataObject sx={{ fontSize: 18, opacity: 0.75 }} />
                    {title}
                </Typography>
                <Tooltip title={copied ? "Đã sao chép" : "Sao chép"}>
                    <IconButton size="small" onClick={handleCopy} sx={{ color: "rgba(15, 23, 42, 0.65)" }} aria-label="Sao chép mã">
                        {copied ? <Check sx={{ fontSize: 18 }} color="success" /> : <ContentCopy sx={{ fontSize: 18 }} />}
                    </IconButton>
                </Tooltip>
            </Box>
            <Box sx={{ bgcolor: CODE_BG, overflowX: "auto" }}>
                <SyntaxHighlighter
                    language={prismLang}
                    style={oneLight}
                    showLineNumbers={false}
                    PreTag="div"
                    customStyle={{
                        margin: 0,
                        padding: "14px 16px",
                        fontSize: 13,
                        lineHeight: 1.55,
                        background: CODE_BG,
                        borderRadius: 0,
                    }}
                    codeTagProps={{ style: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" } }}
                >
                    {code}
                </SyntaxHighlighter>
            </Box>
        </Box>
    );
}

export type ChatMarkdownProps = {
    content: string;
    /** Tin user: nền xanh nhạt — inline code tương phản hơn */
    variant?: "assistant" | "user";
};

/**
 * Markdown + khối code (header ngôn ngữ, copy) giống ChatGPT.
 */
export default function ChatMarkdown({ content, variant = "assistant" }: ChatMarkdownProps): React.JSX.Element {
    const inlineCodeBg =
        variant === "user" ? "rgba(255,255,255,0.55)" : "rgba(15, 23, 42, 0.06)";
    const inlineCodeBorder = variant === "user" ? "rgba(15, 23, 42, 0.12)" : "rgba(15, 23, 42, 0.08)";

    return (
        <Box
            className="chat-markdown"
            sx={{
                width: "100%",
                minWidth: 0,
                fontSize: 14,
                lineHeight: 1.65,
                color: "rgba(15, 23, 42, 0.92)",
                "& p": {
                    margin: "0 0 0.85em",
                    "&:last-child": { mb: 0 },
                },
                "& ul, & ol": {
                    my: 0.5,
                    pl: 2.25,
                },
                "& li": {
                    mb: 0.35,
                },
                "& h1, & h2, & h3": {
                    fontWeight: 800,
                    mt: 1.25,
                    mb: 0.5,
                    lineHeight: 1.3,
                },
                "& h1": { fontSize: "1.25rem" },
                "& h2": { fontSize: "1.1rem" },
                "& h3": { fontSize: "1rem" },
                "& blockquote": {
                    borderLeft: "3px solid rgba(37, 99, 235, 0.35)",
                    pl: 1.5,
                    my: 1,
                    color: "rgba(15, 23, 42, 0.75)",
                },
                "& table": {
                    width: "100%",
                    borderCollapse: "collapse",
                    my: 1,
                    fontSize: 13,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 1,
                    overflow: "hidden",
                },
                "& th, & td": {
                    border: `1px solid ${BORDER}`,
                    px: 1,
                    py: 0.75,
                    textAlign: "left",
                },
                "& th": {
                    bgcolor: "rgba(15, 23, 42, 0.04)",
                    fontWeight: 700,
                },
                "& a": {
                    color: "#2563eb",
                    textDecoration: "underline",
                    wordBreak: "break-all",
                },
                "& hr": {
                    border: "none",
                    borderTop: `1px solid ${BORDER}`,
                    my: 1.5,
                },
                "& strong": { fontWeight: 700 },
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    pre({ children }) {
                        return <>{children}</>;
                    },
                    code({ className, children, ...props }) {
                        const text = String(children).replace(/\n$/, "");
                        const match = /language-(\w+)/.exec(className ?? "");
                        if (match) {
                            return <CodeBlock language={match[1]} code={text} />;
                        }
                        /** Khối ``` không ghi ngôn ngữ — vẫn hiển thị như bảng code */
                        if (text.includes("\n")) {
                            return <CodeBlock language="text" code={text} />;
                        }
                        return (
                            <Box
                                component="code"
                                sx={{
                                    bgcolor: inlineCodeBg,
                                    border: `1px solid ${inlineCodeBorder}`,
                                    px: 0.45,
                                    py: 0.1,
                                    borderRadius: 0.75,
                                    fontSize: "0.88em",
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                                }}
                                {...props}
                            >
                                {children}
                            </Box>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </Box>
    );
}
