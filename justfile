@_:
	just --list

setup:
	chmod +x .githooks/*
	git config --local core.hooksPath .githooks

serve:
	deno run -A examples/serve.ts