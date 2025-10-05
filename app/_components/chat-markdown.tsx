"use client";

import {
	Children,
	cloneElement,
	isValidElement,
	useCallback,
	useMemo,
	useState,
	type ReactElement,
	type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useTheme } from "./theme-provider";
import "../_styles/catppuccin-latte.css";
import "../_styles/catppuccin-mocha.css";

type MarkdownCodeProps = React.ComponentPropsWithoutRef<"code"> & {
	inline?: boolean;
	node?: { position?: { start?: { offset?: number } } };
	children?: ReactNode;
};

type ChatMarkdownProps = {
	content: string;
	className?: string;
};

function extractText(node: ReactNode | undefined): string {
	if (node === null || node === undefined) {
		return "";
	}

	if (typeof node === "string" || typeof node === "number") {
		return String(node);
	}

	if (Array.isArray(node)) {
		return node.map((child) => extractText(child)).join("");
	}

	if (isValidElement(node)) {
		return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
	}

	return "";
}

const LANGUAGE_LABELS: Record<string, string> = {
	// Programming Languages
	bash: "Bash",
	bat: "Batch",
	c: "C",
	cpp: "C++",
	cxx: "C++",
	cc: "C++",
	"c++": "C++",
	cs: "C#",
	csharp: "C#",
	clojure: "Clojure",
	clj: "Clojure",
	coffeescript: "CoffeeScript",
	coffee: "CoffeeScript",
	d: "D",
	dart: "Dart",
	elixir: "Elixir",
	ex: "Elixir",
	elm: "Elm",
	erlang: "Erlang",
	erl: "Erlang",
	fsharp: "F#",
	fs: "F#",
	go: "Go",
	golang: "Go",
	haskell: "Haskell",
	hs: "Haskell",
	java: "Java",
	javascript: "JavaScript",
	js: "JavaScript",
	julia: "Julia",
	jl: "Julia",
	kotlin: "Kotlin",
	kt: "Kotlin",
	lisp: "Lisp",
	lua: "Lua",
	nim: "Nim",
	objc: "Objective-C",
	"objective-c": "Objective-C",
	ocaml: "OCaml",
	ml: "OCaml",
	pascal: "Pascal",
	pas: "Pascal",
	perl: "Perl",
	pl: "Perl",
	php: "PHP",
	python: "Python",
	py: "Python",
	r: "R",
	ruby: "Ruby",
	rb: "Ruby",
	rust: "Rust",
	rs: "Rust",
	scala: "Scala",
	scheme: "Scheme",
	scm: "Scheme",
	swift: "Swift",
	typescript: "TypeScript",
	ts: "TypeScript",
	vb: "Visual Basic",
	vbnet: "VB.NET",
	zig: "Zig",

	// Web Technologies
	html: "HTML",
	htm: "HTML",
	xhtml: "XHTML",
	xml: "XML",
	css: "CSS",
	less: "Less",
	sass: "Sass",
	scss: "SCSS",
	stylus: "Stylus",
	jsx: "JSX",
	tsx: "TSX",
	vue: "Vue",
	svelte: "Svelte",
	angular: "Angular",
	handlebars: "Handlebars",
	hbs: "Handlebars",
	mustache: "Mustache",
	ejs: "EJS",
	pug: "Pug",
	jade: "Jade",

	// Scripting Languages
	powershell: "PowerShell",
	ps1: "PowerShell",
	shell: "Shell",
	sh: "Shell",
	zsh: "Zsh",
	fish: "Fish",
	tcsh: "Tcsh",
	csh: "C Shell",
	ksh: "Korn Shell",
	awk: "AWK",
	sed: "sed",
	applescript: "AppleScript",
	vbscript: "VBScript",
	vbs: "VBScript",

	// Assembly Languages
	assembly: "Assembly",
	asm: "Assembly",
	nasm: "NASM",
	masm: "MASM",
	gas: "GNU Assembly",
	arm: "ARM Assembly",
	x86: "x86 Assembly",

	// Database Languages
	sql: "SQL",
	mysql: "MySQL",
	postgresql: "PostgreSQL",
	postgres: "PostgreSQL",
	sqlite: "SQLite",
	plsql: "PL/SQL",
	tsql: "T-SQL",
	nosql: "NoSQL",
	mongodb: "MongoDB",
	cql: "Cassandra Query Language",

	// Data Formats
	json: "JSON",
	yaml: "YAML",
	yml: "YAML",
	toml: "TOML",
	csv: "CSV",
	ini: "INI",
	conf: "Config",
	config: "Config",
	cfg: "Config",
	properties: "Properties",
	env: "Environment",
	dotenv: ".env",

	// Markup Languages
	markdown: "Markdown",
	md: "Markdown",
	mdx: "MDX",
	rst: "reStructuredText",
	textile: "Textile",
	asciidoc: "AsciiDoc",
	adoc: "AsciiDoc",
	latex: "LaTeX",
	tex: "TeX",
	bibtex: "BibTeX",
	bib: "BibTeX",

	// Containerization & Infrastructure
	docker: "Dockerfile",
	dockerfile: "Dockerfile",
	compose: "Docker Compose",
	"docker-compose": "Docker Compose",
	vagrant: "Vagrantfile",
	vagrantfile: "Vagrantfile",
	terraform: "Terraform",
	tf: "Terraform",
	hcl: "HCL",
	ansible: "Ansible",
	kubernetes: "Kubernetes",
	k8s: "Kubernetes",
	helm: "Helm",

	// Build Tools & Package Managers
	makefile: "Makefile",
	make: "Makefile",
	cmake: "CMake",
	gradle: "Gradle",
	maven: "Maven",
	pom: "Maven POM",
	sbt: "SBT",
	npm: "package.json",
	yarn: "Yarn",
	composer: "Composer",
	pip: "pip",
	requirements: "Requirements",
	poetry: "Poetry",
	cargo: "Cargo",
	gemfile: "Gemfile",
	podfile: "Podfile",

	// Version Control
	git: "Git",
	gitignore: ".gitignore",
	gitattributes: ".gitattributes",
	svn: "Subversion",
	mercurial: "Mercurial",
	hg: "Mercurial",

	// Graphics & Shaders
	glsl: "GLSL",
	hlsl: "HLSL",
	cg: "Cg",
	metal: "Metal",
	opencl: "OpenCL",
	cuda: "CUDA",
	vulkan: "Vulkan",
	opengl: "OpenGL",

	// Domain-Specific Languages
	matlab: "MATLAB",
	mathematica: "Mathematica",
	maple: "Maple",
	maxima: "Maxima",
	octave: "Octave",
	stata: "Stata",
	spss: "SPSS",
	sas: "SAS",
	verilog: "Verilog",
	vhdl: "VHDL",
	systemverilog: "SystemVerilog",
	prolog: "Prolog",
	fortran: "Fortran",
	f90: "Fortran 90",
	f95: "Fortran 95",
	cobol: "COBOL",
	ada: "Ada",
	adb: "Ada",

	// Game Development
	gdscript: "GDScript",
	gd: "GDScript",
	unrealscript: "UnrealScript",
	uc: "UnrealScript",
	actionscript: "ActionScript",
	as: "ActionScript",
	moonscript: "MoonScript",
	moon: "MoonScript",

	// Mobile Development
	xamarin: "Xamarin",
	reactnative: "React Native",

	// Esoteric & Educational
	brainfuck: "Brainf*ck",
	bf: "Brainf*ck",
	whitespace: "Whitespace",
	lolcode: "LOLCODE",
	scratch: "Scratch",
	logo: "Logo",
	basic: "BASIC",
	qbasic: "QBasic",

	// Text & Documentation
	text: "Text",
	txt: "Text",
	plaintext: "Plain Text",
	log: "Log",
	diff: "Diff",
	patch: "Patch",
	graphql: "GraphQL",
	gql: "GraphQL",
	protobuf: "Protocol Buffers",
	proto: "Protocol Buffers",
	thrift: "Thrift",
	avro: "Avro",

	// Misc
	regex: "Regular Expression",
	regexp: "Regular Expression",
	http: "HTTP",
	uri: "URI",
	url: "URL",
	email: "Email",
	mime: "MIME",
	base64: "Base64",
	hex: "Hexadecimal",
	binary: "Binary",
	ascii: "ASCII",
	unicode: "Unicode",
	utf8: "UTF-8",
	utf16: "UTF-16",
};

function detectLanguageFromContent(content: string): string | null {
	const trimmed = content.trim();

	// C++ indicators
	if (
		/#include\s+<(iostream|vector|algorithm|string|map|set|queue|stack|deque|list|array)>/.test(trimmed) ||
		/std::(vector|string|map|set|cout|cin|endl)/.test(trimmed) ||
		/namespace\s+std/.test(trimmed)
	) {
		return "cpp";
	}

	// Python indicators
	if (
		/^(import|from|def|class|if\s+__name__\s*==\s*['"]__main__['"])/.test(trimmed) ||
		/\bprint\s*\(/.test(trimmed)
	) {
		return "python";
	}

	// JavaScript/TypeScript indicators
	if (
		/^(const|let|var|function|class|import|export|async|await)\s/.test(trimmed) ||
		/=>\s*{/.test(trimmed)
	) {
		return "javascript";
	}

	// Java indicators
	if (
		/^(public|private|protected|class|interface|enum)\s/.test(trimmed) ||
		/System\.(out|in)\./.test(trimmed)
	) {
		return "java";
	}

	return null;
}

function formatLanguageLabel(languageId: string | null | undefined, codeContent?: string): string {
	let finalLanguageId = languageId;

	// If no language specified, try to detect from content
	if (!finalLanguageId && codeContent) {
		finalLanguageId = detectLanguageFromContent(codeContent);
	}

	if (!finalLanguageId) {
		return "Code";
	}

	const normalized = finalLanguageId.toLowerCase();
	if (LANGUAGE_LABELS[normalized]) {
		return LANGUAGE_LABELS[normalized];
	}

	const spaced = normalized.replace(/[-_]+/g, " ");
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
	const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
	const { resolvedTheme } = useTheme();
	const isDarkMode = resolvedTheme === "dark";
	const copyButtonHoverClass = isDarkMode ? "hover:bg-foreground/10" : "hover:bg-foreground/5";

	const handleCopy = useCallback(async (text: string, blockId: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedBlockId(blockId);
			window.setTimeout(() => setCopiedBlockId((prev) => (prev === blockId ? null : prev)), 2000);
		} catch (error) {
			console.error("Failed to copy code", error);
		}
	}, []);

	const components = useMemo<Components>(() => {
		const renderBlock = (
			codeElement: ReactElement<MarkdownCodeProps> | null,
			fallbackChildren: ReactNode,
			props: React.ComponentPropsWithoutRef<"pre">,
		) => {
			const codeClassName = codeElement?.props.className ?? "";
			const textContent = extractText(codeElement?.props.children ?? fallbackChildren);
			const languageMatch = /language-([\w+-]+)/.exec(codeClassName);
			const languageId = languageMatch?.[1] ?? null;
			const languageLabel = formatLanguageLabel(languageId, textContent);
			const blockId = `${languageLabel}-${codeElement?.props.node?.position?.start?.offset ?? Math.random()}`;
			const showCopy = textContent.length > 0;
			const highlightedChildren = codeElement?.props.children ?? fallbackChildren;
			const { children: _ignored, className: preClassName, style: preInlineStyle, ...restPreProps } = props;
			void _ignored;

			const highlightedCode = codeElement
				? cloneElement(codeElement, {
					children: highlightedChildren,
				})
				: (
					<code className={codeClassName}>{fallbackChildren}</code>
				);

			return (
				<div
					className="group relative mb-4 mt-4 overflow-hidden rounded-xl border"
					style={{ background: "var(--code-background)", borderColor: "var(--code-border)" }}
				>
					<div
						className="flex items-center justify-between border-b px-4 py-2.5"
						style={{ background: "var(--surface)", borderColor: "var(--code-border)" }}
					>
						<span className="text-xs font-medium text-foreground/70">{languageLabel}</span>
						<button
							type="button"
							className={`rounded-md border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60 ${copyButtonHoverClass}`}
							style={{ background: "var(--surface)", color: "var(--foreground)", borderColor: "var(--code-border)" }}
							onClick={() => showCopy && handleCopy(textContent, blockId)}
							disabled={!showCopy}
						>
							{copiedBlockId === blockId ? "Copied" : "Copy"}
						</button>
					</div>
					<pre
						{...restPreProps}
						style={{ color: "var(--foreground)", ...preInlineStyle }}
						className={`overflow-x-auto bg-transparent p-4 text-sm leading-relaxed ${preClassName ?? ""}`}
					>
						{highlightedCode}
					</pre>
				</div>
			);
		};

		return {
			code({ inline, className: codeClassName, children, ...props }: MarkdownCodeProps) {
				if (!inline) {
					return (
						<code className={codeClassName} {...props}>
							{children}
						</code>
					);
				}

				const textContent = extractText(children);
				return (
					<code
						className={`inline rounded px-1.5 py-0.5 text-sm font-mono ${codeClassName ?? ""}`}
						style={{
							background: "var(--code-background)",
							border: "1px solid var(--code-border)",
							color: isDarkMode ? "#f38ba8" : "#d20f39",
						}}
						{...props}
					>
						{textContent}
					</code>
				);
			},
			pre({ children, ...props }) {
				const childArray = Children.toArray(children);
				const codeElement = childArray.find(
					(child): child is ReactElement<MarkdownCodeProps> =>
						isValidElement(child) && typeof child.type === "string" && child.type === "code",
				);

				if (!codeElement) {
					return renderBlock(null, children, props);
				}

				return renderBlock(codeElement, codeElement.props.children, props);
			},
			a({ href, children, ...props }) {
				return (
					<a
						href={href}
						target="_blank"
						rel="noreferrer"
						className="font-semibold text-accent underline-offset-4 transition hover:text-accent/80 hover:underline"
						{...props}
					>
						{children}
					</a>
				);
			},
		};
	}, [copyButtonHoverClass, copiedBlockId, handleCopy, isDarkMode]);

	return (
		<div className={className}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
				components={components}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
