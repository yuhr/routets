@_:
	just --list

setup:
	chmod +x .githooks/*
	git config --local core.hooksPath .githooks
	corepack enable
	pnpm install

run *ARGS:
	deno run -A src/routets.ts {{ARGS}}

serve:
	deno run -A examples/serve.ts